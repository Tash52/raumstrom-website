// page-builder (Phase 2c): every route, Gewerke-Kennzeichnung, accessibility, contact form UI.
import { readdirSync, readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { parse } from 'yaml';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const gewerke = (parse(readFileSync('src/content/settings/gewerke.yaml', 'utf8')) as { gewerke: { id: string; name: string; ausfuehrung: string }[] }).gewerke;
const leistungen = readdirSync('src/content/leistungen')
  .filter((f) => f.endsWith('.md'))
  .map((f) => {
    const fm = readFileSync(`src/content/leistungen/${f}`, 'utf8').match(/^---\n([\s\S]*?)\n---/)![1]!;
    return { id: f.replace(/\.md$/, ''), ...(parse(fm) as { gewerke: string[]; faq: string[]; ablauf: unknown[]; entwurf: boolean }) };
  });
const LEGAL = ['impressum', 'datenschutz', 'agb', 'widerruf', 'cookie-einstellungen', 'barrierefreiheit'];
const ROUTEN = [
  '/', '/fuer-zuhause/', '/fuer-unternehmen/', '/leistungen/', '/raumplaner/', '/referenzen/', '/ueber-uns/', '/partner/', '/kontakt/',
  ...LEGAL.map((l) => `/${l}/`),
  ...leistungen.map((l) => `/leistungen/${l.id}/`),
];

for (const pfad of ROUTEN) {
  test(`${pfad}: 200, eine H1, keine Fremd-Requests, axe 0 Verstöße`, async ({ page, baseURL }) => {
    const fremd: string[] = [];
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (!['data:', 'blob:'].includes(u.protocol) && u.origin !== new URL(baseURL!).origin) fremd.push(r.url());
    });
    const res = await page.goto(pfad, { waitUntil: 'networkidle' });
    expect(res?.status()).toBe(200);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.locator('h1').count()).toBe(1);
    expect(fremd).toEqual([]);
    const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });
}

test('Unbekannte Seiten: 404 mit eigener Seite, Ratgeber und Regionen ohne Seite', async ({ request }) => {
  for (const p of ['/gibt-es-nicht/', '/ratgeber/', '/region/schweinfurt/']) {
    const res = await request.get(p);
    expect(res.status(), p).toBe(404);
  }
  expect(await (await request.get('/gibt-es-nicht/')).text()).toContain('Hier ist die Leitung unterbrochen');
});

for (const l of leistungen) {
  test(`Leistung ${l.id}: Kennzeichnung, Ablauf, FAQ und CTA`, async ({ page }) => {
    await page.goto(`/leistungen/${l.id}/`);
    const partner = l.gewerke.map((id) => gewerke.find((g) => g.id === id)!).filter((g) => g.ausfuehrung === 'partner');
    const hinweis = page.locator('[data-gewerke-kennzeichnung] [data-gewerke-hinweis]');
    if (partner.length === 0) {
      await expect(hinweis).toHaveCount(0);
    } else {
      await expect(hinweis).toHaveText(partner.length === 1 ? /Ausführung durch unseren Meister-Partnerbetrieb/ : /Ausführung durch unsere Meister-Partnerbetriebe/);
    }
    await expect(page.locator('[data-gewerke-kennzeichnung] li')).toHaveCount(l.gewerke.length);
    if (l.ablauf.length) await expect(page.locator('#ablauf li')).toHaveCount(l.ablauf.length);
    if (l.faq.length) await expect(page.locator('#faq details')).toHaveCount(l.faq.length);
    await expect(page.locator('main a[href="/raumplaner/"]').first()).toBeVisible();
    await expect(page.locator('main a[href^="/kontakt/"]').first()).toBeVisible();
  });
}

test('Startseite: Hinweis nennt alle Partner-Gewerke im Plural', async ({ page }) => {
  await page.goto('/');
  const text = (await page.locator('.hero [data-gewerke-hinweis]').textContent()) ?? '';
  expect(text).toContain('Ausführung durch unsere Meister-Partnerbetriebe');
  for (const g of gewerke.filter((x) => x.ausfuehrung === 'partner')) expect(text).toContain(g.name);
  for (const g of gewerke.filter((x) => x.ausfuehrung === 'eigen')) expect(text).not.toContain(g.name);
});

