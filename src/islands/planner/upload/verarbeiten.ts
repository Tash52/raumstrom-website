// Floor plan files are processed only in the browser. Every source is drawn onto a fresh canvas
// (re-encoding): the result holds pixels only, no EXIF/XMP/GPS or other metadata. Nothing is uploaded.
// pdf.js (worker self-hosted under /pdfjs/) and the HEIC decoder are loaded only when needed.
import { type DateiTyp, KOPF_BYTES, MAX_KANTE, pruefeDatei, zielGroesse } from './signatur.ts';

export interface GrundrissBild {
  /** Re-encoded image (pixels only). */
  canvas: HTMLCanvasElement;
  breite: number;
  hoehe: number;
  quelle: 'bild' | 'pdf' | 'heic';
  seite: number | null;
}

export interface PdfDokument {
  seiten: number;
  rendere(seite: number): Promise<GrundrissBild>;
  schliessen(): void;
}

export type Ergebnis = { art: 'bild'; bild: GrundrissBild } | { art: 'pdf'; pdf: PdfDokument };

export class UploadFehler extends Error {}

function aufCanvas(quelle: CanvasImageSource, breite: number, hoehe: number): HTMLCanvasElement {
  const ziel = zielGroesse(breite, hoehe);
  const canvas = document.createElement('canvas');
  canvas.width = ziel.breite;
  canvas.height = ziel.hoehe;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new UploadFehler('Das Bild konnte nicht verarbeitet werden.');
  ctx.fillStyle = '#ffffff'; // transparent PNG/PDF areas become white paper
  ctx.fillRect(0, 0, ziel.breite, ziel.hoehe);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(quelle, 0, 0, ziel.breite, ziel.hoehe);
  return canvas;
}

async function bitmapZuBild(bitmap: ImageBitmap, quelle: GrundrissBild['quelle']): Promise<GrundrissBild> {
  try {
    const canvas = aufCanvas(bitmap, bitmap.width, bitmap.height);
    return { canvas, breite: canvas.width, hoehe: canvas.height, quelle, seite: null };
  } finally {
    bitmap.close();
  }
}

async function ladeRaster(datei: Blob): Promise<GrundrissBild> {
  // imageOrientation applies the EXIF rotation once; the metadata itself is dropped by the canvas
  const bitmap = await createImageBitmap(datei, { imageOrientation: 'from-image' }).catch(() => {
    throw new UploadFehler('Das Bild konnte nicht gelesen werden. Ist die Datei beschädigt?');
  });
  return bitmapZuBild(bitmap, 'bild');
}

async function ladeHeic(datei: Blob): Promise<GrundrissBild> {
  const { heicTo } = await import('heic-to/csp');
  const bitmap = await heicTo({ blob: datei, type: 'bitmap' }).catch(() => {
    throw new UploadFehler('Das HEIC-Foto konnte nicht umgewandelt werden. Bitte als JPG exportieren und erneut versuchen.');
  });
  return bitmapZuBild(bitmap, 'heic');
}

async function oeffnePdf(datei: Blob): Promise<PdfDokument> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.mjs';
  const daten = new Uint8Array(await datei.arrayBuffer());
  const aufgabe = pdfjs.getDocument({
    data: daten,
    wasmUrl: '/pdfjs/wasm/',
    enableXfa: false,
    // glyphs as paths: no font loading via @font-face/data URLs (CSP font-src 'self')
    disableFontFace: true,
    useSystemFonts: false,
    disableWorkerRendering: true,
    maxImageSize: 64 * 1024 * 1024,
    stopAtErrors: false,
  });
  const doc = await aufgabe.promise.catch((e: unknown) => {
    const name = (e as { name?: string })?.name;
    throw new UploadFehler(
      name === 'PasswordException' ? 'Das PDF ist passwortgeschützt. Bitte ohne Passwort speichern.' : 'Das PDF konnte nicht gelesen werden.',
    );
  });
  return {
    seiten: doc.numPages,
    async rendere(seite) {
      const page = await doc.getPage(seite);
      const basis = page.getViewport({ scale: 1 });
      // about 3000 px on the longest edge: fine lines stay readable, memory stays moderate
      const scale = Math.min(8, Math.min(3000, MAX_KANTE) / Math.max(basis.width, basis.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new UploadFehler('Das PDF konnte nicht dargestellt werden.');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: ctx, viewport, background: '#ffffff' }).promise;
      page.cleanup();
      return { canvas, breite: canvas.width, hoehe: canvas.height, quelle: 'pdf', seite };
    },
    schliessen() {
      void aufgabe.destroy();
    },
  };
}

/** Check and decode a user file. Throws UploadFehler with a German message. */
export async function verarbeiteDatei(datei: File): Promise<Ergebnis> {
  const kopf = new Uint8Array(await datei.slice(0, KOPF_BYTES).arrayBuffer());
  const pruefung = pruefeDatei(datei.size, kopf);
  if (!pruefung.ok) throw new UploadFehler(pruefung.fehler);
  const typ: DateiTyp = pruefung.typ;
  if (typ === 'pdf') return { art: 'pdf', pdf: await oeffnePdf(datei) };
  if (typ === 'heic') return { art: 'bild', bild: await ladeHeic(datei) };
  return { art: 'bild', bild: await ladeRaster(datei) };
}
