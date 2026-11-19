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
import {
  ANNAHME,
  ANNAHME_KLEIN,
  ANNAHME_PRO_CLIENT,
  EINMAL,
  KLEIN_BODY,
  LIMITS,
  MAX_BODY,
  PARALLEL,
  PARALLEL_WARTEZEIT_MS,
  VERSAND,
  VERSAND_WARTEZEIT_MS,
  clientKennung,
  netzKennungClient,
  protokolliere,
  type ApiKontext,
} from './api.ts';
import { BODY_GRENZEN, formDataAus, leseBody, leseFrist, type BodyGrenzen } from './body.ts';
import { pruefeCsrfToken, verbraucheCsrfToken } from './csrf.ts';
import { istGleicherUrsprung } from './herkunft.ts';
import { MELDUNG, pruefeDateiLimits, validiere, zerlege, type FeldFehler } from './kontakt-validierung.ts';
import { hmacB64 } from './schluessel.ts';

export { MAX_BODY };

export interface KontaktAbhaengigkeiten {
  kontext: ApiKontext;
  firma: Firma;
  /** id -> title of the visible Leistungen. */
  anliegen: Map<string, string>;
  sende: (mail: SendMailOptions) => Promise<void>;
  socketAdresse: string | undefined;
  jetzt?: () => Date;
  /** Overrides for tests (deadline, minimum rate). */
  bodyGrenzen?: Partial<BodyGrenzen>;
}

export type KontaktErgebnis =
  | { status: 200; ok: true }
  | { status: 400 | 403 | 408 | 413 | 415 | 422 | 429 | 500 | 502 | 503; ok: false; fehler?: FeldFehler; nachricht?: string; retryNachS?: number };

