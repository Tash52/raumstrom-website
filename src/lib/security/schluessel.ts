// Derived keys and pseudonymous client keys. IP addresses are only used to compute a keyed hash for
// the in-memory rate limit; they are never logged, stored in clear text or put into mails.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { isIP } from 'node:net';

/** Purpose-bound sub key, so one env secret never signs two kinds of data. */
export function ableiten(secret: string, zweck: string): Buffer {
  return createHmac('sha256', secret).update(`raumstrom:${zweck}`).digest();
}

export function hmacB64(key: Buffer, data: string): string {
  return createHmac('sha256', key).update(data).digest('base64url');
}

export function gleich(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/**
 * Normalises a client address for rate limiting: IPv4 as is, IPv6 reduced to its /64 prefix
 * (one subscriber usually owns a whole /64). IPv4-mapped IPv6 becomes IPv4.
 */
export function netzKennung(ip: string): string {
  let a = ip.trim();
  if (a.startsWith('::ffff:') && isIP(a.slice(7)) === 4) a = a.slice(7);
  if (isIP(a) === 4) return a;
  if (isIP(a) !== 6) return 'unbekannt';
  const [kopf = '', rest] = a.toLowerCase().split('::') as [string, string | undefined];
  const links = kopf ? kopf.split(':') : [];
  const rechts = rest ? rest.split(':') : [];
  const fehlend = rest === undefined ? 0 : 8 - links.length - rechts.length;
  const gruppen = [...links, ...Array(Math.max(0, fehlend)).fill('0'), ...rechts];
  return `${gruppen.slice(0, 4).map((g) => g.padStart(4, '0')).join(':')}::/64`;
}

/**
 * Client address: the socket peer, or with TRUST_PROXY the last X-Forwarded-For entry
 * (the one our own reverse proxy appended; earlier entries are client-controlled).
 */
export function clientAdresse(request: Request, socketAdresse: string | undefined, trustProxy: boolean): string {
  if (trustProxy) {
    const xff = request.headers.get('x-forwarded-for');
    const letzte = xff?.split(',').map((s) => s.trim()).filter(Boolean).at(-1);
    if (letzte && isIP(letzte)) return letzte;
  }
  return socketAdresse ?? 'unbekannt';
}

/** Keyed, truncated hash of the client network; cannot be reversed without the secret. */
export function clientSchluessel(key: Buffer, adresse: string): string {
  return hmacB64(key, netzKennung(adresse)).slice(0, 22);
}
