// Interface between the room planner's submit step (client: planner-export, form + export of GLB,
// renders, PDF, project JSON) and POST /api/planner/submit (server: backend-api).
// Pure constants and types without runtime dependencies; importable from client and server.
// Details and reasoning: docs/agent-reports/6-backend-api-vertrag.md.
// Changes only in agreement between planner-export and backend-api (owner of the file: backend-api).
// Text fields, CSRF, ALTCHA and the honeypot behave exactly as in kontakt-schnittstelle.ts.

import { CSRF_URL } from './kontakt-schnittstelle.ts';

export { CSRF_URL };

export const PLANER_ENDPOINT = '/api/planner/submit';

/**
 * Response behaviour: JSON only. The planner cannot work without JavaScript (all files are generated in
 * the browser), so there is no native form POST and no redirect target. The client must send
 * `Accept: application/json`; requests without it get 406 (JSON body) before the body is read.
 * Content-Type must be multipart/form-data (otherwise 415). Only POST (otherwise 405).
 */
export const PLANER_ACCEPT = 'application/json';

export const OBJEKTARTEN = ['wohnung', 'haus', 'gewerbe'] as const;
export type Objektart = (typeof OBJEKTARTEN)[number];

/** Value of the required `kenntnisnahme` field (privacy notice, Art. 6 (1) b GDPR; not a consent). */
export const KENNTNISNAHME_WERT = 'ja';

/** multipart/form-data field names. */
export const FELD = {
  name: 'name', // text, required, LIMITS.text.name
  email: 'email', // text, required, valid address, LIMITS.text.email
  telefon: 'telefon', // text, optional
  ort: 'ort', // text, required, "PLZ Ort" of the property
  objektart: 'objektart', // select, required, one of OBJEKTARTEN
  zeitraum: 'zeitraum', // text, optional, short free text ("Frühjahr 2027")
  nachricht: 'nachricht', // textarea, optional, free text
  kenntnisnahme: 'kenntnisnahme', // checkbox, required, value KENNTNISNAHME_WERT (privacy notice acknowledged)
  altcha: 'altcha', // ALTCHA payload (base64 JSON), required; challenge from GET /api/altcha
  csrf: 'csrf', // token from GET CSRF_URL -> { token }, required, single use
  website: 'website', // honeypot: visually hidden, must stay empty
  modell: 'modell', // file, required, exactly 1: GLB (glTF 2.0 binary)
  projekt: 'projekt', // file, required, exactly 1: project JSON v2 (serialisiere() from lib/geometry)
  zusammenfassung: 'zusammenfassung', // file, required, exactly 1: PDF summary
  renders: 'renders', // file, required, exactly 4, repeated field in the order of RENDER_ANSICHTEN
  fotos: 'fotos', // file, optional, repeated, 0..LIMITS.foto.maxAnzahl
} as const;
export type PlanerFeld = keyof typeof FELD;

export const TEXTFELDER = ['name', 'email', 'telefon', 'ort', 'objektart', 'zeitraum', 'nachricht', 'kenntnisnahme', 'altcha', 'csrf', 'website'] as const satisfies readonly PlanerFeld[];
export const DATEIFELDER = ['modell', 'projekt', 'zusammenfassung', 'renders', 'fotos'] as const satisfies readonly PlanerFeld[];
export const PFLICHTFELDER = ['name', 'email', 'ort', 'objektart', 'kenntnisnahme', 'altcha', 'csrf', 'modell', 'projekt', 'zusammenfassung', 'renders'] as const satisfies readonly PlanerFeld[];

/**
 * The four renders, in this order as repeated `renders` parts (FormData.append in this order).
 * The server identifies a render only by its position; client file names are ignored. Recommended
 * client file name: `<id>.webp` (or .png). `anhang` is the base name the server uses in the mail.
 */
export const RENDER_ANSICHTEN = [
  { id: 'iso', label: 'Iso-Ansicht', anhang: 'render-1-iso' },
  { id: 'draufsicht', label: 'Draufsicht', anhang: 'render-2-draufsicht' },
  { id: 'perspektive-1', label: 'Raumperspektive 1', anhang: 'render-3-perspektive-1' },
  { id: 'perspektive-2', label: 'Raumperspektive 2', anhang: 'render-4-perspektive-2' },
] as const;
export type RenderAnsicht = (typeof RENDER_ANSICHTEN)[number]['id'];

