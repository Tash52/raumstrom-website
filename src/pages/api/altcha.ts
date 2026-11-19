// GET /api/altcha -> ALTCHA challenge (v2 format) for the self-hosted widget. No third party involved.
import type { APIRoute } from 'astro';
import { erzeugeChallenge } from '../../lib/security/altcha.ts';
import { socketAdresse } from '../../lib/security/anfrage.ts';
import { apiKontext, clientKennung, begrenze, json, kopfAntwort, LIMITS, methodeNichtErlaubt, protokolliere } from '../../lib/security/api.ts';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const k = apiKontext();
  const limit = begrenze(LIMITS.altcha, context.request, socketAdresse(context), k);
  if (!limit.erlaubt) {
    protokolliere('altcha: rate-limit');
    return json(429, { ok: false, nachricht: 'Zu viele Anfragen. Bitte versuchen Sie es in einigen Minuten erneut.' }, { 'Retry-After': String(limit.retryNachS) });
  }
  return json(200, await erzeugeChallenge(k.altcha));
};

/** HEAD (I-7): status and headers like GET, no body; neither creates a challenge nor counts against the limit. */
export const HEAD: APIRoute = (context) => kopfAntwort(LIMITS.altcha.stand(clientKennung(context.request, socketAdresse(context), apiKontext())));

export const ALL: APIRoute = () => methodeNichtErlaubt('GET, HEAD');
