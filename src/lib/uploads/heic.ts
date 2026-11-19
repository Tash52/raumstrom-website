// HEIC decoding (libheif-js, WASM) isolated in a worker thread (SECURITY-REPORT M-2):
// - at most one decode at a time (short queue, then "ausgelastet" -> 503),
// - a fresh worker per image with resourceLimits and a hard timeout; the worker is terminated
//   afterwards, so the WASM heap (which never shrinks) is released every time,
// - the pixel limit is checked inside the worker before the RGBA buffer is allocated,
// - the event loop of the server stays free while libheif runs.
// The worker code is a fixed string (eval worker) so it survives bundling into dist/server without a
// separate asset; it never contains request data. Image bytes travel as a transferred ArrayBuffer.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';
import { Parallelitaet } from '../security/speicher.ts';

/** Lower than MAX_PIXEL for sharp: 24-MP iPhone photos (5712 x 4284) fit, 48-MP HEIF Max does not. */
export const MAX_PIXEL_HEIC = 25_000_000;
export const HEIC_TIMEOUT_MS = 20_000;
export const HEIC_WARTEZEIT_MS = 30_000;
/** One decode at a time; a few requests may wait for it. */
export const HEIC_SLOT = new Parallelitaet(1, 4);

export type HeicFehler = 'defekt' | 'zu-gross' | 'ausgelastet';
export class HeicAbgelehnt extends Error {
  readonly grund: HeicFehler;
  constructor(grund: HeicFehler) {
    super(`HEIC abgelehnt: ${grund}`);
    this.grund = grund;
  }
}

export interface RohBild {
  pixel: Buffer;
  breite: number;
  hoehe: number;
}

const WORKER_CODE = `
const { parentPort, workerData } = require('node:worker_threads');
parentPort.once('message', async ({ daten, maxPixel }) => {
  const antwort = (m, transfer) => parentPort.postMessage(m, transfer);
  let bilder = [];
  try {
    const factory = require(workerData.modul);
    const libheif = factory({ wasmBinary: workerData.wasm, print: () => {}, printErr: () => {} });
    bilder = new libheif.HeifDecoder().decode(new Uint8Array(daten));
  } catch {
    return antwort({ ok: false, grund: 'defekt' });
  }
  const [bild, ...rest] = bilder;
  for (const r of rest) r.free && r.free();
  if (!bild) return antwort({ ok: false, grund: 'defekt' });
  try {
    const breite = bild.get_width();
    const hoehe = bild.get_height();
    if (!(breite > 0 && hoehe > 0)) return antwort({ ok: false, grund: 'defekt' });
    if (breite * hoehe > maxPixel) return antwort({ ok: false, grund: 'zu-gross' });
    const ziel = { data: new Uint8ClampedArray(breite * hoehe * 4), width: breite, height: hoehe };
    const fertig = await new Promise((resolve) => bild.display(ziel, resolve));
    if (!fertig) return antwort({ ok: false, grund: 'defekt' });
    const puffer = fertig.data.buffer;
    antwort({ ok: true, breite, hoehe, pixel: puffer, offset: fertig.data.byteOffset, laenge: fertig.data.byteLength }, [puffer]);
  } catch {
    antwort({ ok: false, grund: 'defekt' });
  } finally {
    bild.free && bild.free();
  }
});
`;

let libheifDateien: { modul: string; wasm: Uint8Array } | undefined;
function dateien() {
  if (libheifDateien) return libheifDateien;
  const require = createRequire(import.meta.url);
  libheifDateien = {
    modul: require.resolve('libheif-js/libheif-wasm/libheif.js'),
    wasm: new Uint8Array(readFileSync(require.resolve('libheif-js/libheif-wasm/libheif.wasm'))),
  };
  return libheifDateien;
}

type WorkerAntwort =
  | { ok: true; breite: number; hoehe: number; pixel: ArrayBuffer; offset: number; laenge: number }
  | { ok: false; grund: 'defekt' | 'zu-gross' };

/** Decodes in a fresh worker; always terminates it. Without waiting for the slot (see dekodiereHeic). */
export function dekodiereImWorker(daten: Uint8Array, opts: { maxPixel?: number; timeoutMs?: number } = {}): Promise<RohBild> {
  const { modul, wasm } = dateien();
  // Own, non-pooled ArrayBuffer (Buffer.slice would be a view into the shared pool), transferred to the worker.
  const kopie = new Uint8Array(daten.byteLength);
  kopie.set(daten);
  return new Promise<RohBild>((resolve, reject) => {
    const worker = new Worker(WORKER_CODE, {
      eval: true,
      workerData: { modul, wasm },
      // V8 heap of the worker; the WASM memory and the RGBA buffer are bounded by the pixel limit.
      resourceLimits: { maxOldGenerationSizeMb: 96, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 },
    });
    let erledigt = false;
    const ende = (fehler: HeicFehler | null, bild?: RohBild) => {
      if (erledigt) return;
      erledigt = true;
      clearTimeout(timer);
      void worker.terminate();
      if (fehler) reject(new HeicAbgelehnt(fehler));
      else resolve(bild!);
    };
    const timer = setTimeout(() => ende('defekt'), opts.timeoutMs ?? HEIC_TIMEOUT_MS);
    worker.once('message', (m: WorkerAntwort) => {
      if (!m.ok) return ende(m.grund);
      ende(null, { pixel: Buffer.from(m.pixel, m.offset, m.laenge), breite: m.breite, hoehe: m.hoehe });
    });
    // Out of memory (ERR_WORKER_OUT_OF_MEMORY), crash or early exit: treat as unreadable file.
    worker.once('error', () => ende('defekt'));
    worker.once('exit', () => ende('defekt'));
    try {
      worker.postMessage({ daten: kopie.buffer, maxPixel: opts.maxPixel ?? MAX_PIXEL_HEIC }, [kopie.buffer]);
    } catch {
      ende('defekt');
    }
  });
}

/** Waits for the single HEIC slot, then decodes. Throws HeicAbgelehnt('ausgelastet') if busy too long. */
export async function dekodiereHeic(daten: Uint8Array): Promise<RohBild> {
  const frei = await HEIC_SLOT.warte(HEIC_WARTEZEIT_MS);
  if (!frei) throw new HeicAbgelehnt('ausgelastet');
  try {
    return await dekodiereImWorker(daten);
  } finally {
    frei();
  }
}
