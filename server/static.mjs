// Minimal, safe static file serving for dist/client plus per-page CSP lookup.
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { finalizePolicy } from './csp.mjs';

export const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.glb': 'model/gltf-binary',
  '.ktx2': 'image/ktx2',
  '.hdr': 'application/octet-stream',
  '.pdf': 'application/pdf',
  '.webmanifest': 'application/manifest+json',
};

/** "/kontakt/", "/kontakt/index.html", "/kontakt" -> "/kontakt"; "/" stays "/". */
export function routeKey(pathname) {
  let p = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

/** Reads Astro's dist/_headers.json (staticHeaders) into Map<routeKey, csp>. */
export function loadPagePolicies(headersFile) {
  const map = new Map();
  if (!existsSync(headersFile)) return map;
  for (const entry of JSON.parse(readFileSync(headersFile, 'utf8'))) {
    const csp = entry.headers.find((h) => h.key.toLowerCase() === 'content-security-policy');
    if (csp) map.set(routeKey(entry.pathname), finalizePolicy(csp.value));
  }
  return map;
}

/**
 * Maps a URL pathname to a file below root. Returns
 *   { file } | { redirect } | { notFound: true }
 * Never resolves outside root, never serves dotfiles (except /.well-known/).
 */
export function resolveStatic(root, rawPathname) {
  // Encoded slashes/backslashes never name a file; decoding them would build "//host/" redirects (L-1).
  if (/%(2f|5c)/i.test(rawPathname)) return { notFound: true };
  let pathname;
  try {
    pathname = decodeURIComponent(rawPathname);
  } catch {
    return { notFound: true };
  }
  if (pathname.includes('\0') || pathname.includes('\\')) return { notFound: true };
  const segments = pathname.split('/').filter(Boolean);
  if (segments.some((s) => s === '..' || (s.startsWith('.') && s !== '.well-known'))) return { notFound: true };
  // Precompressed variants are served via Accept-Encoding only, never by name.
  if (PRECOMPRESSED.some((v) => pathname.endsWith(v.ext))) return { notFound: true };

  const base = path.resolve(root);
  const target = path.resolve(base, ...segments);
  if (target !== base && !target.startsWith(base + path.sep)) return { notFound: true };

  const stat = safeStat(target);
  if (stat?.isDirectory()) {
    // Rebuilt from the segments: always exactly one leading slash, never protocol-relative.
    if (!pathname.endsWith('/')) return { redirect: `/${segments.map(encodeURIComponent).join('/')}/` };
    const index = path.join(target, 'index.html');
    return safeStat(index)?.isFile() ? { file: index } : { notFound: true };
  }
  if (stat?.isFile() && !pathname.endsWith('/')) return { file: target };
  return { notFound: true };
}

function safeStat(p) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

export function contentType(file) {
  return MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
}

/** File types the build precompresses (scripts/lib/precompress.mjs) and the server negotiates. */
export const COMPRESSIBLE = ['.html', '.css', '.js', '.mjs', '.json', '.svg', '.xml', '.txt'];
/** Preferred first. */
export const PRECOMPRESSED = [
  { ext: '.br', encoding: 'br' },
  { ext: '.gz', encoding: 'gzip' },
];

/** Encodings the client accepts (RFC 9110 12.5.3: q=0 excludes, "*" covers unlisted codings). */
export function acceptedEncodings(header) {
  const listed = new Map();
  for (const part of String(header ?? '').split(',')) {
    const [name = '', ...params] = part.trim().toLowerCase().split(';');
    if (!name.trim()) continue;
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const value = q ? Number(q.slice(2)) : 1;
    listed.set(name.trim(), Number.isFinite(value) ? value : 0);
  }
  const ok = (enc) => (listed.has(enc) ? listed.get(enc) > 0 : (listed.get('*') ?? 0) > 0);
  return new Set(PRECOMPRESSED.map((v) => v.encoding).filter(ok));
}

/** Picks the precompressed sibling for this request, if any (must not be older than the original). */
function pickVariant(req, file, stat) {
  if (!COMPRESSIBLE.includes(path.extname(file).toLowerCase())) return null;
  const accepted = acceptedEncodings(req.headers['accept-encoding']);
  for (const v of PRECOMPRESSED) {
    if (!accepted.has(v.encoding)) continue;
    const s = safeStat(file + v.ext);
    if (s?.isFile() && s.mtimeMs >= stat.mtimeMs) return { file: file + v.ext, stat: s, encoding: v.encoding };
  }
  return null;
}

function etagMatches(header, etag) {
  if (typeof header !== 'string') return false;
  return header.split(',').some((t) => t.trim() === etag || t.trim() === '*');
}

/**
 * Streams a file with caching headers; handles HEAD and If-None-Match. Text files go out as the
 * precompressed .br/.gz sibling when Accept-Encoding allows it (own ETag, Vary: Accept-Encoding).
 */
export function sendFile(req, res, file, status = 200) {
  const original = statSync(file);
  const variant = pickVariant(req, file, original);
  const stat = variant?.stat ?? original;
  const suffix = variant ? `-${variant.encoding}` : '';
  const etag = `W/"${stat.size.toString(16)}-${Math.floor(original.mtimeMs).toString(16)}${suffix}"`;
  const rel = file.split(path.sep).join('/');
  const cache = rel.includes('/_astro/')
    ? 'public, max-age=31536000, immutable'
    : rel.endsWith('.html')
      ? 'no-cache'
      : 'public, max-age=3600';
  res.setHeader('Content-Type', contentType(file));
  res.setHeader('Cache-Control', cache);
  if (COMPRESSIBLE.includes(path.extname(file).toLowerCase())) res.setHeader('Vary', 'Accept-Encoding');
  if (variant) res.setHeader('Content-Encoding', variant.encoding);
  if (status === 200) {
    res.setHeader('ETag', etag);
    if (etagMatches(req.headers['if-none-match'], etag)) {
      res.statusCode = 304;
      res.end();
      return;
    }
  }
  res.statusCode = status;
  res.setHeader('Content-Length', stat.size);
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(variant?.file ?? file).pipe(res);
}
