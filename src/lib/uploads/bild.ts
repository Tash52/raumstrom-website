// Re-encodes uploaded photos: decode (sharp; HEIC via libheif-js in a worker, see heic.ts), apply EXIF orientation, scale down,
// encode as fresh JPEG without any metadata (EXIF incl. GPS, XMP, IPTC, ICC, comments are dropped).
// Everything happens in memory; nothing is written to disk. File names are assigned by the server.
import sharp, { type Sharp } from 'sharp';
import { dekodiereHeic, HeicAbgelehnt } from './heic.ts';
import { erkenneBildTyp, type BildTyp } from './signatur.ts';

sharp.cache(false);

export const MAX_PIXEL = 40_000_000; // e.g. 8000 x 5000; protects against decompression bombs (HEIC: heic.ts)
export const MAX_KANTE = 2560;
const JPEG_QUALITAET = 82;

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

async function eingabe(daten: Buffer, typ: BildTyp): Promise<Sharp> {
  const opts = { limitInputPixels: MAX_PIXEL, failOn: 'error', pages: 1 } as const;
  if (typ !== 'heic') return sharp(daten, opts);
  let roh;
  try {
    roh = await dekodiereHeic(daten);
  } catch (e) {
    throw new BildFehler(e instanceof HeicAbgelehnt ? e.grund : 'defekt');
  }
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
