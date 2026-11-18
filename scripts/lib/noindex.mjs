// Generic sitemap filter: a page is left out if its built HTML carries <meta name="robots" content="…noindex…">
// (or if it was not built, e.g. removed staging-only pages).
import { readFileSync } from 'node:fs';

const NOINDEX_RE = /<meta\b(?=[^>]*\bname\s*=\s*["']?robots["']?)(?=[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b)[^>]*>/i;

export function isNoindexHtml(html) {
  return NOINDEX_RE.test(html);
}

/** dist file of a page URL for build.format 'directory' (and '/404' style file pages). */
export function htmlFileFor(clientDir, pageUrl) {
  const pathname = decodeURIComponent(new URL(pageUrl).pathname);
  return new URL(pathname.endsWith('/') ? `.${pathname}index.html` : `.${pathname}.html`, clientDir);
}

/** true if the page should appear in the sitemap. */
export function indexierbar(clientDir, pageUrl) {
  try {
    return !isNoindexHtml(readFileSync(htmlFileFor(clientDir, pageUrl), 'utf8'));
  } catch {
    return false;
  }
}
