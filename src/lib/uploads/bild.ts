// Re-encodes uploaded photos: decode (sharp, HEIC via libheif-js), apply EXIF orientation, scale down,
// encode as fresh JPEG without any metadata (EXIF incl. GPS, XMP, IPTC, ICC, comments are dropped).
// Everything happens in memory; nothing is written to disk. File names are assigned by the server.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import sharp, { type Sharp } from 'sharp';
import { erkenneBildTyp, type BildTyp } from './signatur.ts';

sharp.cache(false);

export const MAX_PIXEL = 40_000_000; // e.g. 8000 x 5000; protects against decompression bombs
export const MAX_KANTE = 2560;
const JPEG_QUALITAET = 82;

export class BildFehler extends Error {
  readonly grund: 'typ' | 'defekt' | 'zu-gross';
  constructor(grund: 'typ' | 'defekt' | 'zu-gross') {
    super(`Bild abgelehnt: ${grund}`);
    this.grund = grund;
  }
}

export interface NeuesBild {
  dateiname: string;
  inhalt: Buffer;
  typ: 'image/jpeg';
}

interface HeifBild {
  get_width(): number;
  get_height(): number;
  display(ziel: { data: Uint8ClampedArray; width: number; height: number }, fertig: (d: { data: Uint8ClampedArray } | null) => void): void;
  free?(): void;
}
interface Libheif {
  HeifDecoder: new () => { decode(daten: Uint8Array): HeifBild[] };
}

let libheif: Libheif | undefined;
function ladeLibheif(): Libheif {
  if (libheif) return libheif;
  const require = createRequire(import.meta.url);
  const factory = require('libheif-js/libheif-wasm/libheif.js') as (opts: object) => Libheif;
  const wasmBinary = readFileSync(require.resolve('libheif-js/libheif-wasm/libheif.wasm'));
  // print/printErr: libheif writes parser messages to the console; they are not needed.
  libheif = factory({ wasmBinary, print: () => {}, printErr: () => {} });
  return libheif;
}

async function heicZuRoh(daten: Uint8Array): Promise<{ pixel: Buffer; breite: number; hoehe: number }> {
  let bilder: HeifBild[];
  try {
    const { HeifDecoder } = ladeLibheif();
    bilder = new HeifDecoder().decode(daten);
  } catch {
    throw new BildFehler('defekt');
  }
  const [bild, ...rest] = bilder;
  for (const r of rest) r.free?.();
  if (!bild) throw new BildFehler('defekt');
  try {
    const breite = bild.get_width();
    const hoehe = bild.get_height();
    if (!(breite > 0 && hoehe > 0)) throw new BildFehler('defekt');
    if (breite * hoehe > MAX_PIXEL) throw new BildFehler('zu-gross');
    const ziel = { data: new Uint8ClampedArray(breite * hoehe * 4), width: breite, height: hoehe };
    const fertig = await new Promise<{ data: Uint8ClampedArray } | null>((resolve) => bild.display(ziel, resolve));
    if (!fertig) throw new BildFehler('defekt');
    return { pixel: Buffer.from(fertig.data.buffer, fertig.data.byteOffset, fertig.data.byteLength), breite, hoehe };
  } finally {
    bild.free?.();
  }
}

async function eingabe(daten: Buffer, typ: BildTyp): Promise<Sharp> {
  const opts = { limitInputPixels: MAX_PIXEL, failOn: 'error', pages: 1 } as const;
  if (typ !== 'heic') return sharp(daten, opts);
  const roh = await heicZuRoh(daten);
  return sharp(roh.pixel, { ...opts, raw: { width: roh.breite, height: roh.hoehe, channels: 4 } });
}

/** Detects the type by signature and re-encodes. Throws BildFehler for anything that is not a usable photo. */
export async function kodiereNeu(daten: Buffer, nummer: number): Promise<NeuesBild> {
  const typ = erkenneBildTyp(daten);
  if (!typ) throw new BildFehler('typ');
  try {
    const bild = await eingabe(daten, typ);
    const inhalt = await bild
      .timeout({ seconds: 15 })
      .rotate() // apply EXIF orientation before the metadata is dropped
      .resize({ width: MAX_KANTE, height: MAX_KANTE, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: JPEG_QUALITAET, mozjpeg: true })
      .toBuffer();
    return { dateiname: `foto-${nummer}.jpg`, inhalt, typ: 'image/jpeg' };
  } catch (e) {
    if (e instanceof BildFehler) throw e;
    const text = e instanceof Error ? e.message : '';
    throw new BildFehler(/pixel limit/i.test(text) ? 'zu-gross' : 'defekt');
  }
}
