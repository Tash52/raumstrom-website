// design-system (Phase 1b): accessibility, fonts, focus, skip link, reduced motion, mobile menu, security.txt.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const SEITEN = ['/', '/styleguide/'];
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

for (const pfad of SEITEN) {
  test(`axe: keine Verstöße (WCAG 2.2 AA) auf ${pfad}`, async ({ page }) => {
    await page.goto(pfad, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
  });

  test(`${pfad}: kein style-Attribut, kein Inline-Handler, Schriften nur lokal`, async ({ page, request }) => {
    const html = await (await request.get(pfad)).text();
    expect(html).not.toMatch(/\sstyle=/i);
    expect(html).not.toMatch(/\son[a-z]+=/i);
    const fontRequests: string[] = [];
    page.on('request', (r) => {
      if (r.resourceType() === 'font') fontRequests.push(r.url());
    });
    await page.goto(pfad, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    expect(fontRequests.length).toBeGreaterThan(0);
    for (const u of fontRequests) expect(new URL(u).pathname).toMatch(/^\/_astro\/fonts\/[\w-]+\.woff2$/);
    // exactly two preloads (Archivo Latin, Plex Mono Regular Latin)
    expect(await page.locator('link[rel="preload"][as="font"]').count()).toBe(2);
    expect(await page.evaluate(() => document.fonts.check('700 1rem Archivo'))).toBe(true);
    const familie = await page.evaluate(() => getComputedStyle(document.body).fontFamily);
    expect(familie).toMatch(/^Archivo/);
  });
}

test('Styleguide ist noindex und nicht in der Sitemap', async ({ page, request }) => {
  await page.goto('/styleguide/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const index = await (await request.get('/sitemap-index.xml')).text();
  const maps = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
  for (const m of maps) expect(await (await request.get(m)).text()).not.toContain('/styleguide/');
});

test('Skip-Link ist das erste Fokusziel und springt zum Inhalt', async ({ page }) => {
  await page.goto('/styleguide/');
  await page.keyboard.press('Tab');
  const skip = page.locator('.skiplink');
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('main#inhalt')).toBeFocused();
});

test('Fokus ist sichtbar (Outline auf Button und Feld)', async ({ page }) => {
  await page.goto('/styleguide/');
  for (const sel of ['#formular button[type="submit"]', '#feld-name']) {
    const el = page.locator(sel);
    await el.focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(el).toBeFocused();
    const outline = await el.evaluate((e) => {
      const cs = getComputedStyle(e);
      return { style: cs.outlineStyle, width: parseFloat(cs.outlineWidth) };
    });
    expect(outline.style, sel).not.toBe('none');
    expect(outline.width, sel).toBeGreaterThanOrEqual(2);
  }
});

test('Reduzierte Bewegung setzt die Bewegungs-Tokens auf 0', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const t = await page.evaluate(() => {
    const cs = getComputedStyle(document.documentElement);
    return { motion: cs.getPropertyValue('--motion').trim(), dur: cs.getPropertyValue('--dur-base').trim() };
  });
  expect(t.motion).toBe('0');
  expect(parseFloat(t.dur)).toBeLessThanOrEqual(0.01);
});

test('Mobiles Menü öffnet und schließt (Popover, Escape)', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'nur mobil');
  await page.goto('/styleguide/');
  const toggle = page.getByRole('button', { name: 'Menü' });
  const nav = page.getByRole('navigation', { name: 'Hauptnavigation' });
  await expect(nav).toBeHidden();
  await toggle.click();
  await expect(nav).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Für Zuhause' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(nav).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('Desktop-Navigation steht in einer Zeile, kein horizontales Scrollen', async ({ page, isMobile }) => {
  test.skip(isMobile, 'nur Desktop');
  for (const breite of [320, 390, 768, 1024, 1152, 1440]) {
    await page.setViewportSize({ width: breite, height: 800 });
    for (const pfad of SEITEN) {
      await page.goto(pfad);
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(sw, `${pfad} bei ${breite} px`).toBeLessThanOrEqual(breite);
    }
  }
  await page.setViewportSize({ width: 1152, height: 800 });
  await page.goto('/styleguide/');
  await expect(page.getByRole('navigation', { name: 'Hauptnavigation' })).toBeVisible();
  const box = await page.locator('.kopf').boundingBox();
  expect(box!.height).toBeLessThanOrEqual(80);
});

test('security.txt nach RFC 9116 (Expires höchstens 1 Jahr)', async ({ request }) => {
  const res = await request.get('/.well-known/security.txt');
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/^text\/plain/);
  const text = await res.text();
  expect(text).toMatch(/^Contact: \S+/m);
  const expires = new Date(/^Expires: (\S+)$/m.exec(text)![1]!);
  const tage = (expires.getTime() - Date.now()) / 86_400_000;
  expect(tage).toBeGreaterThan(0);
  expect(tage).toBeLessThanOrEqual(366);
});

test('Desktop-Navigation ohne Popover-Standardrahmen (QA B1)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'nur Desktop');
  for (const breite of [1152, 1440]) {
    await page.setViewportSize({ width: breite, height: 800 });
    await page.goto('/styleguide/');
    const rand = await page.locator('#hauptmenue').evaluate((e) => getComputedStyle(e).borderTopWidth);
    expect(rand, `${breite} px`).toBe('0px');
  }
});

test('Partner-Gewerke sind gekennzeichnet (QA B3)', async ({ page }) => {
  for (const pfad of SEITEN) {
    await page.goto(pfad);
    const hinweise = page.locator('[data-gewerke-hinweis]');
    expect(await hinweise.count(), pfad).toBeGreaterThan(0);
    await expect(hinweise.first()).toContainText(/Ausführung durch unser(en Meister-Partnerbetrieb|e Meister-Partnerbetriebe)/);
  }
});

test('Leitungsknoten halten Abstand zur Überschrift (QA B8)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const pfad of SEITEN) {
    await page.goto(pfad);
    const abstaende = await page.$$eval('[data-leitung-knoten]', (ks) =>
      ks.map((k) => {
        const h = k.parentElement!;
        const range = document.createRange();
        range.selectNodeContents(h);
        const text = [...range.getClientRects()].find((r) => r.width > 0 && r.left > k.getBoundingClientRect().right - 1);
        return (text?.left ?? h.getBoundingClientRect().left) - (k.getBoundingClientRect().right + 3.5 + 2);
      }),
    );
    for (const a of abstaende) expect(a, pfad).toBeGreaterThanOrEqual(8);
  }
});
