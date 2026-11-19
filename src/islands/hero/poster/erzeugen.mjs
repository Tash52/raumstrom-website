// Renders the poster stills of the 3D scenes (motion-3d tooling, not part of the site bundle).
// The posters are the LCP image / fallback, so they must show exactly what the 3D scene shows.
//
//   npm run build:staging && npm start            (or any server on the build)
//   node src/islands/hero/poster/erzeugen.mjs http://127.0.0.1:4321
//
// Writes PNG sources next to the components; Astro converts them to AVIF/WebP at build time.
// Uses SwiftShader (software WebGL) when no GPU is present; ?poster=… skips the weak-device checks.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const basis = process.argv[2] ?? 'http://127.0.0.1:4321';
const ziel = (name) => fileURLToPath(new URL(name, import.meta.url));
const journeyZiel = (i) => fileURLToPath(new URL(`../../journey/poster/journey-${i}.png`, import.meta.url));

const AUFTRAEGE = [
  { url: '/?poster=hero', warten: '[data-hero-zustand="poster-fertig"]', element: '[data-hero] .hero-buehne', datei: ziel('./hero-start.png') },
  { url: '/?poster=hero&p=1', warten: '[data-hero-zustand="poster-fertig"]', element: '[data-hero] .hero-buehne', datei: ziel('./hero-komplett.png') },
  ...[0, 1, 2].map((i) => ({
    url: `/?poster=journey-${i}`,
    warten: '[data-journey-zustand="poster-fertig"]',
    element: '[data-journey] .journey-buehne',
    datei: journeyZiel(i),
  })),
];

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  // 1440 px: hero visual is 576 × 432 CSS px, × 2 = 1152 × 864 (largest srcset width).
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  for (const a of AUFTRAEGE) {
    const page = await ctx.newPage();
    await page.goto(basis + a.url);
    const el = page.locator(a.element);
    await el.scrollIntoViewIfNeeded();
    await page.waitForSelector(a.warten, { state: 'attached', timeout: 60_000 });
    await page.waitForTimeout(1200); // poster image fade-out under the canvas
    await el.screenshot({ path: a.datei, animations: 'disabled' });
    console.log(`${a.datei}`);
    await page.close();
  }
} finally {
  await browser.close();
}