/** Content signatures checked by the server (declared MIME type and file name are ignored). */
export const SIGNATUR = {
  /** "glTF" at offset 0, uint32 LE version 2 at offset 4, uint32 LE total length at offset 8 = file size. */
  glb: { magic: [0x67, 0x6c, 0x54, 0x46], version: 2, chunkJson: 0x4e4f534a, chunkBin: 0x004e4942 },
  /** "%PDF-" at offset 0; "%%EOF" within the last 1024 bytes. */
  pdf: { magic: [0x25, 0x50, 0x44, 0x46, 0x2d], ende: [0x25, 0x25, 0x45, 0x4f, 0x46], endeSuchBytes: 1024 },
  png: { magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  /** "RIFF" at offset 0 and "WEBP" at offset 8. */
  webp: { magic: [0x52, 0x49, 0x46, 0x46], magic8: [0x57, 0x45, 0x42, 0x50] },
  jpeg: { magic: [0xff, 0xd8, 0xff] },
  /** JSON: UTF-8 without BOM, first non-whitespace byte "{". Then JSON.parse + parseProjekt (v2). */
  json: { erstesZeichen: 0x7b },
} as const;

const MiB = 1024 * 1024;

export const LIMITS = {
  /**
   * Raw request body including multipart overhead. Equal to the adapter's bodySizeLimit in
   * astro.config.mjs (25 MiB); the server rejects larger bodies with 413 before parsing.
   */
  maxBodyBytes: 25 * MiB,
  /** Sum of all file parts; the client checks this before sending (leaves 1 MiB for text fields/overhead). */
  maxDateienGesamtBytes: 24 * MiB,
  modell: {
    anzahl: 1,
    maxBytes: 8 * MiB,
    typ: 'model/gltf-binary',
    signatur: 'glb',
    /** glTF extensions the client may use; the server rejects others in extensionsUsed/extensionsRequired. */
    erweiterungen: ['EXT_meshopt_compression', 'KHR_mesh_quantization', 'KHR_materials_emissive_strength', 'KHR_texture_transform'],
    /** No external or data URIs in buffers/images; everything lives in the BIN chunk. */
    externeUris: false,
  },
  projekt: {
    anzahl: 1,
    maxBytes: 2 * MiB,
    typ: 'application/json',
    signatur: 'json',
    /** Must equal PROJEKT_VERSION from lib/geometry (test checks it); v1 is not accepted here. */
    version: 2,
  },
  zusammenfassung: {
    anzahl: 1,
    maxBytes: 4 * MiB,
    typ: 'application/pdf',
    signatur: 'pdf',
    /**
     * PDF names the client must not produce; the server rejects PDFs containing them (also inside
     * object streams). The PDF goes to RAUMSTROM and in the confirmation mail back to the customer.
     */
    verboten: ['/JavaScript', '/JS', '/OpenAction', '/AA', '/Launch', '/EmbeddedFile', '/RichMedia', '/XFA', '/URI', '/SubmitForm', '/GoToR'],
  },
  render: {
    anzahl: RENDER_ANSICHTEN.length,
    maxBytes: 2 * MiB,
    typen: ['image/webp', 'image/png'],
    signaturen: ['webp', 'png'],
    /** Long edge in pixels (client renders at most this size; the server rejects larger, re-encodes to WebP). */
    maxKante: 2048,
    minKante: 320,
  },
  foto: {
    maxAnzahl: 5,
    maxBytes: 6 * MiB,
    /** Sum of all photos. */
    maxGesamtBytes: 12 * MiB,
    typen: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    signaturen: ['jpeg', 'png', 'webp', 'heic'],
    /** Client scales to this long edge before sending; the server scales larger images down when re-encoding. */
    zielKante: 2560,
  },
  /** Character limits after trim; min 0 = optional. */
  text: {
    name: { min: 2, max: 100 },
    email: { min: 3, max: 254 },
    telefon: { min: 0, max: 40 },
    ort: { min: 2, max: 100 },
    zeitraum: { min: 0, max: 100 },
    nachricht: { min: 0, max: 4000 },
  },
} as const;

/**
 * File names of the attachments in the mail to RAUMSTROM (assigned by the server, never taken from the
 * client). Renders and photos are re-encoded to WebP; photos are numbered `foto-1.webp` … `foto-5.webp`.
 */
export const ANHANG = {
  modell: 'raumplan.glb',
  projekt: 'raumplan-projekt.json',
  zusammenfassung: 'raumplan-zusammenfassung.pdf',
  render: (i: number) => `${RENDER_ANSICHTEN[i]!.anhang}.webp`,
  foto: (i: number) => `foto-${i + 1}.webp`,
} as const;

/** Expected JSON answers of POST /api/planner/submit (always application/json, never a redirect). */
export type PlanerAntwort =
  /** 200: request accepted and mailed. */
  | { ok: true }
  /**
   * 400/422: field errors (keys = FELD names, values = German message; file errors under the file field,
   * e.g. `renders`). 403 (origin/CSRF/ALTCHA), 405, 406, 413, 415, 429, 5xx: only `nachricht`.
   */
  | { ok: false; fehler?: Partial<Record<PlanerFeld, string>>; nachricht?: string };
