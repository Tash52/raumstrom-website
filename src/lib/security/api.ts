// Shared building blocks for the API routes: configuration, in-memory limits, responses.
// Responses never contain internals; logs contain only event names, never personal data or IPs.
import { getServerEnv } from '../../../server/env.mjs';
import { LIMITS as FORM_LIMITS } from '../../components/forms/kontakt-schnittstelle.ts';
import { altchaSchluessel, type AltchaSchluessel } from './altcha.ts';
import { BODY_GRENZEN } from './body.ts';
import { ableiten, clientAdresse, clientSchluessel, netzSchluessel48 } from './schluessel.ts';
import { Annahme, EinmalSpeicher, Parallelitaet, RateLimiter, SchluesselParallelitaet, type LimitErgebnis } from './speicher.ts';

export interface ApiEnv {
  TRUST_PROXY: boolean;
  ALTCHA_HMAC_KEY: string;
  CSRF_SECRET: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
  MAIL_FROM: string;
  MAIL_TO_STAGING?: string;
}

export interface ApiKontext {
  env: ApiEnv;
  csrfKey: Buffer;
  clientKey: Buffer;
  mailKey: Buffer;
  altcha: AltchaSchluessel;
}

let kontext: ApiKontext | undefined;
/** Throws (-> generic 500) if the configuration is incomplete; the server does not start without it anyway. */
export function apiKontext(): ApiKontext {
  if (kontext) return kontext;
  const env = getServerEnv() as ApiEnv;
  kontext = {
    env,
    csrfKey: ableiten(env.CSRF_SECRET, 'csrf'),
    clientKey: ableiten(env.CSRF_SECRET, 'client'),
    mailKey: ableiten(env.CSRF_SECRET, 'mail'),
    altcha: altchaSchluessel(env.ALTCHA_HMAC_KEY),
  };
  return kontext;
}

const MIN = 60_000;
/**
 * Limits. Values and reasoning: docs/agent-reports/2-backend-api.md and 2-backend-api-fixes.md.
 * Only `kontakt`/`kontaktNetz` (per client) count every attempt. `kontaktGesamt` protects the SMTP quota:
 * it is only read before the expensive work and counted immediately before a mail is sent (N-1), so
 * neither rejected requests (H-1) nor rejected photos can use it up.
 */
export const LIMITS = {
  kontakt: new RateLimiter(5, 15 * MIN),
  /** IPv6 only: all /64 buckets of one /48 together (N-1/N-2: a /56 holds 256 /64 buckets). */
  kontaktNetz: new RateLimiter(20, 15 * MIN),
  kontaktGesamt: new RateLimiter(60, 60 * MIN),
  /** Rejected photo uploads per client (N-1): after 3 per hour, requests with photos get 429 before any work. */
  fotoAbgelehnt: new RateLimiter(3, 60 * MIN),
  csrf: new RateLimiter(30, 10 * MIN),
  altcha: new RateLimiter(30, 10 * MIN),
  /**
   * Confirmation mails per recipient address (hash), against mail bombing third parties.
   * 23 h so that the hash is deleted within 24 h (window + cleanup interval, see speicher.ts).
   */
  bestaetigung: new RateLimiter(2, 23 * 60 * MIN),
  /** All confirmation mails together (L-4): caps backscatter to third-party addresses. */
  bestaetigungGesamt: new RateLimiter(20, 60 * MIN),
};
export const EINMAL = new EinmalSpeicher();

/** Server body limit (astro.config.mjs bodySizeLimit is 25 MB); a bit of room for multipart overhead. */
export const MAX_BODY = FORM_LIMITS.maxGesamtBytes + 2 * 1024 * 1024;
/** Bodies up to this size (text fields, reserved sketch ≤ 200 KB, no or tiny photos) use their own pool. */
export const KLEIN_BODY = 256 * 1024;
/**
 * Admission for reading bodies (N-2). Slots are held only while reading, never during image work or SMTP.
 * Small bodies have their own pool, so uploads can never block plain enquiries. Large bodies: at most
 * 16 at a time and 8 x MAX_BODY reserved; when full, the slowest reader under 256 KB/s is displaced.
 */
export const ANNAHME_KLEIN = new Annahme({ maxSlots: 64, maxBytes: 64 * KLEIN_BODY, schonfristMs: BODY_GRENZEN.schonfristMs, verdraengenUnterBytesProS: 0 });
export const ANNAHME = new Annahme({ maxSlots: 16, maxBytes: 8 * MAX_BODY, schonfristMs: BODY_GRENZEN.schonfristMs, verdraengenUnterBytesProS: 256 * 1024 });
/** Per client at most 2 requests at a time (whole request). */
export const ANNAHME_PRO_CLIENT = new SchluesselParallelitaet(2);
/**
 * Requests with photos, from the first image to the last (raw bodies stay in memory meanwhile). Images
 * themselves run one at a time (BILD_SLOT in uploads/bild.ts). Requests without photos never wait here.
 */
export const PARALLEL = new Parallelitaet(3, 6);
export const PARALLEL_WARTEZEIT_MS = 30_000;
/** SMTP sending (enquiry + confirmation). */
export const VERSAND = new Parallelitaet(4, 16);
export const VERSAND_WARTEZEIT_MS = 20_000;

/** Pseudonymous rate-limit key of the client (keyed hash of its network). */
export function clientKennung(request: Request, socketAdresse: string | undefined, k: ApiKontext): string {
  return clientSchluessel(k.clientKey, clientAdresse(request, socketAdresse, k.env.TRUST_PROXY));
}

/** Additional key of the client's IPv6 /48; null for IPv4. */
export function netzKennungClient(request: Request, socketAdresse: string | undefined, k: ApiKontext): string | null {
  return netzSchluessel48(k.clientKey, clientAdresse(request, socketAdresse, k.env.TRUST_PROXY));
}

export function begrenze(limiter: RateLimiter, request: Request, socketAdresse: string | undefined, k: ApiKontext): LimitErgebnis {
  return limiter.pruefe(clientKennung(request, socketAdresse, k));
}

export const KEIN_CACHE = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } as const;

export function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...KEIN_CACHE, ...extra },
  });
}

/** HEAD: same status and headers as GET would have, no body and no side effects (I-7). */
export function kopfAntwort(limit: LimitErgebnis): Response {
  const r = limit.erlaubt ? json(200, {}) : json(429, {}, { 'Retry-After': String(limit.retryNachS) });
  return new Response(null, { status: r.status, headers: r.headers });
}

export function methodeNichtErlaubt(erlaubt: string): Response {
  return json(405, { ok: false, nachricht: 'Methode nicht erlaubt.' }, { Allow: erlaubt });
}

/** fetch() from the form script asks for JSON; a native form POST (no JS) gets a 303 redirect. */
export function willJson(request: Request): boolean {
  return /\bapplication\/json\b/i.test(request.headers.get('accept') ?? '');
}

export function protokolliere(ereignis: string): void {
  // Event names only (e.g. "kontakt: abgelehnt altcha"); never personal data, tokens or addresses.
  console.info(`[api] ${ereignis}`);
}
