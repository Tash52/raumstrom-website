// Interface between the contact form (UI: page-builder) and POST /api/contact (backend-api).
// Pure constants and types, importable from client and server. Documented in CLAUDE.md and
// docs/agent-reports/2-page-builder.md. Changes only in agreement between page-builder and backend-api.

export const KONTAKT_ENDPOINT = '/api/contact';

/** multipart/form-data field names. */
export const FELD = {
  name: 'name', // text, required, 2-100 characters
  email: 'email', // text, required, valid address
  telefon: 'telefon', // text, optional, up to 40 characters
  ort: 'ort', // text, optional, "PLZ Ort" of the project, up to 100 characters
  anliegen: 'anliegen', // select, optional: id from the leistungen collection or "sonstiges"
  nachricht: 'nachricht', // textarea, required, 10-4000 characters
  fotos: 'fotos', // file, optional, repeated (multiple), see LIMITS
  skizze: 'skizze', // hidden text, optional, JSON of the room planner (reserved for phase 4-6), up to 200 kB
  einwilligung: 'einwilligung', // checkbox, required, value "ja"
  altcha: 'altcha', // ALTCHA payload (base64 JSON), required; filled by the ALTCHA widget
  csrf: 'csrf', // CSRF token string, filled by the form script (see CSRF_URL), required
  website: 'website', // honeypot: visually hidden, must stay empty
} as const;

export const LIMITS = {
  maxDateien: 5,
  maxDateiBytes: 10 * 1024 * 1024,
  maxGesamtBytes: 20 * 1024 * 1024, // server bodySizeLimit is 25 MB
  dateiTypen: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  nachrichtMin: 10,
  nachrichtMax: 4000,
} as const;

/** GET returns { token: string } (no cookie). Proposal; backend-api confirms or replaces it. */
export const CSRF_URL = '/api/csrf';

/** Expected JSON answers of POST /api/contact (always application/json). */
export type KontaktAntwort =
  /** 200: request accepted and mailed. */
  | { ok: true }
  /** 400/422: field errors (keys = FELD names, values = German message). 429/413/5xx: only `nachricht`. */
  | { ok: false; fehler?: Partial<Record<keyof typeof FELD, string>>; nachricht?: string };
