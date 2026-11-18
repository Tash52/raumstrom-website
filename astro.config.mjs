// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { parse } from 'yaml';
import { CSP_DIRECTIVES } from './server/csp.mjs';

// Single source for the domain: src/content/settings/firma.yaml
const { domain } = parse(readFileSync(new URL('./src/content/settings/firma.yaml', import.meta.url), 'utf8'));

// Keystatic (admin UI + API) only exists in `astro dev`. Production builds never
// contain /keystatic or /api/keystatic (tested in tests/e2e/security.spec.ts).
// Decided by Astro's own `command`, not argv (the dev server may run as a daemon).
/** @returns {import('astro').AstroIntegration} */
function keystaticDevOnly() {
  return {
    name: 'raumstrom:keystatic-dev-only',
    hooks: {
      'astro:config:setup': async ({ command, updateConfig }) => {
        if (command !== 'dev') return;
        const { default: keystatic } = await import('@keystatic/astro');
        // Keystatic's admin UI needs inline styles/scripts; CSP is not enforced in dev anyway
        // (Astro docs) and is fully active in every build.
        updateConfig({ integrations: [keystatic()], security: { csp: false } });
      },
    },
  };
}

export default defineConfig({
  site: `https://${domain}`,
  output: 'static', // pages are prerendered; only src/pages/api/* sets `export const prerender = false`
  // 'ignore' because Keystatic's dev routes have no trailing slash; server/server.mjs redirects
  // page URLs to the canonical form with slash (308).
  trailingSlash: 'ignore',
  build: { format: 'directory' },
  compressHTML: 'jsx',
  // Header-only server (server/server.mjs) serves dist/client and calls Astro for /api/*.
  adapter: node({ mode: 'middleware', staticHeaders: true, bodySizeLimit: 25 * 1024 * 1024 }),
  session: false, // no cookies in v1
  prefetch: false,
  devToolbar: { enabled: false },
  integrations: [react(), sitemap(), keystaticDevOnly()],
  image: { remotePatterns: [], domains: [] },
  // Shiki uses inline styles (incompatible with the hash-based CSP).
  markdown: { syntaxHighlight: false },
  security: {
    checkOrigin: true,
    // CSP via hashes. staticHeaders: Astro writes the per-page policy to dist/client/_headers.json
    // instead of a <meta> tag; server/server.mjs sends it as a real header.
    csp: {
      algorithm: 'SHA-256',
      directives: /** @type {any} */ (CSP_DIRECTIVES),
    },
  },
  vite: {
    // Never inline assets as data: URIs (CSP allows only 'self').
    build: { sourcemap: false, assetsInlineLimit: 0 },
  },
});
