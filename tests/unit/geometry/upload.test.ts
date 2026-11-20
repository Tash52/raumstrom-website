// Upload checks (signature sniffing, size limit) and the self-hosted pdf.js files.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MAX_BYTES, erkenneTyp, pruefeDatei, zielGroesse } from '../../../src/islands/planner/upload/signatur.ts';

const bytes = (...teile: Array<number[] | string>) =>
  new Uint8Array(teile.flatMap((t) => (typeof t === 'string' ? [...t].map((c) => c.charCodeAt(0)) : t)));

describe('Dateityp aus der Signatur', () => {
  it('erkennt JPEG, PNG, WebP, PDF und HEIC', () => {
    expect(erkenneTyp(bytes([0xff, 0xd8, 0xff, 0xe1]))).toBe('jpeg');
    expect(erkenneTyp(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('png');
    expect(erkenneTyp(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '))).toBe('webp');
    expect(erkenneTyp(bytes('%PDF-1.7\n'))).toBe('pdf');
    expect(erkenneTyp(bytes([0, 0, 0, 0x18], 'ftypheic', [0, 0, 0, 0], 'mif1heic'))).toBe('heic');
    expect(erkenneTyp(bytes([0, 0, 0, 0x18], 'ftypmif1', [0, 0, 0, 0], 'mif1heic'))).toBe('heic');
  });

  it('lehnt andere Formate ab (auch mit passender Endung)', () => {
    expect(erkenneTyp(bytes('GIF89a'))).toBeNull();
    expect(erkenneTyp(bytes('<svg xmlns='))).toBeNull();
    expect(erkenneTyp(bytes([0, 0, 0, 0x18], 'ftypisom', [0, 0, 0, 0], 'isomavc1'))).toBeNull(); // MP4
    expect(erkenneTyp(bytes('PK', [3, 4]))).toBeNull();
  });

  it('Größenlimit 20 MB und leere Dateien', () => {
    const jpg = bytes([0xff, 0xd8, 0xff]);
    expect(pruefeDatei(MAX_BYTES, jpg).ok).toBe(true);
    expect(pruefeDatei(MAX_BYTES + 1, jpg).ok).toBe(false);
    expect(pruefeDatei(0, jpg).ok).toBe(false);
  });

  it('verkleinert große Bilder auf höchstens 4096 px Kantenlänge', () => {
    expect(zielGroesse(8000, 6000)).toEqual({ breite: 4096, hoehe: 3072 });
    expect(zielGroesse(1200, 800)).toEqual({ breite: 1200, hoehe: 800 });
  });
});

describe('pdf.js selbst gehostet', () => {
  const sha = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex');

  it('public/pdfjs entspricht genau der installierten pdfjs-dist-Version', () => {
    expect(sha('public/pdfjs/pdf.worker.min.mjs')).toBe(sha('node_modules/pdfjs-dist/build/pdf.worker.min.mjs'));
    for (const f of readdirSync('public/pdfjs/wasm')) {
      expect(sha(`public/pdfjs/wasm/${f}`), f).toBe(sha(`node_modules/pdfjs-dist/wasm/${f}`));
    }
  });

  it('keine Schriften mit nicht freigegebener Lizenz (Liberation GPL) ausgeliefert', () => {
    expect(readdirSync('public/pdfjs')).not.toContain('standard_fonts');
  });
});
