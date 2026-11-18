// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig, fontProviders } from 'astro/config';
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

// Fonts (design-system): local files only, no font CDN. Sources and licences: src/assets/fonts/README.md.
// Unicode ranges = the subsets the files were cut to (Archivo) or IBM's own split (Plex Mono).
const ARCHIVO_LATIN = 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2190-2199, U+2212, U+2215, U+2264-2265, U+FEFF, U+FFFD';
const ARCHIVO_LATIN_EXT = 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF';
const PLEX_LATIN1 = 'U+0020-007E, U+00A0-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2013-2014, U+2018-201A, U+201C-201E, U+2020-2022, U+2026, U+2030, U+2039-203A, U+2044, U+20AC, U+2122, U+2212, U+FB01-FB02';
const PLEX_LATIN2 = 'U+0100-0101, U+0104-0130, U+0132-0151, U+0154-017F, U+018F, U+0192, U+01A0-01A1, U+01AF-01B0, U+01FA-01FF, U+0218-021B, U+0237, U+0259, U+1E80-1E85, U+1E9E, U+20A1, U+20A4, U+20A6, U+20A8-20AA, U+20AD-20AE, U+20B1-20B2, U+20B4-20B5, U+20B8-20BA, U+20BD, U+20BF';
const PLEX_PI = 'U+03C0, U+2000-200D, U+2010-2012, U+2015, U+2032-2033, U+2070, U+2074-2079, U+2080-2089, U+2113, U+2116, U+2126, U+2190-2199, U+2202, U+2206, U+2211, U+2215, U+2219-221A, U+221E, U+2248, U+2260, U+2264-2265, U+2500-259F, U+2713';
/** @param {string} range */
const ranges = (range) => /** @type {[string, ...string[]]} */ (range.split(/,\s*/));
const plex = (/** @type {string} */ name, /** @type {400 | 500} */ weight) =>
  /** @type {Array<[string, string]>} */ ([['Latin1', PLEX_LATIN1], ['Latin2', PLEX_LATIN2], ['Pi', PLEX_PI]]).map(([subset, range]) => ({
    src: [`./src/assets/fonts/ibm-plex-mono/IBMPlexMono-${name}-${subset}.woff2`],
    weight,
    style: 'normal',
    unicodeRange: ranges(range),
  }));

const FONTS = [
  {
    provider: fontProviders.local(),
    name: 'Archivo',
    cssVariable: '--font-archivo',
    display: 'swap',
    fallbacks: ['Arial', 'sans-serif'],
    options: {
      variants: [
        { src: ['./src/assets/fonts/archivo/archivo-var-latin.woff2'], weight: '300 900', style: 'normal', stretch: '100% 125%', unicodeRange: ranges(ARCHIVO_LATIN) },
        { src: ['./src/assets/fonts/archivo/archivo-var-latin-ext.woff2'], weight: '300 900', style: 'normal', stretch: '100% 125%', unicodeRange: ranges(ARCHIVO_LATIN_EXT) },
      ],
    },
  },
  {
    provider: fontProviders.local(),
    name: 'IBM Plex Mono',
    cssVariable: '--font-plex-mono',
    display: 'swap',
    fallbacks: ['ui-monospace', 'monospace'],
    options: { variants: [...plex('Regular', 400), ...plex('Medium', 500)] },
  },
];

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
  // /styleguide/ is noindex (acceptance only) and stays out of the sitemap.
  integrations: [react(), sitemap({ filter: (page) => !new URL(page).pathname.startsWith('/styleguide/') }), keystaticDevOnly()],
  // Cast: the config type cannot infer provider options from a variable (runtime validated by Astro).
  fonts: /** @type {any} */ (FONTS),
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
