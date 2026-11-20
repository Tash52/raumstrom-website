// planner-geometry (Phase 4): template -> walls -> 3D view, keyboard drawing, touch drawing, upload
// (image with calibration, multi-page PDF, rejected files), no-WebGL fallback, planner chunk only on
// /raumplaner/, zero foreign requests and no CSP violations.
import { expect, test, type Page } from '@playwright/test';
import sharp from 'sharp';

async function beobachten(page: Page, baseURL: string) {
  const fremd: string[] = [];
  const csp: string[] = [];
  const fehler: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (['http:', 'https:'].includes(u.protocol) && u.origin !== new URL(baseURL).origin) fremd.push(r.url());
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
    async pruefen() {
      expect(fremd, 'Fremd-Requests').toEqual([]);
      expect(csp, 'CSP-Meldungen').toEqual([]);
      expect(await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? [])).toEqual([]);
      expect(fehler, 'Skriptfehler').toEqual([]);
    },
  };
}

async function oeffnen(page: Page) {
  await page.goto('/raumplaner/');
  await expect(page.locator('[data-planer-host]')).toHaveAttribute('data-planer-zustand', 'bereit');
  await expect(page.locator('[data-planer-start]')).toBeVisible();
}

async function tourSchliessen(page: Page) {
  const knopf = page.locator('.planer-tour button');
  if (await knopf.isVisible()) await knopf.click();
}

