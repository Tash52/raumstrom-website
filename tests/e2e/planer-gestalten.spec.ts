// planner-design (Phase 5): mode bar, surfaces with tiles, style packages, undo/redo, electro with
// installation zones and bill of materials, furniture ("nur Visualisierung"), view options (walk-through,
// dimensions, screenshot), CC0 textures loaded lazily, zero foreign requests, no CSP violations.
// Screenshots for the report: E2E_SCREENSHOTS=1 writes docs/agent-reports/screenshots/5-planner-design-*.png.
import { expect, test, type Page } from '@playwright/test';

const SCREENSHOTS = process.env.E2E_SCREENSHOTS === '1';

async function beobachten(page: Page, baseURL: string) {
  const fremd: string[] = [];
  const csp: string[] = [];
  const fehler: string[] = [];
  const texturen: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (['http:', 'https:'].includes(u.protocol) && u.origin !== new URL(baseURL).origin) fremd.push(r.url());
    if (u.pathname.startsWith('/textures/') && /-(256|512)\.webp$/.test(u.pathname)) texturen.push(u.pathname);
  });
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text());
  });
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      const w = window as unknown as { __csp: string[] };
      (w.__csp ??= []).push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  return {
    texturen,
    async pruefen() {
      expect(fremd, 'Fremd-Requests').toEqual([]);
      expect(csp, 'CSP-Meldungen').toEqual([]);
      expect(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])).toEqual([]);
      expect(fehler, 'Skriptfehler').toEqual([]);
    },
  };
}

async function mitVorlage(page: Page, vorlage = '2-zimmer') {
  await page.goto('/raumplaner/');
  await expect(page.locator('[data-planer-host]')).toHaveAttribute('data-planer-zustand', 'bereit');
  await page.click(`[data-vorlage="${vorlage}"]`);
  const tour = page.locator('.planer-tour button');
  if (await tour.isVisible()) await tour.click();
}

const meldung = (page: Page) => page.locator('[data-planer-meldung]');

/** Click into the 2D plan at the centre of an SVG element's bounding box (optionally shifted in px). */
async function klickeAuf(page: Page, selektor: string, dx = 0, dy = 0) {
  const box = (await page.locator(selektor).first().boundingBox())!;
  await page.mouse.click(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy);
}

/** Room polygon with the largest screen area in the 2D plan (the living room of the templates). */
async function groessterRaum(page: Page) {
  // the plan fits itself into view after switching to 2D: wait until the layout is stable
  await page.locator('[data-planer-editor]').scrollIntoViewIfNeeded();
  let vorher = '';
  await expect
    .poll(async () => {
      const jetzt = JSON.stringify(await page.locator('svg polygon.raum').first().boundingBox());
      const stabil = jetzt === vorher;
      vorher = jetzt;
      return stabil;
    }, { intervals: [150, 150, 150, 300, 300] })
    .toBe(true);
  const flaechen = await page.locator('svg polygon.raum').evaluateAll((els) => els.map((e) => (e as SVGGraphicsElement).getBBox()).map((b) => b.width * b.height));
  return page.locator('svg polygon.raum').nth(flaechen.indexOf(Math.max(...flaechen)));
}

async function bild(page: Page, name: string) {
  if (!SCREENSHOTS) return;
  const breite = page.viewportSize()!.width;
  await page.screenshot({ path: `docs/agent-reports/screenshots/5-planner-design-${name}-${breite}.png`, fullPage: false });
}

