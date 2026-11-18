// Shared building blocks for the API routes: configuration, in-memory limits, responses.
// Responses never contain internals; logs contain only event names, never personal data or IPs.
import { getServerEnv } from '../../../server/env.mjs';
import { altchaSchluessel, type AltchaSchluessel } from './altcha.ts';
import { ableiten, clientAdresse, clientSchluessel } from './schluessel.ts';
import { EinmalSpeicher, Parallelitaet, RateLimiter, type LimitErgebnis } from './speicher.ts';

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
/** Limits per client network (keyed hash). Values: see docs/agent-reports/2-backend-api.md. */
export const LIMITS = {
  kontakt: new RateLimiter(5, 15 * MIN),
  kontaktGesamt: new RateLimiter(60, 60 * MIN),
  csrf: new RateLimiter(30, 10 * MIN),
  altcha: new RateLimiter(30, 10 * MIN),
  /**
   * Confirmation mails per recipient address (hash), against mail bombing third parties.
   * 23 h so that the hash is deleted within 24 h (window + cleanup interval, see speicher.ts).
   */
  bestaetigung: new RateLimiter(2, 23 * 60 * MIN),
};
export const EINMAL = new EinmalSpeicher();
export const PARALLEL = new Parallelitaet(4);

export function begrenze(limiter: RateLimiter, request: Request, socketAdresse: string | undefined, k: ApiKontext): LimitErgebnis {
  return limiter.pruefe(clientSchluessel(k.clientKey, clientAdresse(request, socketAdresse, k.env.TRUST_PROXY)));
}

export const KEIN_CACHE = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } as const;

export function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...KEIN_CACHE, ...extra },
  });
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
