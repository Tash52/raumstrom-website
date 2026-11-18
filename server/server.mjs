// Production server: security headers for every response, static files from
// dist/client, Astro (Node adapter, middleware mode) only for /api/*.
// Start: npm start (after npm run build). Refuses to start without required secrets.
import http from 'node:http';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseEnv } from './env.mjs';
import { applySecurityHeaders } from './headers.mjs';
import { loadPagePolicies, resolveStatic, routeKey, sendFile } from './static.mjs';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const DIST = process.env.RAUMSTROM_DIST ? path.resolve(process.env.RAUMSTROM_DIST) : path.join(ROOT, 'dist');
const CLIENT = path.join(DIST, 'client');

const parsed = parseEnv();
if (!parsed.ok) {
  console.error('Start abgebrochen (fail-secure). Fehlende oder ungültige Umgebungsvariablen:');
  for (const p of parsed.problems) console.error(`  - ${p}`);
  console.error('Siehe .env.example.');
  process.exit(1);
}
const { HOST, PORT } = parsed.env;

if (!existsSync(path.join(CLIENT, 'index.html'))) {
  console.error(`Kein Build gefunden unter ${CLIENT}. Zuerst npm run build ausführen.`);
  process.exit(1);
}

const policies = loadPagePolicies(path.join(DIST, '_headers.json'));
const NOT_FOUND = path.join(CLIENT, '404.html');
const entry = path.join(DIST, 'server', 'entry.mjs');
const astroHandler = existsSync(entry) ? (await import(pathToFileURL(entry).href)).handler : null;

function policyFor(pathname) {
  return policies.get(routeKey(pathname));
}

function notFound(req, res) {
  applySecurityHeaders(res, policyFor('/404'));
  if (existsSync(NOT_FOUND)) return sendFile(req, res, NOT_FOUND, 404);
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end('Nicht gefunden');
}

function plain(res, status, body, extra = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(extra)) res.setHeader(k, v);
  res.end(body);
}

async function handle(req, res) {
  applySecurityHeaders(res);
  let url;
  try {
    url = new URL(req.url ?? '/', 'http://localhost');
  } catch {
    return plain(res, 400, 'Ungültige Anfrage');
  }
  const { pathname } = url;

  if (pathname === '/healthz') return plain(res, 200, 'ok');

  // Keystatic never exists in production builds; answer before anything else.
  if (/^\/(api\/)?keystatic(\/|$)/.test(pathname)) return notFound(req, res);

  if (pathname.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store');
    if (!astroHandler) return notFound(req, res);
    return astroHandler(req, res, () => notFound(req, res));
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return plain(res, 405, 'Methode nicht erlaubt', { Allow: 'GET, HEAD' });
  }

  const resolved = resolveStatic(CLIENT, pathname);
  if (resolved.redirect) {
    res.statusCode = 308;
    res.setHeader('Location', resolved.redirect + url.search);
    return res.end();
  }
  if (resolved.notFound) return notFound(req, res);
  if (resolved.file.endsWith('.html')) applySecurityHeaders(res, policyFor(pathname));
  return sendFile(req, res, resolved.file);
}

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error('Interner Fehler:', err instanceof Error ? err.message : 'unbekannt');
    if (!res.headersSent) plain(res, 500, 'Interner Fehler');
    else res.destroy();
  });
});
server.headersTimeout = 10_000;
server.requestTimeout = 60_000;
server.keepAliveTimeout = 5_000;
server.maxHeadersCount = 100;

server.listen(PORT, HOST, () => {
  console.log(`RAUMSTROM läuft auf http://${HOST}:${PORT}`);
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
