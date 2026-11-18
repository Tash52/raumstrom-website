// Same-origin check for state-changing requests (in addition to Astro's security.checkOrigin).
// Browsers always send Origin on POST and, in current versions, Sec-Fetch-Site. A cross-site form or
// fetch carries the attacker's Origin while Host stays ours, so comparing both is sufficient and needs
// no configuration (TLS terminates at the proxy, so only host and port are compared, not the scheme).

export interface HerkunftOptionen {
  trustProxy: boolean;
  /** Extra allowed origins, e.g. https://raumstrom.de (from firma.domain). */
  erlaubt?: string[];
}

export function istGleicherUrsprung(request: Request, { trustProxy, erlaubt = [] }: HerkunftOptionen): boolean {
  const site = request.headers.get('sec-fetch-site');
  if (site !== null && site !== 'same-origin') return false;
  const origin = request.headers.get('origin');
  if (!origin || origin === 'null') return false;
  let o: URL;
  try {
    o = new URL(origin);
  } catch {
    return false;
  }
  if (o.protocol !== 'https:' && o.protocol !== 'http:') return false;
  if (erlaubt.includes(o.origin)) return true;
  const host = (trustProxy && request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()) || request.headers.get('host');
  if (!host) return false;
  return o.host.toLowerCase() === host.toLowerCase();
}
