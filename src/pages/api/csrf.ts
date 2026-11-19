// GET /api/csrf -> { token } (no cookie). Signed, single-use, valid for 2 hours. See src/lib/security/csrf.ts.
import type { APIRoute } from 'astro';
import { apiKontext, clientKennung, begrenze, json, kopfAntwort, LIMITS, methodeNichtErlaubt, protokolliere } from '../../lib/security/api.ts';
import { erzeugeCsrfToken } from '../../lib/security/csrf.ts';
import { socketAdresse } from '../../lib/security/anfrage.ts';

export const prerender = false;

export const GET: APIRoute = (context) => {
  const k = apiKontext();
  const limit = begrenze(LIMITS.csrf, context.request, socketAdresse(context), k);
  if (!limit.erlaubt) {
    protokolliere('csrf: rate-limit');
    return json(429, { ok: false, nachricht: 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.' }, { 'Retry-After': String(limit.retryNachS) });
  }
  return json(200, { token: erzeugeCsrfToken(k.csrfKey) });
};

/** HEAD (I-7): status and headers like GET, no body; neither creates a token nor counts against the limit. */
export const HEAD: APIRoute = (context) => kopfAntwort(LIMITS.csrf.stand(clientKennung(context.request, socketAdresse(context), apiKontext())));

export const ALL: APIRoute = () => methodeNichtErlaubt('GET, HEAD');