/** Minimal valid PDF with n pages, each with a rectangle (a "floor plan"). */
function pdf(seiten: number): Buffer {
  const objekte: string[] = [];
  const kids = Array.from({ length: seiten }, (_, i) => `${3 + i * 2} 0 R`).join(' ');
  objekte.push('<< /Type /Catalog /Pages 2 0 R >>');
  objekte.push(`<< /Type /Pages /Kids [${kids}] /Count ${seiten} >>`);
  for (let i = 0; i < seiten; i++) {
    const inhalt = `4 w 60 60 ${300 + i * 50} 200 re S`;
    objekte.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 420] /Contents ${4 + i * 2} 0 R >>`);
    objekte.push(`<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`);
  }
  let text = '%PDF-1.4\n';
  const offsets: number[] = [];
  objekte.forEach((o, i) => {
    offsets.push(Buffer.byteLength(text));
    text += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(text);
  text += `xref\n0 ${objekte.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  text += `trailer\n<< /Size ${objekte.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(text, 'latin1');
}

test.describe('Raumplaner', () => {
  test('Vorlage laden → Wände und Räume → 3D-Ansicht, ohne Fremd-Requests und CSP-Verstöße', async ({ page, baseURL }) => {
    test.slow();
    const b = await beobachten(page, baseURL!);
    await oeffnen(page);
    await expect(page.locator('[data-planer-hinweis]')).toHaveText('Visualisierung, unverbindlich, Maße ohne Gewähr, kein Angebot.');
    await page.click('[data-vorlage="2-zimmer"]');
    await tourSchliessen(page);
    const editor = page.locator('[data-planer-editor]');
    await expect(editor).toBeVisible();
    await expect(editor.locator('line.wand')).toHaveCount(17);
    await expect(editor.locator('polygon.raum')).toHaveCount(5);
    await expect(page.locator('[data-planer-raeume] h3')).toHaveText('Räume (5)');
    await expect(page.locator('[data-planer-raeume]')).toContainText('Wohnzimmer');

    // select a room via the list and rename it
    await page.getByRole('button', { name: /Küche/ }).click();
    await page.fill('#planer-raum-name', 'Wohnküche');
    await page.press('#planer-raum-name', 'Enter');
    await expect(page.locator('[data-planer-raeume]')).toContainText('Wohnküche');

    await page.click('[data-planer-tab="3d"]');
    await expect(page.locator('[data-planer-3d]')).toHaveAttribute('data-planer-3d', 'bereit', { timeout: 30_000 });
    await expect(page.locator('.planer-3d canvas')).toHaveCount(1);
    await page.getByRole('button', { name: 'Draufsicht' }).click();
    await page.locator('.planer-3d').focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('+');
    // wording: no "Kamera" anywhere in the planner
    await expect(page.locator('.planer')).not.toContainText(/kamera/i);
    await b.pruefen();
  });

  test('Tastatur: Rechteck zeichnen, Raum wird erkannt, Länge numerisch, Rückgängig', async ({ page, baseURL, isMobile }) => {
    const b = await beobachten(page, baseURL!);
    await oeffnen(page);
    await page.click('[data-planer-leer]');
    await tourSchliessen(page);
    const editor = page.locator('[data-planer-editor]');
    await expect(editor, 'Fokus nach „Verstanden" auf dem Editor (QA B2)').toBeFocused();
    // heading order h1 -> h2 -> h3 (a11y B1)
    await expect(page.locator('.planer > h2')).toHaveText('Grundriss bearbeiten');
    await editor.focus();
    await page.keyboard.press('w');
    await page.keyboard.press('Enter'); // start point at the cursor
    await page.keyboard.type('400');
    await expect(page.locator('[data-planer-laengeneingabe]')).toContainText('400');
    await page.keyboard.press('Enter');
    for (const [pfeil, laenge] of [['ArrowDown', '300'], ['ArrowLeft', '400'], ['ArrowUp', '300']] as const) {
      await page.keyboard.press(pfeil);
      await page.keyboard.type(laenge);
      await page.keyboard.press('Enter');
    }
    await page.keyboard.press('Escape');
    await expect(editor.locator('line.wand')).toHaveCount(4);
    await expect(page.locator('[data-planer-raeume] h3')).toHaveText('Räume (1)');
    // 4 × 3 m centre line, 30 cm outer walls: clear area 3.7 × 2.7 = 10.0 m²
    await expect(page.locator('[data-planer-raeume]')).toContainText('10,0 m²');

    // select a wall from the list and set its length numerically
    await page.locator('.planer-wandliste summary').click();
    // tap targets: >= 24 px, 44 px on touch (a11y B2)
    const mindest = isMobile ? 44 : 24;
    for (const ziel of [page.locator('.planer-wandliste summary'), page.locator('.planer-wandliste button').first()]) {
      expect((await ziel.boundingBox())!.height).toBeGreaterThanOrEqual(mindest);
    }
    await page.locator('.planer-wandliste button').first().click();
    await expect(page.locator('[data-planer-auswahl="wand"]')).toBeVisible();
    await expect(page.locator('#planer-wandlaenge')).toHaveValue('400');

    await editor.focus();
    await page.keyboard.press('Control+z');
    await expect(editor.locator('line.wand')).toHaveCount(3);
    await expect(page.locator('[data-planer-raeume] h3')).toHaveText('Räume (0)');
    await page.keyboard.press('Control+y');
    await expect(page.locator('[data-planer-raeume] h3')).toHaveText('Räume (1)');

    // door via keyboard: select wall, insert door from the panel
    await page.locator('.planer-wandliste button').first().click();
    await page.getByRole('button', { name: 'Tür einsetzen' }).click();
    await expect(page.locator('[data-planer-auswahl="oeffnung"]')).toBeVisible();
    await expect(editor.locator('g.oeffnung.tuer')).toHaveCount(1);
    await b.pruefen();
  });

  test('Tastatur: Maus über dem Editor verliert den Tastatur-Zeiger nicht (Seite scrollt, Maus verlässt den Editor)', async ({ page }) => {
    // Regression (Phase 4, QA B1): the page scrolled under a resting mouse; the editor got pointerleave
    // between an arrow key and Enter, the keyboard cursor was cleared and the wall went the wrong way.
    await oeffnen(page);
    await page.click('[data-planer-leer]');
    await tourSchliessen(page);
    const editor = page.locator('[data-planer-editor]');
    const box = (await editor.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2); // mouse rests over the editor
    await editor.focus();
    await page.keyboard.press('w');
    await page.keyboard.press('Enter');
    await page.keyboard.type('400');
    await page.keyboard.press('Enter');
    for (const [pfeil, laenge] of [['ArrowDown', '300'], ['ArrowLeft', '400'], ['ArrowUp', '300']] as const) {
      await page.keyboard.press(pfeil);
      // what Chrome sends when content slides away under a resting mouse: a move without travel and a
      // boundary event (React derives onPointerLeave from pointerout with an outside relatedTarget)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await editor.evaluate((el) => {
        const raus = document.querySelector('.planer-leiste');
        el.querySelector('svg')!.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse', relatedTarget: raus }));
      });
      await page.keyboard.type(laenge);
      await page.keyboard.press('Enter');
    }
    await page.keyboard.press('Escape');
    await expect(editor.locator('line.wand')).toHaveCount(4);
    await expect(page.locator('[data-planer-raeume] h3')).toHaveText('Räume (1)');
  });

  test('Maus/Touch: Wand per Tippen bzw. Klicken, Fenster auf die Wand setzen', async ({ page, baseURL, isMobile }) => {
    const b = await beobachten(page, baseURL!);
    await oeffnen(page);
    await page.click('[data-planer-leer]');
    await tourSchliessen(page);
    const editor = page.locator('[data-planer-editor]');
    await page.locator('[data-werkzeug="wand"]').click();
    // editor top just below the sticky header, so the tap points are inside the viewport
    await editor.evaluate((el) => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 90));
    const box = (await editor.boundingBox())!;
    const tippe = async (x: number, y: number) => {
      if (isMobile) await page.touchscreen.tap(box.x + x, box.y + y);
      else await page.mouse.click(box.x + x, box.y + y);
    };
    await tippe(box.width * 0.2, box.height * 0.4);
    await tippe(box.width * 0.75, box.height * 0.42); // snaps to 0°
    await editor.press('Escape');
    await expect(editor.locator('line.wand')).toHaveCount(1);
    const wand = editor.locator('line.wand');
    expect(await wand.getAttribute('y1')).toBe(await wand.getAttribute('y2'));
    await page.locator('[data-werkzeug="fenster"]').click();
    const w = (await wand.boundingBox())!; // current position (the tool click may have scrolled)
    await tippe(w.x + w.width / 2 - box.x, w.y + w.height / 2 - box.y);
    await expect(editor.locator('g.oeffnung.fenster')).toHaveCount(1);
    await b.pruefen();
  });

  test('Upload: Bild wird neu kodiert, Maßstab kalibrieren', async ({ page, baseURL }) => {
    const b = await beobachten(page, baseURL!);
    await oeffnen(page);
    const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: '#ffffff' } })
      .composite([{ input: Buffer.from('<svg width="800" height="600"><rect x="100" y="100" width="600" height="400" fill="none" stroke="black" stroke-width="12"/></svg>') }])
      .withExif({ IFD0: { Copyright: 'Testperson', Make: 'Testgeraet' } })
      .png()
      .toBuffer();
    await page.setInputFiles('[data-planer-datei]', { name: 'grundriss.png', mimeType: 'image/png', buffer: png });
    await tourSchliessen(page);
    const editor = page.locator('[data-planer-editor]');
    await expect(editor).toBeVisible();
    await expect(page.locator('[data-werkzeug="massstab"]')).toHaveAttribute('aria-pressed', 'true');
    // two calibration points by keyboard: cursor starts in the middle, move 1 m right
    await editor.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Shift+ArrowRight');
    await page.keyboard.press('Enter');
    await expect(page.locator('#planer-kalibrier-laenge')).toBeFocused();
    await page.fill('#planer-kalibrier-laenge', '250');
    await page.press('#planer-kalibrier-laenge', 'Enter');
    await expect(page.locator('[data-planer-kalibrierung]')).toContainText('Maßstab festgelegt');
    await expect(page.locator('[data-werkzeug="wand"]')).toHaveAttribute('aria-pressed', 'true');
    await b.pruefen();
  });

  test('Upload: mehrseitiges PDF mit Seitenauswahl (pdf.js-Worker selbst gehostet)', async ({ page, baseURL }) => {
    test.slow();
    const b = await beobachten(page, baseURL!);
    const worker: string[] = [];
    page.on('request', (r) => r.url().includes('/pdfjs/') && worker.push(new URL(r.url()).pathname));
    await oeffnen(page);
    await page.setInputFiles('[data-planer-datei]', { name: 'plan.pdf', mimeType: 'application/pdf', buffer: pdf(2) });
    await expect(page.locator('#planer-pdf-seite')).toBeVisible({ timeout: 20_000 });
    await page.selectOption('#planer-pdf-seite', '2');
    await expect(page.getByRole('button', { name: 'Diese Seite verwenden' })).toBeEnabled({ timeout: 20_000 });
    await page.getByRole('button', { name: 'Diese Seite verwenden' }).click();
    await expect(page.locator('[data-planer-editor]')).toBeVisible();
    expect(worker).toContain('/pdfjs/pdf.worker.min.mjs');
    await b.pruefen();
  });

  test('Upload: falsches Format und zu große Datei werden abgelehnt', async ({ page }) => {
    await oeffnen(page);
    await page.setInputFiles('[data-planer-datei]', { name: 'plan.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('GIF89a----') });
    await expect(page.locator('.planer-fehler')).toContainText('Format wird nicht unterstützt');
    const gross = Buffer.alloc(20 * 1024 * 1024 + 1);
    gross.set([0xff, 0xd8, 0xff], 0);
    await page.setInputFiles('[data-planer-datei]', { name: 'gross.jpg', mimeType: 'image/jpeg', buffer: gross });
    await expect(page.locator('.planer-fehler')).toContainText('größer als 20 MB');
  });

  test('Ohne WebGL: 2D bleibt nutzbar, 3D zeigt Hinweis mit Kontaktformular', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, typ: string, ...rest: unknown[]) {
        if (/webgl/i.test(typ)) return null;
        return (orig as (...a: unknown[]) => unknown).call(this, typ, ...rest);
      } as typeof orig;
    });
    await oeffnen(page);
    await expect(page.locator('[data-planer-host]')).toHaveAttribute('data-planer-webgl', 'nein');
    await page.click('[data-vorlage="1-zimmer"]');
    await tourSchliessen(page);
    await expect(page.locator('[data-planer-editor] polygon.raum')).toHaveCount(3);
    await page.click('[data-planer-tab="3d"]');
    const ersatz = page.locator('[data-planer-3d="fallback"]');
    await expect(ersatz).toBeVisible();
    await expect(ersatz.locator('a[href="/kontakt/"]')).toBeVisible();
    await expect(page.locator('canvas[data-engine]')).toHaveCount(0);
  });

  test('noscript-Hinweis verweist auf das Kontaktformular', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/raumplaner/');
    await expect(page.locator('.planer-noscript a[href="/kontakt/"]')).toBeVisible();
    await expect(page.locator('[data-planer-laden]')).toBeHidden();
    await ctx.close();
  });

  test('Planer-Chunk wird nur auf /raumplaner/ geladen', async ({ page }) => {
    const skripte = async (pfad: string) => {
      const urls: string[] = [];
      const handler = (r: { url(): string; request(): { resourceType(): string } }) => {
        if (r.request().resourceType() === 'script') urls.push(r.url());
      };
      page.on('response', handler);
      await page.goto(pfad, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500); // deferred 3D/motion chunks
      page.off('response', handler);
      const inhalte = await Promise.all(urls.map(async (u) => ({ u, t: await (await page.request.get(u)).text() })));
      return inhalte.filter((x) => x.t.includes('data-planer-editor')).map((x) => x.u);
    };
    for (const pfad of ['/', '/kontakt/', '/leistungen/']) expect(await skripte(pfad), pfad).toEqual([]);
    expect((await skripte('/raumplaner/')).length).toBe(1);
  });
});
