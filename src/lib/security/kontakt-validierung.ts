// Server-side validation of the contact form (contract: src/components/forms/kontakt-schnittstelle.ts).
// Only the parsed, typed result is used downstream. Messages are German and keyed by field name.
import { z } from 'zod';
import { FELD, LIMITS } from '../../components/forms/kontakt-schnittstelle.ts';

type Feld = keyof typeof FELD;
export type FeldFehler = Partial<Record<Feld, string>>;

/** Control characters except tab and newline (for multi-line text), and Unicode line/paragraph separators. */
const STEUER_EINZEILIG = /[\p{Cc}\u2028\u2029\u202A-\u202E\u2066-\u2069]/u;
const STEUER_MEHRZEILIG = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u2028\u2029\u202A-\u202E\u2066-\u2069]/u;

// Single-line fields: control characters (incl. CR/LF) are rejected before whitespace is normalised.
const einzeilig = (min: number, max: number, meldung: string) =>
  z
    .string()
    .refine((s) => !STEUER_EINZEILIG.test(s), meldung)
    .transform((s) => s.trim().replace(/\s+/g, ' '))
    .pipe(z.string().min(min, meldung).max(max, meldung));

const optionalEinzeilig = (max: number, meldung: string) =>
  z
    .string()
    .optional()
    .refine((s) => s === undefined || !STEUER_EINZEILIG.test(s), meldung)
    .transform((s) => (s ?? '').trim().replace(/\s+/g, ' '))
    .pipe(z.string().max(max, meldung));

export const MELDUNG = {
  name: 'Bitte geben Sie Ihren Namen ein (2 bis 100 Zeichen).',
  email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein, zum Beispiel name@beispiel.de.',
  telefon: 'Bitte geben Sie die Telefonnummer nur mit Ziffern, Leerzeichen und + ( ) / - ein.',
  ort: 'Bitte geben Sie Postleitzahl und Ort mit höchstens 100 Zeichen ein.',
  anliegen: 'Bitte wählen Sie ein Thema aus der Liste.',
  nachricht: `Bitte beschreiben Sie Ihr Vorhaben mit ${LIMITS.nachrichtMin} bis ${LIMITS.nachrichtMax} Zeichen.`,
  einwilligung: 'Bitte stimmen Sie der Verarbeitung Ihrer Angaben zu, damit wir Ihre Anfrage bearbeiten können.',
  skizze: 'Die Raumskizze konnte nicht gelesen werden.',
  fotos: 'Bitte wählen Sie nur Fotos im Format JPG, PNG, WebP oder HEIC aus.',
  fotosAnzahl: `Bitte wählen Sie höchstens ${LIMITS.maxDateien} Fotos aus.`,
  fotosGroesse: `Ein Foto ist größer als ${Math.round(LIMITS.maxDateiBytes / 1024 / 1024)} MB. Bitte wählen Sie kleinere Dateien.`,
  fotosGesamt: `Alle Fotos zusammen dürfen höchstens ${Math.round(LIMITS.maxGesamtBytes / 1024 / 1024)} MB groß sein.`,
  fotoDefekt: 'Ein Foto konnte nicht gelesen werden. Bitte wählen Sie eine andere Datei.',
  fotoZuGross: 'Ein Foto hat eine zu hohe Auflösung. Bitte wählen Sie eine kleinere Version, zum Beispiel als JPG exportiert.',
  altcha: 'Bitte bestätigen Sie den Spam-Schutz und senden Sie das Formular erneut.',
  csrf: 'Das Formular ist abgelaufen. Bitte senden Sie es erneut.',
} as const;

const SKIZZE_MAX = 200 * 1024;