test.describe('Raumplaner gestalten', () => {
  test('Werkzeugleiste mit 9 Modi, Wände mit Kachel auf einen Raum, Rückgängig/Wiederholen, Texturen erst bei Bedarf', async ({ page, baseURL }, info) => {
    const b = await beobachten(page, baseURL!);
    await mitVorlage(page);
    const modi = page.locator('[data-gestalt-modus]');
    await expect(modi).toHaveCount(9);
    await expect(modi).toHaveText(['Bauen', 'Elektro', 'Wände', 'Boden', 'Fliesen', 'Decke', 'Türen & Fenster', 'Einrichtung', 'Ansicht']);
    expect(b.texturen).toEqual([]);

    await page.click('[data-gestalt-modus="waende"]');
    await expect(page.locator('[data-gestalt-modus="waende"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-gestalt-panel="waende"]')).toBeVisible();
    await expect(page.locator('[data-planer-3d]')).toHaveAttribute('data-planer-3d', 'bereit', { timeout: 30_000 });

    // room from the list (keyboard path), then the scope "Ganzer Raum" and a tile
    await page.locator('[data-planer-raeume] button', { hasText: 'Wohnzimmer' }).click();
    await expect(page.locator('[data-gestalt-ziel]')).toContainText('Wohnzimmer');
    await page.getByLabel('Ganzer Raum').check();
    await page.click('[data-kachel="putz.kalk"]');
    await expect(meldung(page)).toContainText('Wände in Wohnzimmer: Kalkputz');
    // the plaster detail texture loads now (WebP, own server)
    await expect.poll(() => b.texturen.some((t) => t.startsWith('/textures/putz-')), { timeout: 15_000 }).toBe(true);
    expect(b.texturen.every((t) => /\/textures\/(putz|holz-eiche|marmor|beton)-(256|512)\.webp$/.test(t))).toBe(true);
    // mobile gets the reduced resolution
    if (info.project.name === 'mobile') expect(b.texturen.every((t) => t.endsWith('-256.webp'))).toBe(true);

    // colour from a palette (own names) applies to the same room
    await page.locator('.gestalt-farbe[title="Salbei"]').click();
    await expect(meldung(page)).toContainText('Salbei');
    await bild(page, 'waende');

    // undo / redo with keys in the 3D view and with the buttons
    await page.locator('.planer-3d').focus();
    await page.keyboard.press('Control+z');
    await expect(meldung(page)).toHaveText('Rückgängig gemacht');
    await page.keyboard.press('Control+y');
    await expect(meldung(page)).toHaveText('Wiederhergestellt');
    await page.getByRole('button', { name: 'Rückgängig', exact: true }).click();
    await expect(meldung(page)).toHaveText('Rückgängig gemacht');

    // keys 1 to 9 switch modes
    await page.keyboard.press('4');
    await expect(page.locator('[data-gestalt-modus="boden"]')).toHaveAttribute('aria-pressed', 'true');
    await b.pruefen();
  });

  test('Stilpaket auf die ganze Wohnung, danach Boden einzeln geändert; Fliesen mit Format und Muster', async ({ page, baseURL }) => {
    const b = await beobachten(page, baseURL!);
    await mitVorlage(page);
    await page.click('[data-gestalt-modus="boden"]');
    const pakete = page.locator('[data-gestalt-stilpakete]');
    await pakete.locator('summary').click();
    await expect(pakete.locator('[data-stilpaket]')).toHaveCount(8);
    await pakete.locator('[data-stilpaket="japandi"]').getByRole('button', { name: 'Auf Wohnung' }).click();
    await expect(meldung(page)).toContainText('Stilpaket „Japandi" auf die ganze Wohnung angewendet');

    await page.locator('[data-planer-raeume] button', { hasText: 'Bad' }).click();
    await page.click('[data-kachel="boden.teppich"]');
    await expect(meldung(page)).toContainText('Boden in Bad: Teppich');

    await page.click('[data-gestalt-modus="fliesen"]');
    await page.locator('[data-planer-raeume] button', { hasText: 'Bad' }).click();
    await page.getByLabel('Ganzer Raum').check();
    await page.click('[data-kachel="fliese.marmor"]');
    await expect(meldung(page)).toContainText('Fliesen in Bad: Marmoroptik');
    await page.selectOption('#gestalt-format', '30x60');
    await page.selectOption('#gestalt-muster', 'fischgraet');
    await expect(meldung(page)).toContainText('Fischgrät');
    await expect(meldung(page)).toContainText('30 × 60 cm');
    await page.selectOption('#gestalt-fliesenhoehe', 'raumhoch');
    await expect(meldung(page)).toContainText('raumhoch');
    await bild(page, 'fliesen');
    await b.pruefen();
  });

  test('Elektro im 2D-Plan: Wand- und Deckenpunkte, Installationszonen, Stückliste je Raum', async ({ page, baseURL }) => {
    const b = await beobachten(page, baseURL!);
    await mitVorlage(page, '1-zimmer');
    await page.click('[data-gestalt-modus="elektro"]');
    await page.click('[data-planer-tab="2d"]');
    await expect(page.locator('[data-zone]').first()).toBeAttached();
    expect(await page.locator('[data-zone="ZS-t"]').count()).toBeGreaterThan(0);

    // ceiling outlet in the middle of the living room
    await page.click('[data-kachel="licht.decke"]');
    const wohnraum = await groessterRaum(page);
    const box = (await wohnraum.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(meldung(page)).toContainText('Deckenauslass gesetzt');
    await expect(page.locator('[data-elektro-2d]')).toHaveCount(1);

    // a 2-fold socket at the right outer wall (inside face), at the standard height 30 cm
    await page.click('[data-kachel="steckdose.2fach"]');
    // the tile list may sit below the plan (mobile): measure again after scrolling back
    const box2 = (await (await groessterRaum(page)).boundingBox())!;
    await page.mouse.click(box2.x + box2.width - 3, box2.y + box2.height * 0.82);
    await expect(meldung(page)).toContainText('Steckdose 2-fach gesetzt');
    await expect(page.locator('[data-elektro-2d]')).toHaveCount(2);
    await expect(page.locator('#gestalt-elektro-hoehe')).toHaveValue('30');
    await expect(page.locator('[data-gestalt-zone]')).toHaveAttribute('data-gestalt-zone', 'ja');

    // edit the height: 1.05 m in the middle of a wall is outside the zones
    await page.fill('#gestalt-elektro-hoehe', '105');
    await page.press('#gestalt-elektro-hoehe', 'Enter');
    await expect(page.locator('[data-gestalt-zone]')).toHaveAttribute('data-gestalt-zone', 'nein');

    const liste = page.locator('[data-gestalt-stueckliste]');
    if (!(await liste.getAttribute('open'))) await liste.locator('summary').click();
    await expect(liste).toContainText('Wohnraum');
    await expect(liste).toContainText('Deckenauslass');
    await expect(liste).toContainText('Steckdose 2-fach');
    await expect(liste).toContainText('1 außerhalb der Installationszonen');
    await bild(page, 'elektro-2d');

    // delete with the key in the plan
    await page.locator('[data-planer-editor]').focus();
    await page.keyboard.press('Delete');
    await expect(page.locator('[data-elektro-2d]')).toHaveCount(1);
    await b.pruefen();
  });

  test('Einrichtung als „nur Visualisierung", drehen; Ansicht: Maße, Rundgang, Screenshot', async ({ page, baseURL }) => {
    const b = await beobachten(page, baseURL!);
    await mitVorlage(page, '1-zimmer');
    await page.click('[data-gestalt-modus="einrichtung"]');
    await expect(page.locator('[data-gestalt-nur-visualisierung]')).toContainText('nur zur Visualisierung');
    await page.click('[data-planer-tab="2d"]');
    await page.click('[data-kachel="moebel.sofa"]');
    const box = (await (await groessterRaum(page)).boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(meldung(page)).toContainText('Sofa platziert (nur Visualisierung)');
    await expect(page.locator('[data-moebel-2d]')).toHaveCount(1);
    await page.getByRole('button', { name: '↷ 90°' }).click();
    await expect(meldung(page)).toContainText('gedreht');

    await page.click('[data-gestalt-modus="ansicht"]');
    await expect(page.locator('[data-planer-3d]')).toHaveAttribute('data-planer-3d', 'bereit', { timeout: 30_000 });
    await expect(page.locator('[data-planer-nur-visualisierung]')).toBeVisible();
    await page.locator('[data-gestalt-masse]').check();
    await expect(page.locator('.planer-mass-label').first()).toBeAttached();
    await page.getByLabel(/Tageszeit/).fill('19');
    await bild(page, 'ansicht');

    const download = page.waitForEvent('download');
    await page.click('[data-gestalt-screenshot]');
    expect((await download).suggestedFilename()).toMatch(/^raumplaner-ansicht-\d{4}-\d{2}-\d{2}\.png$/);

    await page.locator('[data-gestalt-blick="rundgang"]').check();
    await expect(page.locator('.planer-3d')).toHaveAttribute('data-planer-blick', 'rundgang');
    await page.locator('.planer-3d').focus();
    await page.keyboard.down('w');
    await page.waitForTimeout(400);
    await page.keyboard.up('w');
    await bild(page, 'rundgang');
    await page.getByRole('button', { name: 'Rundgang beenden' }).click();
    await expect(page.locator('.planer-3d')).toHaveAttribute('data-planer-blick', 'orbit');
    await b.pruefen();
  });

  test('3D: Tippen auf eine Fläche wählt sie und wendet die Kachel an; Türen & Fenster: Stil und Schiebetür', async ({ page, baseURL }) => {
    const b = await beobachten(page, baseURL!);
    await mitVorlage(page, '1-zimmer');
    await page.click('[data-gestalt-modus="boden"]');
    await expect(page.locator('[data-planer-3d]')).toHaveAttribute('data-planer-3d', 'bereit', { timeout: 30_000 });
    await page.click('[data-kachel="boden.vinyl"]');
    // top view: the floors fill the middle of the canvas
    await page.getByRole('button', { name: 'Draufsicht' }).click();
    const c = (await page.locator('.planer-3d canvas').boundingBox())!;
    await page.mouse.click(c.x + c.width * 0.62, c.y + c.height * 0.5);
    await expect(page.locator('[data-gestalt-ziel]')).toHaveAttribute('data-gestalt-ziel', 'boden');
    await expect(meldung(page)).toContainText('Designboden (Vinyl)');
    await bild(page, 'boden-3d');

    await page.click('[data-gestalt-modus="oeffnungen"]');
    await page.selectOption('#gestalt-oeffnung', { index: 1 });
    await page.click('[data-kachel="tuer.kassette"]');
    await expect(meldung(page)).toContainText('Tür geändert');
    await page.getByLabel('Schiebetür (vor der Wand laufend)').check();
    await page.selectOption('#gestalt-glas', 'glas.gross');
    await page.getByRole('button', { name: 'Auf alle Türen übertragen' }).click();
    await expect(meldung(page)).toContainText('Auf alle Türen übertragen');
    await b.pruefen();
  });
});
