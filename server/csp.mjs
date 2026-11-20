// Shared CSP building blocks for astro.config.mjs (per-page policy with hashes)
// and server/server.mjs (fallback policy for responses without a page policy).
// No 'unsafe-inline', no foreign hosts. 'wasm-unsafe-eval' is added only on the
// planner pages via Astro.csp.insertScriptResource("'wasm-unsafe-eval'") and on the self-hosted
// pdf.js worker (WASM_WORKERS), whose own response policy governs the worker.

/** Directives besides script-src/style-src, which Astro fills with hashes. */
export const CSP_DIRECTIVES = [
  "default-src 'self'",
  "img-src 'self'",
  "font-src 'self'",
  "connect-src 'self'",
  "media-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
];

/** Policy for everything without a page-specific header (assets, API, errors). */
export const FALLBACK_CSP = [
  ...CSP_DIRECTIVES.filter((d) => !d.startsWith('default-src')),
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
].join('; ');

/**
 * Worker scripts that compile WebAssembly (pdf.js: openjpeg, jbig2, qcms from /pdfjs/wasm/).
 * Exact decoded pathnames; anything else keeps FALLBACK_CSP.
 */
export const WASM_WORKERS = new Set(['/pdfjs/pdf.worker.min.mjs']);

/** FALLBACK_CSP plus 'wasm-unsafe-eval' in script-src, only for WASM_WORKERS. */
export const WASM_WORKER_CSP = FALLBACK_CSP.replace("script-src 'self'", "script-src 'self' 'wasm-unsafe-eval'");

/** Directives that must be present in every page policy (meta tags cannot express frame-ancestors). */
export const REQUIRED_DIRECTIVES = ['default-src', 'object-src', 'base-uri', 'form-action', 'frame-ancestors'];

/**
 * Normalise an Astro policy and make sure the required directives exist.
 * Throws if the policy contains 'unsafe-inline' or 'unsafe-eval'.
 */
export function finalizePolicy(policy) {
  const parts = policy
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean);
  const names = new Set(parts.map((p) => p.split(/\s+/)[0].toLowerCase()));
  for (const d of CSP_DIRECTIVES) {
    const name = d.split(/\s+/)[0];
    if (REQUIRED_DIRECTIVES.includes(name) && !names.has(name)) parts.push(d);
  }
  const result = parts.join('; ');
  if (/'unsafe-inline'|'unsafe-eval'/.test(result)) {
    throw new Error(`CSP enthält unsafe-inline/unsafe-eval: ${result}`);
  }
  return result;
}
