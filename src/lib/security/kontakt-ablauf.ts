// Processing of POST /api/contact, independent of Astro (testable). Order: cheap checks first,
// expensive work (image decoding, SMTP) only after CSRF, validation and proof of work passed.
// Nothing is stored: form data and photos live in memory for the duration of the request only.
import type { SendMailOptions } from 'nodemailer';
import { LIMITS as FORM_LIMITS } from '../../components/forms/kontakt-schnittstelle.ts';
import { anfrageMail, bestaetigungMail } from '../mail/kontakt-mails.ts';
import type { Firma } from '../schemas/index.ts';
import { isPlaceholder } from '../schemas/shared.ts';
import { BildFehler, kodiereNeu, type NeuesBild } from '../uploads/bild.ts';
import { pruefeAltcha } from './altcha.ts';
import { EINMAL, LIMITS, PARALLEL, begrenze, protokolliere, type ApiKontext } from './api.ts';
import { pruefeCsrfToken, verbraucheCsrfToken } from './csrf.ts';
import { istGleicherUrsprung } from './herkunft.ts';
import { MELDUNG, pruefeDateiLimits, validiere, zerlege, type FeldFehler } from './kontakt-validierung.ts';
import { hmacB64 } from './schluessel.ts';

/** Server body limit (astro.config.mjs bodySizeLimit is 25 MB); a bit of room for multipart overhead. */
export const MAX_BODY = FORM_LIMITS.maxGesamtBytes + 2 * 1024 * 1024;

export interface KontaktAbhaengigkeiten {
  kontext: ApiKontext;
  firma: Firma;
  /** id -> title of the visible Leistungen. */
  anliegen: Map<string, string>;
  sende: (mail: SendMailOptions) => Promise<void>;
  socketAdresse: string | undefined;
  jetzt?: () => Date;
}

export type KontaktErgebnis =
  | { status: 200; ok: true }
  | { status: 400 | 403 | 413 | 415 | 422 | 429 | 500 | 502 | 503; ok: false; fehler?: FeldFehler; nachricht?: string; retryNachS?: number };

const TEXT = {
  allgemein: 'Ihre Anfrage konnte nicht verarbeitet werden. Bitte laden Sie die Seite neu und versuchen Sie es erneut.',
  herkunft: 'Die Anfrage wurde aus Sicherheitsgründen abgelehnt. Bitte senden Sie das Formular direkt auf unserer Website.',
  typ: 'Bitte senden Sie das Formular über die Kontaktseite.',
  gross: `Die Anfrage ist zu groß. Alle Fotos zusammen dürfen höchstens ${Math.round(FORM_LIMITS.maxGesamtBytes / 1024 / 1024)} MB groß sein.`,
  rate: 'Sie haben in kurzer Zeit mehrere Anfragen gesendet. Bitte versuchen Sie es in einigen Minuten erneut.',
  belegt: 'Gerade gehen sehr viele Anfragen ein. Bitte versuchen Sie es in einer Minute erneut.',
  versand: 'Ihre Anfrage konnte gerade nicht gesendet werden. Bitte versuchen Sie es später erneut oder schreiben Sie uns direkt per E-Mail.',
} as const;

const fehler = (status: Exclude<KontaktErgebnis['status'], 200>, nachricht: string, extra: Partial<Extract<KontaktErgebnis, { ok: false }>> = {}): KontaktErgebnis => ({
  status,
  ok: false,
  nachricht,
  ...extra,
});

/** Recipient from firma.yaml; while it is a placeholder (staging) the optional MAIL_TO_STAGING. */
export function empfaenger(firma: Firma, staging: string | undefined): string | null {
  const wert = firma.kontakt.anfragen_empfaenger;
  if (wert && !isPlaceholder(wert)) return wert;
  return staging ?? null;
}

