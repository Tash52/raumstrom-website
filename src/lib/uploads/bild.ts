// Re-encodes uploaded photos: decode (sharp; HEIC via libheif-js in a worker, see heic.ts), apply EXIF orientation, scale down,
// encode as fresh JPEG without any metadata (EXIF incl. GPS, XMP, IPTC, ICC, comments are dropped).
// Everything happens in memory; nothing is written to disk. File names are assigned by the server.
// Memory (M-2 rest): one image at a time server-wide (BILD_SLOT), from decoding to the finished JPEG, so
// at most one full-size pixel buffer exists; libvips runs without cache and with one thread per image.
import sharp, { type Sharp } from 'sharp';
import { Parallelitaet } from '../security/speicher.ts';
import { dekodiereImWorker, HeicAbgelehnt, type RohBild } from './heic.ts';
import { erkenneBildTyp, type BildTyp } from './signatur.ts';

sharp.cache(false);
sharp.concurrency(1);

export const MAX_PIXEL = 40_000_000; // e.g. 8000 x 5000; protects against decompression bombs (HEIC: heic.ts)
export const MAX_KANTE = 2560;
const JPEG_QUALITAET = 82;
/** One image at a time (decode + encode); a few may wait, then "ausgelastet" -> 503. */
export const BILD_SLOT = new Parallelitaet(1, 8);
export const BILD_WARTEZEIT_MS = 30_000;

export type BildFehlerGrund = 'typ' | 'defekt' | 'zu-gross' | 'ausgelastet';
export class BildFehler extends Error {
  readonly grund: BildFehlerGrund;
  constructor(grund: BildFehlerGrund) {
    super(`Bild abgelehnt: ${grund}`);
    this.grund = grund;
  }
}

export interface NeuesBild {
  dateiname: string;
  inhalt: Buffer;
  typ: 'image/jpeg';
}

/**
 * Detaches a decoded pixel buffer so its memory is returned at once instead of whenever the GC notices
 * the external memory (5 HEIC in a row otherwise keep several 70-100 MB buffers alive, M-2 rest).
 */
function gibFrei(puffer: Buffer<ArrayBuffer>) {
  try {
    if (!puffer.buffer.detached) puffer.buffer.transfer(0);
  } catch {
    // Not transferable (e.g. still in use): the GC frees it later.
  }
}

async function kodiere(daten: Buffer, typ: BildTyp, nummer: number): Promise<NeuesBild> {
  const opts = { limitInputPixels: MAX_PIXEL, failOn: 'error', pages: 1 } as const;
  let roh: RohBild | undefined;
  try {
    let bild: Sharp;
    if (typ === 'heic') {
      try {
        roh = await dekodiereImWorker(daten);
      } catch (e) {
        throw new BildFehler(e instanceof HeicAbgelehnt ? e.grund : 'defekt');
      }
      bild = sharp(roh.pixel, { ...opts, raw: { width: roh.breite, height: roh.hoehe, channels: roh.kanaele } });
    } else {
      bild = sharp(daten, opts);
    }
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
  } finally {
    if (roh) gibFrei(roh.pixel);
  }
}

/** Detects the type by signature and re-encodes. Throws BildFehler for anything that is not a usable photo. */
export async function kodiereNeu(daten: Buffer, nummer: number): Promise<NeuesBild> {
  const typ = erkenneBildTyp(daten);
  if (!typ) throw new BildFehler('typ');
  const frei = await BILD_SLOT.warte(BILD_WARTEZEIT_MS);
  if (!frei) throw new BildFehler('ausgelastet');
  try {
    return await kodiere(daten, typ, nummer);
  } finally {
    frei();
  }
}
