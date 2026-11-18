// File type detection by content (magic bytes). The declared MIME type and the file name are ignored.
// Only raster photos are accepted; SVG, PDF, HTML, archives etc. never match.

export type BildTyp = 'jpeg' | 'png' | 'webp' | 'heic';

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** ISO-BMFF brands of HEIC/HEIF stills (HEVC). AVIF is not offered in the form. */
const HEIF_BRANDS = new Set(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1']);

const ascii = (b: Uint8Array, start: number, len: number) => String.fromCharCode(...b.subarray(start, start + len));

export function erkenneBildTyp(b: Uint8Array): BildTyp | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (PNG.every((v, i) => b[i] === v)) return 'png';
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 4) === 'WEBP') return 'webp';
  if (ascii(b, 4, 4) === 'ftyp') {
    const size = ((b[0]! << 24) | (b[1]! << 16) | (b[2]! << 8) | b[3]!) >>> 0;
    if (size < 16 || size > Math.min(b.length, 256)) return null;
    const brands = [ascii(b, 8, 4)];
    for (let i = 16; i + 4 <= size; i += 4) brands.push(ascii(b, i, 4));
    // AVIF files also carry mif1; exclude them explicitly.
    if (brands.includes('avif') || brands.includes('avis')) return null;
    if (brands.some((x) => HEIF_BRANDS.has(x))) return 'heic';
  }
  return null;
}
