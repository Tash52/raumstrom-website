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
 * (one subscriber usually owns a whole /64; /48 for the coarser network limit). IPv4-mapped IPv6 becomes IPv4.
 */
export function netzKennung(ip: string, praefix: 64 | 48 = 64): string {
  let a = ip.trim();
  if (a.startsWith('::ffff:') && isIP(a.slice(7)) === 4) a = a.slice(7);
  if (isIP(a) === 4) return a;
  if (isIP(a) !== 6) return 'unbekannt';
  const [kopf = '', rest] = a.toLowerCase().split('::') as [string, string | undefined];
  const links = kopf ? kopf.split(':') : [];
  const rechts = rest ? rest.split(':') : [];
  const fehlend = rest === undefined ? 0 : 8 - links.length - rechts.length;
  const gruppen = [...links, ...Array(Math.max(0, fehlend)).fill('0'), ...rechts];
  return `${gruppen.slice(0, praefix / 16).map((g) => g.padStart(4, '0')).join(':')}::/${praefix}`;
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

/**
 * Keyed hash of the IPv6 /48 (null for IPv4 and unknown): one site usually owns a /48, so many /64
 * buckets from one /56 or /48 share an additional, more generous limit (SECURITY-REPORT N-1/N-2).
 */
export function netzSchluessel48(key: Buffer, adresse: string): string | null {
  const n = netzKennung(adresse, 48);
  return n.endsWith('::/48') ? hmacB64(key, `48:${n}`).slice(0, 22) : null;
}