export function kontaktSchema(anliegenIds: readonly string[]) {
  const ids = new Set([...anliegenIds, 'sonstiges']);
  return z.object({
    name: einzeilig(2, 100, MELDUNG.name),
    email: z
      .string()
      .refine((s) => !STEUER_EINZEILIG.test(s), MELDUNG.email)
      .transform((s) => s.trim())
      .pipe(z.email({ error: MELDUNG.email }).max(160, MELDUNG.email)),
    telefon: optionalEinzeilig(40, MELDUNG.telefon).refine((s) => s === '' || /^\+?[0-9 ()/.-]{3,40}$/.test(s), MELDUNG.telefon),
    ort: optionalEinzeilig(100, MELDUNG.ort),
    anliegen: z
      .string()
      .optional()
      .transform((s) => (s ?? '').trim())
      .refine((s) => s === '' || ids.has(s), MELDUNG.anliegen),
    nachricht: z
      .string()
      .transform((s) => s.replace(/\r\n?/g, '\n').trim())
      .pipe(
        z
          .string()
          .min(LIMITS.nachrichtMin, MELDUNG.nachricht)
          .max(LIMITS.nachrichtMax, MELDUNG.nachricht)
          .refine((s) => !STEUER_MEHRZEILIG.test(s), MELDUNG.nachricht),
      ),
    // Reserved for the room planner (phase 6): accepted only as empty or valid JSON, not used yet.
    skizze: z
      .string()
      .max(SKIZZE_MAX, MELDUNG.skizze)
      .optional()
      .refine((s) => {
        if (!s) return true;
        try {
          JSON.parse(s);
          return true;
        } catch {
          return false;
        }
      }, MELDUNG.skizze),
    einwilligung: z.literal('ja', { error: MELDUNG.einwilligung }),
  });
}

export type KontaktDaten = z.output<ReturnType<typeof kontaktSchema>>;

const TEXT_FELDER = new Set<string>([FELD.name, FELD.email, FELD.telefon, FELD.ort, FELD.anliegen, FELD.nachricht, FELD.skizze, FELD.einwilligung, FELD.altcha, FELD.csrf, FELD.website]);

export interface Rohdaten {
  felder: Record<string, string>;
  dateien: File[];
}

/**
 * Splits FormData into single text values and photo files. Unknown fields, repeated text fields and
 * files in text fields are rejected (null) – the form never sends them.
 */
export function zerlege(form: FormData): Rohdaten | null {
  const felder: Record<string, string> = {};
  const dateien: File[] = [];
  for (const [name, wert] of form.entries()) {
    if (name === FELD.fotos) {
      if (typeof wert === 'string') {
        if (wert !== '') return null;
        continue;
      }
      // Browsers send an empty part when no file was chosen.
      if (wert.size === 0 && wert.name === '') continue;
      dateien.push(wert);
      continue;
    }
    if (!TEXT_FELDER.has(name) || typeof wert !== 'string' || name in felder) return null;
    felder[name] = wert;
  }
  return { felder, dateien };
}

/** Count and size limits (content is checked later by signature and re-encoding). */
export function pruefeDateiLimits(dateien: File[]): string | null {
  if (dateien.length > LIMITS.maxDateien) return MELDUNG.fotosAnzahl;
  if (dateien.some((d) => d.size > LIMITS.maxDateiBytes || d.size === 0)) return dateien.some((d) => d.size === 0) ? MELDUNG.fotoDefekt : MELDUNG.fotosGroesse;
  if (dateien.reduce((s, d) => s + d.size, 0) > LIMITS.maxGesamtBytes) return MELDUNG.fotosGesamt;
  return null;
}

export function validiere(felder: Record<string, string>, anliegenIds: readonly string[]): { ok: true; daten: KontaktDaten } | { ok: false; fehler: FeldFehler } {
  const r = kontaktSchema(anliegenIds).safeParse(felder);
  if (r.success) return { ok: true, daten: r.data };
  const fehler: FeldFehler = {};
  for (const issue of r.error.issues) {
    const feld = String(issue.path[0] ?? '') as Feld;
    // One fixed message per field (also for missing fields, where zod would answer in English).
    if (feld in FELD && !fehler[feld]) fehler[feld] = (MELDUNG as Record<string, string>)[feld] ?? 'Bitte prüfen Sie diese Angabe.';
  }
  return { ok: false, fehler };
}
