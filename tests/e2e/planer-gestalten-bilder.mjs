// Screenshots of the design modes for the Phase 5 report (390 and 1440 px), against a running server.
// Usage: node tests/e2e/planer-gestalten-bilder.mjs http://127.0.0.1:4599
// Writes docs/agent-reports/screenshots/5-planner-design-<name>-<breite>.png and prints console/CSP issues.
import { chromium } from '@playwright/test';

const basis = process.argv[2] ?? 'http://127.0.0.1:4321';
const ziel = 'docs/agent-reports/screenshots';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const probleme = [];

for (const breite of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width: breite, height: breite > 500 ? 900 : 844 }, deviceScaleFactor: 1, hasTouch: breite < 500 });
  page.on('console', (m) => (m.type() === 'error' || /Content Security Policy/.test(m.text())) && probleme.push(`${breite}: ${m.text()}`));
  page.on('pageerror', (e) => probleme.push(`${breite}: ${e.message}`));
  page.on('request', (r) => !r.url().startsWith(basis) && !r.url().startsWith('blob:') && probleme.push(`${breite}: fremd ${r.url()}`));
  const foto = async (name, voll = false) => {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${ziel}/5-planner-design-${name}-${breite}.png`, fullPage: voll });
  };
  await page.goto(`${basis}/raumplaner/`);
  await page.waitForSelector('[data-planer-host][data-planer-zustand="bereit"]');
  await page.click('[data-vorlage="2-zimmer"]');
  const tour = page.locator('.planer-tour button');
  if (await tour.isVisible()) await tour.click();
  const bereit = () => page.waitForSelector('[data-planer-3d="bereit"]', { timeout: 60_000 });

  // style package on the whole flat, then walls view
  await page.click('[data-gestalt-modus="waende"]');
  await bereit();
  await page.locator('[data-gestalt-stilpakete] summary').click();
  await page.locator('[data-stilpaket="japandi"]').getByRole('button', { name: 'Auf Wohnung' }).click();
  await page.locator('[data-planer-raeume] button', { hasText: 'Wohnzimmer' }).click();
  await page.locator('[data-gestalt-stilpakete] summary').click();
  await page.waitForTimeout(1500);
  await foto('waende-stilpaket');
  if (breite < 500) {
    await page.locator('[data-gestalt-panel]').scrollIntoViewIfNeeded();
    await foto('waende-panel');
  }

  // tiles in the bath, raumhoch, herringbone
  await page.click('[data-gestalt-modus="fliesen"]');
  await page.locator('[data-planer-raeume] button', { hasText: 'Bad' }).click();
  await page.getByLabel('Ganzer Raum').check();
  await page.click('[data-kachel="fliese.marmor"]');
  await page.selectOption('#gestalt-format', 'metro-7-5x15');
  await page.selectOption('#gestalt-muster', 'fischgraet');
  await page.selectOption('#gestalt-fliesenhoehe', 'halbhoch');
  await page.locator('.planer-3d').scrollIntoViewIfNeeded();
  await foto('fliesen');

  // electro in 2D with zones and some points
  await page.click('[data-gestalt-modus="elektro"]');
  await page.click('[data-planer-tab="2d"]');
  await page.locator('[data-planer-editor]').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const raeume = page.locator('svg polygon.raum');
  const n = await raeume.count();
  for (let i = 0; i < n; i++) {
    await page.click('[data-kachel="licht.decke"]');
    await page.locator('[data-planer-editor]').scrollIntoViewIfNeeded();
    const b = await raeume.nth(i).boundingBox();
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await page.click('[data-kachel="steckdose.2fach"]');
    await page.locator('[data-planer-editor]').scrollIntoViewIfNeeded();
    const c = await raeume.nth(i).boundingBox();
    await page.mouse.click(c.x + 3, c.y + c.height * 0.6);
  }
  await foto('elektro-2d');
  const liste = page.locator('[data-gestalt-stueckliste]');
  if (!(await liste.getAttribute('open'))) await liste.locator('summary').click();
  await liste.scrollIntoViewIfNeeded();
  await foto('stueckliste');

  // furniture + electro in 3D with zones
  await page.click('[data-gestalt-modus="einrichtung"]');
  await page.click('[data-planer-tab="2d"]');
  await page.click('[data-kachel="moebel.sofa"]');
  await page.locator('[data-planer-editor]').scrollIntoViewIfNeeded();
  const gross = await raeume.evaluateAll((els) => els.map((e) => e.getBBox()).map((b) => b.width * b.height));
  const w = await raeume.nth(gross.indexOf(Math.max(...gross))).boundingBox();
  await page.mouse.click(w.x + w.width * 0.5, w.y + w.height * 0.85);
  await page.click('[data-kachel="moebel.tisch"]');
  await page.locator('[data-planer-editor]').scrollIntoViewIfNeeded();
  await page.mouse.click(w.x + w.width * 0.5, w.y + w.height * 0.4);
  await page.click('[data-planer-tab="3d"]');
  await bereit();
  await page.click('[data-gestalt-modus="elektro"]');
  await page.locator('.planer-3d').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  await foto('elektro-3d-zonen');

  // view: dimensions, evening light, lowered walls
  await page.click('[data-gestalt-modus="ansicht"]');
  await page.locator('[data-gestalt-masse]').check();
  await page.getByLabel('Niedrig').check();
  await page.getByLabel(/Tageszeit/).fill('18.5');
  await page.locator('.planer-3d').scrollIntoViewIfNeeded();
  await foto('ansicht');
  await page.locator('[data-gestalt-blick="rundgang"]').check();
  await page.getByLabel('Ganz').check();
  await page.locator('[data-gestalt-masse]').uncheck();
  await page.locator('.planer-3d').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  await foto('rundgang');
  await page.close();
}
await browser.close();
console.log(probleme.length ? probleme.join('\n') : 'keine Konsolenfehler, CSP-Meldungen oder Fremd-Requests');
