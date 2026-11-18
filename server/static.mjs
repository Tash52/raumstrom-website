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
  let pathname;
  try {
    pathname = decodeURIComponent(rawPathname);
  } catch {
    return { notFound: true };
  }
  if (pathname.includes('\0') || pathname.includes('\\')) return { notFound: true };
  const segments = pathname.split('/').filter(Boolean);
  if (segments.some((s) => s === '..' || (s.startsWith('.') && s !== '.well-known'))) return { notFound: true };

  const base = path.resolve(root);
  const target = path.resolve(base, ...segments);
  if (target !== base && !target.startsWith(base + path.sep)) return { notFound: true };

  const stat = safeStat(target);
  if (stat?.isDirectory()) {
    if (!pathname.endsWith('/')) return { redirect: `${pathname}/` };
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

/** Streams a file with caching headers; handles HEAD and If-None-Match. */
export function sendFile(req, res, file, status = 200) {
  const stat = statSync(file);
  const etag = `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const rel = file.split(path.sep).join('/');
  const cache = rel.includes('/_astro/')
    ? 'public, max-age=31536000, immutable'
    : rel.endsWith('.html')
      ? 'no-cache'
      : 'public, max-age=3600';
  res.setHeader('Content-Type', contentType(file));
  res.setHeader('Cache-Control', cache);
  if (status === 200) {
    res.setHeader('ETag', etag);
    if (req.headers['if-none-match'] === etag) {
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
  createReadStream(file).pipe(res);
}
