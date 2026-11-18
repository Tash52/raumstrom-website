import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';

const EXPECTED_HEADERS: Record<string, string | RegExp> = {
  'strict-transport-security': 'max-age=63072000; includeSubDomains',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': /camera=\(\).*geolocation=\(\).*microphone=\(\).*payment=\(\)/,
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
  'content-security-policy': /default-src 'self'/,
};

function directives(csp: string) {
  return new Map(
    csp
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [name, ...values] = d.split(/\s+/);
        return [name!, values] as const;
      }),
  );
}

test('Startseite liefert 200 und alle Security-Header', async ({ request }) => {
  const res = await request.get('/');
  expect(res.status()).toBe(200);
  const headers = res.headers();
  for (const [name, expected] of Object.entries(EXPECTED_HEADERS)) {
    expect(headers[name], name).toBeDefined();
    if (typeof expected === 'string') expect(headers[name], name).toBe(expected);
    else expect(headers[name], name).toMatch(expected);
  }
});

test('CSP ist streng: Hashes statt unsafe-inline, keine fremden Hosts', async ({ request }) => {
  for (const path of ['/', '/gibt-es-nicht/', '/_astro/', '/healthz']) {
    const csp = (await request.get(path)).headers()['content-security-policy'];
    expect(csp, path).toBeTruthy();
    expect(csp, path).not.toMatch(/'unsafe-inline'|'unsafe-eval'|\*|https?:|data:/);
    const d = directives(csp!);
    expect(d.get('frame-ancestors'), path).toEqual(["'none'"]);
    expect(d.get('object-src'), path).toEqual(["'none'"]);
    expect(d.get('base-uri'), path).toEqual(["'self'"]);
    expect(d.get('form-action'), path).toEqual(["'self'"]);
    expect(d.has('upgrade-insecure-requests'), path).toBe(true);
    for (const v of [...(d.get('script-src') ?? []), ...(d.get('style-src') ?? [])]) {
      expect(v, path).toMatch(/^'self'$|^'sha(256|384|512)-[A-Za-z0-9+/=]+'$/);
    }
  }
});

test('HTML enthält kein style-Attribut und kein Inline-Event-Handler', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).not.toMatch(/\sstyle=/i);
  expect(html).not.toMatch(/\son[a-z]+=/i);
});

for (const path of ['/keystatic', '/keystatic/', '/keystatic/singleton/firma', '/api/keystatic', '/api/keystatic/tree']) {
  test(`${path} liefert im Produktions-Build 404`, async ({ request }) => {
    for (const method of ['GET', 'POST'] as const) {
      const res = await request.fetch(path, { method, maxRedirects: 0 });
      expect(res.status(), `${method} ${path}`).toBe(404);
    }
  });
}

test('Unbekannte Seiten und Pfad-Tricks liefern 404 mit Headern', async ({ request }) => {
  for (const path of ['/gibt-es-nicht/', '/..%2f..%2fpackage.json', '/%2e%2e/%2e%2e/etc/passwd', '/.env', '/_headers.json']) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(404);
    expect(res.headers()['x-content-type-options'], path).toBe('nosniff');
  }
});

test('Produktions-Build enthält Keystatic nicht', () => {
  const files = (readdirSync('dist', { recursive: true }) as string[]).filter((f) => /\.(m?js|html|json)$/.test(f));
  expect(files.length).toBeGreaterThan(0);
  const hits = files.filter((f) => /keystatic/i.test(f) || /@keystatic|\/keystatic\//.test(readFileSync(path.join('dist', f), 'utf8')));
  expect(hits).toEqual([]);
});

async function collectLinks(page: Page, origin: string) {
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).href));
  return hrefs
    .map((h) => new URL(h))
    .filter((u) => u.origin === origin)
    .map((u) => u.pathname);
}

test('0 Requests an fremde Domains, keine Konsolenfehler (Crawl ab Startseite)', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin;
  const foreign: string[] = [];
  const errors: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (u.protocol !== 'data:' && u.protocol !== 'blob:' && u.origin !== origin) foreign.push(r.url());
  });
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));

  const queue = ['/'];
  const seen = new Set<string>();
  while (queue.length && seen.size < 60) {
    const path = queue.shift()!;
    if (seen.has(path)) continue;
    seen.add(path);
    const res = await page.goto(path, { waitUntil: 'networkidle' });
    expect(res?.status(), path).toBeLessThan(400);
    for (const link of await collectLinks(page, origin)) if (!seen.has(link)) queue.push(link);
  }
  expect(foreign).toEqual([]);
  expect(errors).toEqual([]);
});

test('Nur GET/HEAD auf statische Seiten', async ({ request }) => {
  const res = await request.post('/', { data: 'x' });
  expect(res.status()).toBe(405);
});

test('Origin-Check: Browser ohne Sec-Fetch-Site werden nicht von Astro abgewiesen (allowedDomains)', async ({ request, baseURL }) => {
  const res = await request.post('/api/contact', {
    headers: { Origin: new URL(baseURL!).origin, 'Content-Type': 'application/x-www-form-urlencoded' },
    data: 'name=x',
    maxRedirects: 0,
  });
  expect(res.status()).not.toBe(403);
  expect(await res.text()).not.toMatch(/Cross-site/i);
});

test('Origin-Check: fremde Origin wird abgewiesen', async ({ request }) => {
  const res = await request.post('/api/contact', {
    headers: { Origin: 'https://evil.example', 'Content-Type': 'application/x-www-form-urlencoded' },
    data: 'name=x',
    maxRedirects: 0,
  });
  expect(res.status()).toBe(403);
});