const TEXT = {
  allgemein: 'Ihre Anfrage konnte nicht verarbeitet werden. Bitte laden Sie die Seite neu und versuchen Sie es erneut.',
  herkunft: 'Die Anfrage wurde aus Sicherheitsgründen abgelehnt. Bitte senden Sie das Formular direkt auf unserer Website.',
  typ: 'Bitte senden Sie das Formular über die Kontaktseite.',
  gross: `Die Anfrage ist zu groß. Alle Fotos zusammen dürfen höchstens ${Math.round(FORM_LIMITS.maxGesamtBytes / 1024 / 1024)} MB groß sein.`,
  rate: 'Sie haben in kurzer Zeit mehrere Anfragen gesendet. Bitte versuchen Sie es in einigen Minuten erneut.',
  belegt: 'Gerade gehen sehr viele Anfragen ein. Bitte versuchen Sie es in einer Minute erneut.',
  zeit: 'Die Übertragung hat zu lange gedauert. Bitte versuchen Sie es mit weniger oder kleineren Fotos erneut.',
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
  const laengeKopf = request.headers.get('content-length');
  const laenge = laengeKopf === null ? null : Number(laengeKopf);
  if (laenge !== null && (!Number.isSafeInteger(laenge) || laenge < 0 || laenge > MAX_BODY)) return fehler(413, TEXT.gross);

  // Per client: every attempt counts (an attacker only exhausts its own bucket). The global budget is
  // only read before the expensive work and counted right before sending (H-1, N-1).
  const kennung = clientKennung(request, d.socketAdresse, k);
  const proClient = LIMITS.kontakt.pruefe(kennung);
  const netz = netzKennungClient(request, d.socketAdresse, k);
  const proNetz = netz === null ? proClient : LIMITS.kontaktNetz.pruefe(netz);
  if (!proClient.erlaubt || !proNetz.erlaubt) {
    protokolliere('kontakt: rate-limit');
    return fehler(429, TEXT.rate, { retryNachS: Math.max(proClient.retryNachS, proNetz.retryNachS) });
  }

  // At most 2 requests per client at a time (whole request).
  const freiClient = ANNAHME_PRO_CLIENT.belege(kennung);
  if (!freiClient) {
    protokolliere('kontakt: rate-limit parallel');
    return fehler(429, TEXT.rate, { retryNachS: 60 });
  }
  let freiArbeit: (() => void) | null = null;
  let freiVersand: (() => void) | null = null;
  try {
    // Reading the body (N-2): a slot only for the read itself. Small bodies have their own pool; large ones
    // may displace the slowest reader. Bounded by size, a deadline and a minimum rate (slowloris).
    const grenzen = { ...BODY_GRENZEN, ...d.bodyGrenzen };
    const klein = laenge !== null && laenge <= KLEIN_BODY;
    const platz = (klein ? ANNAHME_KLEIN : ANNAHME).belege(laenge ?? MAX_BODY);
    if (!platz) {
      protokolliere(`kontakt: ausgelastet annahme${klein ? ' klein' : ''}`);
      return fehler(503, TEXT.belegt, { retryNachS: 60 });
    }
    let form: FormData | undefined;
    try {
      const body = await leseBody(request, { ...grenzen, maxBytes: Math.min(MAX_BODY, laenge ?? MAX_BODY), maxDauerMs: leseFrist(laenge, grenzen) }, platz.vorgang);
      platz.frei();
      if (!body.ok) {
        protokolliere(`kontakt: body ${body.grund}`);
        if (body.grund === 'zeit') return fehler(408, TEXT.zeit);
        if (body.grund === 'zu-gross') return fehler(413, TEXT.gross);
        if (body.grund === 'verdraengt') return fehler(503, TEXT.belegt, { retryNachS: 60 });
        return fehler(400, TEXT.allgemein);
      }
      try {
        form = await formDataAus(body.daten, ct);
      } catch {
        // Broken multipart or wrong boundary.
        return fehler(400, TEXT.allgemein);
      }
    } finally {
      platz.frei();
    }
    const roh = form ? zerlege(form) : null;
    form = undefined; // photos live on in roh.dateien only, released after re-encoding
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

    // Global budget (SMTP quota): only read here; counted right before sending (N-1).
    const budget = LIMITS.kontaktGesamt.stand('gesamt');
    if (!budget.erlaubt) {
      protokolliere('kontakt: WARNUNG globales limit erreicht');
      return fehler(429, TEXT.rate, { retryNachS: budget.retryNachS });
    }

    const bilder: NeuesBild[] = [];
    if (roh.dateien.length > 0) {
      // Clients whose photos were rejected repeatedly get no more image work (N-1).
      const abgelehnt = LIMITS.fotoAbgelehnt.stand(kennung);
      if (!abgelehnt.erlaubt) {
        protokolliere('kontakt: rate-limit fotos');
        return fehler(429, TEXT.rate, { retryNachS: abgelehnt.retryNachS });
      }
      freiArbeit = await PARALLEL.warte(PARALLEL_WARTEZEIT_MS);
      if (!freiArbeit) {
        protokolliere('kontakt: ausgelastet');
        return fehler(503, TEXT.belegt, { retryNachS: 60 });
      }
      for (const [i, datei] of roh.dateien.entries()) {
        try {
          bilder.push(await kodiereNeu(Buffer.from(await datei.arrayBuffer()), i + 1));
        } catch (e) {
          const grund = e instanceof BildFehler ? e.grund : 'defekt';
          protokolliere(`kontakt: foto abgelehnt ${grund}`);
          if (grund === 'ausgelastet') return fehler(503, TEXT.belegt, { retryNachS: 60 });
          LIMITS.fotoAbgelehnt.pruefe(kennung);
          const meldung = grund === 'typ' ? MELDUNG.fotos : grund === 'zu-gross' ? MELDUNG.fotoZuGross : MELDUNG.fotoDefekt;
          return fehler(422, 'Bitte prüfen Sie Ihre Fotos.', { fehler: { fotos: meldung } });
        }
      }
      // Originals are no longer needed; the slot is not needed for sending.
      roh.dateien.length = 0;
      freiArbeit();
    }

    const an = empfaenger(d.firma, k.env.MAIL_TO_STAGING);
    if (!an) {
      protokolliere('kontakt: konfiguration anfragen_empfaenger fehlt');
      return fehler(503, TEXT.versand);
    }

    freiVersand = await VERSAND.warte(VERSAND_WARTEZEIT_MS);
    if (!freiVersand) {
      protokolliere('kontakt: ausgelastet versand');
      return fehler(503, TEXT.belegt, { retryNachS: 60 });
    }
    // Every check passed and the photos are re-encoded: only now the global budget is spent (N-1).
    const gesamt = LIMITS.kontaktGesamt.pruefe('gesamt');
    if (!gesamt.erlaubt) {
      protokolliere('kontakt: WARNUNG globales limit erreicht');
      return fehler(429, TEXT.rate, { retryNachS: gesamt.retryNachS });
    }

    const daten = v.daten;
    const kontext = { firma: d.firma, mailFrom: k.env.MAIL_FROM, empfaenger: an, anliegenTitel: d.anliegen.get(daten.anliegen) ?? (daten.anliegen === 'sonstiges' ? 'Etwas anderes' : null), eingang: jetzt() };
    try {
      await d.sende(anfrageMail(daten, bilder, kontext));
    } catch (e) {
      protokolliere(`kontakt: versand fehlgeschlagen ${smtpCode(e)}`);
      return fehler(502, TEXT.versand);
    }

    // Confirmation without any user content (L-4): at most 2 per address and day, 20 per hour overall.
    if (darfBestaetigen(k, daten.email)) {
      try {
        await d.sende(bestaetigungMail(daten.email, kontext));
      } catch (e) {
        protokolliere(`kontakt: bestaetigung fehlgeschlagen ${smtpCode(e)}`);
      }
    }
    protokolliere(`kontakt: gesendet (${bilder.length} fotos)`);
    return { status: 200, ok: true };
  } finally {
    freiVersand?.();
    freiArbeit?.();
    freiClient();
  }
}

/** Per-address limit first, so a blocked address does not use up the global confirmation budget. */
export function darfBestaetigen(k: Pick<ApiKontext, 'mailKey'>, email: string): boolean {
  if (!LIMITS.bestaetigung.pruefe(hmacB64(k.mailKey, email.toLowerCase()).slice(0, 22)).erlaubt) return false;
  if (LIMITS.bestaetigungGesamt.pruefe('gesamt').erlaubt) return true;
  protokolliere('kontakt: bestaetigung globales limit');
  return false;
}

/** Only the error code (e.g. ECONNECTION, EAUTH); messages may contain addresses. */
function smtpCode(e: unknown): string {
  const code = (e as { code?: unknown } | null)?.code;
  return typeof code === 'string' && /^[A-Z0-9_]{2,20}$/.test(code) ? code : 'unbekannt';
}
