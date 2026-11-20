// File checks for the floor plan upload (pure, testable). The type is taken from the file signature,
// never from the name or the browser's MIME guess.

export const MAX_BYTES = 20 * 1024 * 1024;
export const KOPF_BYTES = 1024;

export type DateiTyp = 'jpeg' | 'png' | 'webp' | 'pdf' | 'heic';

const ascii = (b: Uint8Array, von: number, bis: number) => String.fromCharCode(...b.subarray(von, bis));

const HEIF_MARKEN = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1']);

export function erkenneTyp(b: Uint8Array): DateiTyp | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x)) return 'png';
  if (b.length >= 12 && ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return 'webp';
  // PDF header may follow a few junk bytes (ISO 32000: within the first 1024 bytes)
  if (ascii(b, 0, Math.min(b.length, KOPF_BYTES)).includes('%PDF-')) return 'pdf';
  if (b.length >= 12 && ascii(b, 4, 8) === 'ftyp') {
    const groesse = Math.min(b.length, ((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0 || 12);
    const marken = [ascii(b, 8, 12)];
    for (let i = 16; i + 4 <= groesse; i += 4) marken.push(ascii(b, i, i + 4));
    if (marken.some((m) => HEIF_MARKEN.has(m))) return 'heic';
  }
  return null;
}

export type PruefErgebnis = { ok: true; typ: DateiTyp } | { ok: false; fehler: string };

export function pruefeDatei(groesse: number, kopf: Uint8Array): PruefErgebnis {
  if (groesse <= 0) return { ok: false, fehler: 'Die Datei ist leer.' };
  if (groesse > MAX_BYTES) return { ok: false, fehler: 'Die Datei ist größer als 20 MB. Bitte eine kleinere Datei wählen.' };
  const typ = erkenneTyp(kopf);
  if (!typ) return { ok: false, fehler: 'Dieses Format wird nicht unterstützt. Möglich sind JPG, PNG, WebP, HEIC und PDF.' };
  return { ok: true, typ };
}

/** Longest image edge after re-encoding (pixels). Keeps memory and canvas limits on phones in check. */
export const MAX_KANTE = 4096;

export function zielGroesse(breite: number, hoehe: number, max = MAX_KANTE): { breite: number; hoehe: number } {
  const f = Math.min(1, max / Math.max(breite, hoehe));
  return { breite: Math.max(1, Math.round(breite * f)), hoehe: Math.max(1, Math.round(hoehe * f)) };
}
