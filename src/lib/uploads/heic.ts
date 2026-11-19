// HEIC decoding (libheif-js, WASM) isolated in a worker thread (SECURITY-REPORT M-2):
// - one decode at a time (the caller holds BILD_SLOT from uploads/bild.ts until the JPEG is encoded),
// - a fresh worker per image with resourceLimits and a hard timeout; the worker is terminated and the
//   termination awaited before the result is handed out, so its WASM heap (which never shrinks) is gone
//   before the next step allocates (M-2 rest),
// - the pixel limit is checked inside the worker before anything is decoded,
// - decoded as interleaved RGB (RGBA only for images with alpha): 25 % less than RGBA in WASM, in the
//   copy and in sharp; the WASM image is released before the copy is posted,
// - console output of the libheif wrapper is silenced (N-3: no library error objects in the log),
// - the event loop of the server stays free while libheif runs.
// The worker code is a fixed string (eval worker) so it survives bundling into dist/server without a
// separate asset; it never contains request data. Image bytes travel as a transferred ArrayBuffer.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';

/** Lower than MAX_PIXEL for sharp: 24-MP iPhone photos (5712 x 4284) fit, 48-MP HEIF Max does not. */
export const MAX_PIXEL_HEIC = 25_000_000;
/**
 * HEIC with alpha channel (graphics, not camera photos): RGBA plus alpha plane, at 10 bit up to ~630 MB
 * peak for 5 x 24 MP. 16 MP keeps it below 500 MB (measurement: docs/agent-reports/2-backend-api-fixes.md).
 */
export const MAX_PIXEL_HEIC_ALPHA = 16_000_000;
export const HEIC_TIMEOUT_MS = 20_000;

export type HeicFehler = 'defekt' | 'zu-gross';
export class HeicAbgelehnt extends Error {
  readonly grund: HeicFehler;
  constructor(grund: HeicFehler) {
    super(`HEIC abgelehnt: ${grund}`);
    this.grund = grund;
  }
}

export interface RohBild {
  pixel: Buffer<ArrayBuffer>;
  breite: number;
  hoehe: number;
  kanaele: 3 | 4;
}

const WORKER_CODE = `
const still = () => {};
console.log = console.info = console.warn = console.error = console.debug = console.trace = still;
const { parentPort, workerData } = require('node:worker_threads');
parentPort.once('message', async ({ daten, maxPixel: maxOhneAlpha, maxPixelAlpha }) => {
  const antwort = (m, transfer) => parentPort.postMessage(m, transfer);
  let lib;
  let bilder = [];
  try {
    const factory = require(workerData.modul);
    // Compiled once in the main thread and shared: no per-worker compilation (time and malloc churn).
    const instantiateWasm = (imports, fertig) => fertig(new WebAssembly.Instance(workerData.wasm, imports));
    lib = factory({ instantiateWasm, print: still, printErr: still });
    bilder = new lib.HeifDecoder().decode(new Uint8Array(daten));
  } catch {
    return antwort({ ok: false, grund: 'defekt' });
  }
  daten = null;
  const [bild, ...rest] = bilder;
  for (const r of rest) r.free && r.free();
  if (!bild) return antwort({ ok: false, grund: 'defekt' });
  let bildPtr = null;
  try {
    const b0 = bild.get_width();
    const h0 = bild.get_height();
    if (!(b0 > 0 && h0 > 0)) return antwort({ ok: false, grund: 'defekt' });
    const kanaele = bild.has_alpha_channel() ? 4 : 3;
    const maxPixel = kanaele === 4 ? Math.min(maxOhneAlpha, maxPixelAlpha) : maxOhneAlpha;
    if (b0 * h0 > maxPixel) return antwort({ ok: false, grund: 'zu-gross' });
    const chroma = kanaele === 4 ? lib.heif_chroma.heif_chroma_interleaved_RGBA : lib.heif_chroma.heif_chroma_interleaved_RGB;
    const img = await lib.heif_js_decode_image2(bild.handle, lib.heif_colorspace.heif_colorspace_RGB, chroma);
    if (!img || img.code || !img.channels) return antwort({ ok: false, grund: 'defekt' });
    bildPtr = img.image;
    const kanal = img.channels.find((c) => c.id === lib.heif_channel.heif_channel_interleaved);
    if (!kanal) return antwort({ ok: false, grund: 'defekt' });
    const breite = kanal.width;
    const hoehe = kanal.height;
    const zeile = breite * kanaele;
    if (!(breite > 0 && hoehe > 0) || breite * hoehe > maxPixel) return antwort({ ok: false, grund: 'zu-gross' });
    if (kanal.stride < zeile || kanal.data.length < kanal.stride * (hoehe - 1) + zeile) return antwort({ ok: false, grund: 'defekt' });
    // Copy out of the WASM memory (kanal.data is a view into it) into a transferable buffer.
    const pixel = new Uint8Array(zeile * hoehe);
    if (kanal.stride === zeile) pixel.set(kanal.data.subarray(0, zeile * hoehe));
    else for (let y = 0; y < hoehe; y++) pixel.set(kanal.data.subarray(y * kanal.stride, y * kanal.stride + zeile), y * zeile);
    lib.heif_image_release(bildPtr);
    bildPtr = null;
    antwort({ ok: true, breite, hoehe, kanaele, pixel: pixel.buffer }, [pixel.buffer]);
  } catch {
    antwort({ ok: false, grund: 'defekt' });
  } finally {
    try {
      if (bildPtr) lib.heif_image_release(bildPtr);
      if (bild.free) bild.free();
    } catch {}
  }
});
`;