export async function verarbeiteKontakt(request: Request, d: KontaktAbhaengigkeiten): Promise<KontaktErgebnis> {
  const k = d.kontext;
  const jetzt = d.jetzt ?? (() => new Date());

  if (!istGleicherUrsprung(request, { trustProxy: k.env.TRUST_PROXY, erlaubt: [`https://${d.firma.domain}`, `https://www.${d.firma.domain}`] })) {
    protokolliere('kontakt: abgelehnt herkunft');
    return fehler(403, TEXT.herkunft);
  }
  const ct = request.headers.get('content-type') ?? '';
  if (!/^multipart\/form-data;\s*boundary=/i.test(ct)) return fehler(415, TEXT.typ);
  const laenge = Number(request.headers.get('content-length') ?? '0');
  if (!Number.isFinite(laenge) || laenge > MAX_BODY) return fehler(413, TEXT.gross);

  const proClient = begrenze(LIMITS.kontakt, request, d.socketAdresse, k);
  const gesamt = LIMITS.kontaktGesamt.pruefe('gesamt');
  if (!proClient.erlaubt || !gesamt.erlaubt) {
    protokolliere('kontakt: rate-limit');
    return fehler(429, TEXT.rate, { retryNachS: Math.max(proClient.retryNachS, gesamt.erlaubt ? 0 : gesamt.retryNachS) });
  }

  const frei = PARALLEL.belege();
  if (!frei) {
    protokolliere('kontakt: ausgelastet');
    return fehler(503, TEXT.belegt, { retryNachS: 60 });
  }
  try {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      // Body over the adapter limit, aborted upload or broken multipart.
      return fehler(400, TEXT.allgemein);
    }
    const roh = zerlege(form);
    if (!roh) return fehler(400, TEXT.allgemein);

    const csrf = pruefeCsrfToken(k.csrfKey, roh.felder.csrf);
    if (!csrf.ok) {
      protokolliere(`kontakt: abgelehnt csrf ${csrf.grund}`);
      return fehler(403, MELDUNG.csrf);
    }

    // Honeypot: answer like a success, send nothing.
    if ((roh.felder.website ?? '') !== '') {
      protokolliere('kontakt: honeypot');
      return { status: 200, ok: true };
    }

    const v = validiere(roh.felder, [...d.anliegen.keys()]);
    const dateiFehler = pruefeDateiLimits(roh.dateien);
    if (!v.ok || dateiFehler) {
      const f: FeldFehler = v.ok ? {} : { ...v.fehler };
      if (dateiFehler) f.fotos = dateiFehler;
      return fehler(422, 'Bitte prüfen Sie Ihre Angaben.', { fehler: f });
    }

    const altcha = await pruefeAltcha(roh.felder.altcha, k.altcha, EINMAL);
    if (!altcha.ok) {
      protokolliere(`kontakt: abgelehnt altcha ${altcha.grund}`);
      return fehler(422, MELDUNG.altcha);
    }
    if (!verbraucheCsrfToken(EINMAL, csrf)) {
      protokolliere('kontakt: abgelehnt csrf wiederholt');
      return fehler(403, MELDUNG.csrf);
    }

    const bilder: NeuesBild[] = [];
    for (const [i, datei] of roh.dateien.entries()) {
      try {
        bilder.push(await kodiereNeu(Buffer.from(await datei.arrayBuffer()), i + 1));
      } catch (e) {
        const grund = e instanceof BildFehler ? e.grund : 'defekt';
        protokolliere(`kontakt: foto abgelehnt ${grund}`);
        return fehler(422, 'Bitte prüfen Sie Ihre Fotos.', { fehler: { fotos: grund === 'typ' ? MELDUNG.fotos : MELDUNG.fotoDefekt } });
      }
    }

    const an = empfaenger(d.firma, k.env.MAIL_TO_STAGING);
    if (!an) {
      protokolliere('kontakt: konfiguration anfragen_empfaenger fehlt');
      return fehler(503, TEXT.versand);
    }

    const daten = v.daten;
    const kontext = { firma: d.firma, mailFrom: k.env.MAIL_FROM, empfaenger: an, anliegenTitel: d.anliegen.get(daten.anliegen) ?? (daten.anliegen === 'sonstiges' ? 'Etwas anderes' : null), eingang: jetzt() };
    try {
      await d.sende(anfrageMail(daten, bilder, kontext));
    } catch (e) {
      protokolliere(`kontakt: versand fehlgeschlagen ${smtpCode(e)}`);
      return fehler(502, TEXT.versand);
    }

    // Confirmation without any user content; at most 2 per address and day.
    const proAdresse = LIMITS.bestaetigung.pruefe(hmacB64(k.mailKey, daten.email.toLowerCase()).slice(0, 22));
    if (proAdresse.erlaubt) {
      try {
        await d.sende(bestaetigungMail(daten.email, kontext));
      } catch (e) {
        protokolliere(`kontakt: bestaetigung fehlgeschlagen ${smtpCode(e)}`);
      }
    }
    protokolliere(`kontakt: gesendet (${bilder.length} fotos)`);
    return { status: 200, ok: true };
  } finally {
    frei();
  }
}

/** Only the error code (e.g. ECONNECTION, EAUTH); messages may contain addresses. */
function smtpCode(e: unknown): string {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^[A-Z0-9_]{2,20}$/.test(code) ? code : 'unbekannt';
}
