// Proxy headers and client address for /api/* (Security-Report Phase 2, M-1).
// Astro takes `clientAddress`, protocol and host from X-Forwarded-* as soon as the Host header
// matches `security.allowedDomains`, regardless of whether a proxy is in front. The server therefore
// removes these headers unless TRUST_PROXY=true and always sets its own client-address header,
// overwriting anything the client sent under that name. API routes read only that header.
import { isIP } from 'node:net';

/** Header the server always sets for Astro: the client address it trusts. */
export const CLIENT_IP_HEADER = 'x-raumstrom-client-ip';

/** Node lowercases header names; Forwarded (RFC 7239) and every X-Forwarded-* variant. */
function isProxyHeader(name) {
  return name === 'forwarded' || name.startsWith('x-forwarded-');
}

/** "::ffff:203.0.113.7" -> "203.0.113.7" (IPv4 clients on a dual-stack socket). */
export function normalizeIp(ip) {
  if (typeof ip !== 'string') return undefined;
  const v = ip.trim();
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(v);
  if (mapped && isIP(mapped[1]) === 4) return mapped[1];
  return isIP(v) ? v.toLowerCase() : undefined;
}

/**
 * Client address: the socket peer, or with TRUST_PROXY the last X-Forwarded-For entry
 * (appended by our own proxy; earlier entries are client-controlled). Falls back to the socket.
 * @param {import('node:http').IncomingMessage} req
 * @param {boolean} trustProxy
 */
export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const raw = req.headers['x-forwarded-for'];
    const xff = Array.isArray(raw) ? raw.join(',') : raw;
    const last = xff?.split(',').map((s) => s.trim()).filter(Boolean).at(-1);
    const ip = normalizeIp(last);
    if (ip) return ip;
  }
  return normalizeIp(req.socket?.remoteAddress) ?? 'unbekannt';
}

/**
 * Prepares the Node request before Astro builds its Request from it (mutates req.headers).
 * @param {import('node:http').IncomingMessage} req
 * @param {{ trustProxy: boolean }} options
 */
export function prepareProxyHeaders(req, { trustProxy }) {
  const ip = clientIp(req, trustProxy);
  for (const name of Object.keys(req.headers)) {
    if (name === CLIENT_IP_HEADER || (!trustProxy && isProxyHeader(name))) delete req.headers[name];
  }
  req.headers[CLIENT_IP_HEADER] = ip;
  return ip;
}