test('Rechtstexte: Entwurfsbanner, keine Marker und keine Kommentare', async ({ page }) => {
  for (const l of LEGAL) {
    await page.goto(`/${l}/`);
    await expect(page.locator('[data-entwurf]')).toBeVisible();
    const html = await page.locator('[data-rechtstext]').innerHTML();
    expect(html).not.toMatch(/\{\{|<!--/);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  }
});

test('Referenzen: ausgeblendet solange das Feature-Flag aus ist', async ({ page }) => {
  await page.goto('/referenzen/');
  await expect(page.locator('#projekte')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Noch keine veröffentlichten Projekte' })).toBeVisible();
});

test('Navigation und Footer: Rechtslinks, Breadcrumbs', async ({ page }) => {
  await page.goto('/leistungen/wallbox/');
  const footer = page.locator('footer');
  for (const l of LEGAL) await expect(footer.locator(`a[href="/${l}/"]`)).toHaveCount(1);
  await expect(page.locator('nav[aria-label="Brotkrumen"] [aria-current="page"]')).toHaveText('Wallbox-Installation');
});

test.describe('Kontaktformular (UI)', () => {
  test('Felder haben Labels, Pflichtfelder sind gekennzeichnet', async ({ page }) => {
    await page.goto('/kontakt/');
    const form = page.locator('#kontakt-formular');
    await expect(form).toHaveAttribute('enctype', 'multipart/form-data');
    await expect(form).toHaveAttribute('action', '/api/contact');
    for (const n of ['name', 'email', 'telefon', 'ort', 'anliegen', 'nachricht', 'fotos', 'einwilligung']) {
      const id = await form.locator(`[name="${n}"]`).getAttribute('id');
      await expect(page.locator(`label[for="${id}"]`), n).toHaveCount(1);
    }
    await expect(form.locator('[name="fotos"]')).toHaveJSProperty('multiple', true);
  });

  test('Leeres Absenden: Fehlerliste, Fokus, aria-invalid, Fehler verschwinden beim Korrigieren', async ({ page }) => {
    await page.goto('/kontakt/');
    await page.locator('#kontakt-senden').click();
    const summary = page.locator('#kontakt-fehler');
    await expect(summary).toBeVisible();
    // A11y 2 (backend-api fixes): focus goes to the first field with an error.
    await expect(page.locator('#feld-name')).toBeFocused();
    await expect(summary.locator('li')).toHaveCount(4);
    await expect(page.locator('#feld-name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#feld-name')).toHaveAttribute('aria-describedby', /feld-name-fehler/);
    await expect(page.locator('#feld-name-fehler')).toContainText('Name');
    const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(violations).toEqual([]);
    await summary.locator('a').first().click();
    await expect(page.locator('#feld-name')).toBeFocused();
    await page.locator('#feld-name').fill('Erika Muster');
    await expect(page.locator('#feld-name')).not.toHaveAttribute('aria-invalid', 'true');
  });

  test('Sendet multipart an /api/contact und zeigt Serverfehler und Erfolg', async ({ page }) => {
    let body = '';
    let contentType = '';
    let antwort: object = { ok: false, fehler: { email: 'Diese E-Mail-Adresse ist nicht erreichbar.' } };
    await page.route('**/api/csrf', (r) => r.fulfill({ json: { token: 'test-token' } }));
    await page.route('**/api/contact', async (r) => {
      body = r.request().postData() ?? '';
      contentType = r.request().headers()['content-type'] ?? '';
      await r.fulfill({ status: 'ok' in antwort && (antwort as { ok: boolean }).ok ? 200 : 422, json: antwort });
    });
    await page.goto('/kontakt/?anliegen=wallbox');
    await expect(page.locator('#feld-anliegen')).toHaveValue('wallbox');
    await page.locator('#feld-name').fill('Erika Muster');
    await page.locator('#feld-email').fill('erika@example.com');
    await page.locator('#feld-nachricht').fill('Ich möchte eine Wallbox im Carport installieren lassen.');
    await page.locator('#feld-einwilligung').check();
    await page.locator('#kontakt-senden').click();
    await expect(page.locator('#feld-email-fehler')).toContainText('nicht erreichbar');
    expect(contentType).toMatch(/^multipart\/form-data/);
    for (const n of ['name', 'email', 'anliegen', 'nachricht', 'einwilligung', 'csrf', 'website']) expect(body, n).toContain(`name="${n}"`);
    expect(body).toContain('test-token');
    antwort = { ok: true };
    await page.locator('#kontakt-senden').click();
    await expect(page.locator('#kontakt-erfolg')).toBeFocused();
    await expect(page.locator('#kontakt-formular')).toBeHidden();
  });
});

test.describe('Kontakt-Rueckmeldeseiten (ohne JavaScript)', () => {
  for (const [pfad, h1] of [['/kontakt/danke/', 'Anfrage gesendet'], ['/kontakt/fehler/', 'Anfrage nicht gesendet']] as const) {
    test(`${pfad}: noindex, eine H1, Link zurueck, axe`, async ({ page }) => {
      await page.goto(pfad);
      await expect(page.locator('h1')).toHaveText(h1);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
      await expect(page.locator('main a[href="/"]').first()).toBeVisible();
      const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
      expect(r.violations.map((v) => v.id)).toEqual([]);
    });
  }

  test.describe('ohne JavaScript', () => {
    test.use({ javaScriptEnabled: false });
    test('Formular: noscript-Hinweis zum Spam-Schutz', async ({ page }) => {
      await page.goto('/kontakt/');
      await expect(page.locator('[data-altcha-platz] .noscript-hinweis')).toBeVisible();
      await expect(page.locator('[data-altcha-platz] .noscript-hinweis')).toContainText('benötigt JavaScript');
    });
  });
});