let libheifDateien: Promise<{ modul: string; wasm: WebAssembly.Module }> | undefined;
function dateien() {
  libheifDateien ??= (async () => {
    const require = createRequire(import.meta.url);
    return {
      modul: require.resolve('libheif-js/libheif-wasm/libheif.js'),
      wasm: await WebAssembly.compile(readFileSync(require.resolve('libheif-js/libheif-wasm/libheif.wasm'))),
    };
  })();
  libheifDateien.catch(() => (libheifDateien = undefined));
  return libheifDateien;
}

type WorkerAntwort = { ok: true; breite: number; hoehe: number; kanaele: 3 | 4; pixel: ArrayBuffer } | { ok: false; grund: HeicFehler };

/**
 * Decodes in a fresh worker and always terminates it; settles only after the worker has exited.
 * No slot here: callers serialise via BILD_SLOT (uploads/bild.ts).
 */
export async function dekodiereImWorker(daten: Uint8Array, opts: { maxPixel?: number; timeoutMs?: number } = {}): Promise<RohBild> {
  let modul: string;
  let wasm: WebAssembly.Module;
  try {
    ({ modul, wasm } = await dateien());
  } catch {
    throw new HeicAbgelehnt('defekt');
  }
  // Own, non-pooled ArrayBuffer (Buffer.slice would be a view into the shared pool), transferred to the worker.
  const kopie = new Uint8Array(daten.byteLength);
  kopie.set(daten);
  return new Promise<RohBild>((resolve, reject) => {
    const worker = new Worker(WORKER_CODE, {
      eval: true,
      workerData: { modul, wasm },
      // V8 heap of the worker; the WASM memory and the pixel copy are bounded by the pixel limit.
      resourceLimits: { maxOldGenerationSizeMb: 96, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 },
      // Piped to us and dropped (N-3), never inherited by the server log.
      stdout: true,
      stderr: true,
    });
    worker.stdout.resume();
    worker.stderr.resume();
    let erledigt = false;
    const ende = (fehler: HeicFehler | null, bild?: RohBild) => {
      if (erledigt) return;
      erledigt = true;
      clearTimeout(timer);
      // Settle only once the worker (and its WASM memory) is gone (M-2 rest).
      void worker
        .terminate()
        .catch(() => {})
        .then(() => (fehler ? reject(new HeicAbgelehnt(fehler)) : resolve(bild!)));
    };
    const timer = setTimeout(() => ende('defekt'), opts.timeoutMs ?? HEIC_TIMEOUT_MS);
    worker.once('message', (m: WorkerAntwort) => {
      if (!m.ok) return ende(m.grund);
      ende(null, { pixel: Buffer.from(m.pixel), breite: m.breite, hoehe: m.hoehe, kanaele: m.kanaele });
    });
    // Out of memory (ERR_WORKER_OUT_OF_MEMORY), crash or early exit: treat as unreadable file.
    worker.once('error', () => ende('defekt'));
    worker.once('exit', () => ende('defekt'));
    try {
      worker.postMessage({ daten: kopie.buffer, maxPixel: opts.maxPixel ?? MAX_PIXEL_HEIC, maxPixelAlpha: MAX_PIXEL_HEIC_ALPHA }, [kopie.buffer]);
    } catch {
      ende('defekt');
    }
  });
}
