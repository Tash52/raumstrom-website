// Public origin of the website: firma.yaml `domain`, overridable at build time with SITE_URL
// (e.g. a staging host). Used by astro.config.mjs (site, security.allowedDomains) and the launch check.

/**
 * @param {{ domain: string, siteUrl?: string, staging?: boolean }} opts
 * @returns {{ site: string, hostname: string, allowedDomains: Array<{ hostname: string, protocol?: string }>, problems: string[] }}
 */
export function siteConfig({ domain, siteUrl, staging = false }) {
  const problems = [];
  let url;
  try {
    url = new URL(siteUrl || `https://${domain}`);
  } catch {
    problems.push(`SITE_URL ist keine gültige URL`);
    url = new URL(`https://${domain}`);
  }
  if (url.protocol !== 'https:') problems.push(`SITE_URL muss https verwenden (ist ${url.protocol})`);
  if (url.pathname !== '/' || url.search || url.hash) problems.push('SITE_URL darf nur aus Protokoll und Host bestehen');
  if (/^(localhost|127\.|\[::1\])/.test(url.hostname)) problems.push('Domain zeigt auf localhost');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(url.hostname)) problems.push(`Domain "${url.hostname}" ist ungültig`);

  // Astro trusts Host/X-Forwarded-Host only for these patterns (otherwise it uses "localhost"
  // and the origin check rejects browsers without Sec-Fetch-Site, e.g. Safari < 16.4).
  const hosts = new Set([url.hostname]);
  if (url.hostname === domain) hosts.add(`www.${domain}`);
  const allowedDomains = [...hosts].map((hostname) => ({ hostname, protocol: 'https' }));
  // Staging/E2E builds are served on the local machine over http.
  if (staging) allowedDomains.push({ hostname: 'localhost' }, { hostname: '127.0.0.1' });

  return { site: url.origin, hostname: url.hostname, allowedDomains, problems };
}
