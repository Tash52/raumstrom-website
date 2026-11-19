// Request helpers that depend on Astro's context.
import { isIP } from 'node:net';
import type { APIContext } from 'astro';

/**
 * Header with the socket peer address. server/server.mjs always overwrites it (client values are
 * removed) before Astro sees the request. Astro's `clientAddress` is NOT used: it takes the first
 * X-Forwarded-For entry, which the client controls (SECURITY-REPORT M-1).
 */
export const CLIENT_IP_HEADER = 'x-raumstrom-client-ip';

let fehltGemeldet = false;

/**
 * Socket peer address from CLIENT_IP_HEADER; undefined if missing or not a single valid IP.
 * Callers then fall back to one shared bucket ("unbekannt"), which is conservative: it never lets a
 * client pick its own rate-limit key.
 */
export function socketAdresse(context: Pick<APIContext, 'request'>): string | undefined {
  const wert = context.request.headers.get(CLIENT_IP_HEADER)?.trim();
  if (wert && isIP(wert)) return wert;
  if (!fehltGemeldet) {
    fehltGemeldet = true;
    // Event name only, never the header value.
    console.warn(`[api] ${CLIENT_IP_HEADER} fehlt oder ungültig: gemeinsames Rate-Limit für alle Clients`);
  }
  return undefined;
}
