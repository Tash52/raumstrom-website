// backend-api: contact form end to end against the production build and Mailpit (Docker, STARTTLS).
// Mailpit is started in tests/e2e/mailpit/global-setup.ts. Every test uses its own X-Forwarded-For
// (server runs with TRUST_PROXY in E2E) so the in-memory rate limit per client does not interfere.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { solveChallenge, type Challenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import sharp from 'sharp';
import { MAILPIT_API, TEST_EMPFAENGER } from './mailpit/umgebung.ts';

const BASE = 'http://127.0.0.1:4399';
const HEIC = readFileSync(new URL('../fixtures/backend-api/testbild.heic', import.meta.url));

/** Browser-like headers of a same-origin fetch plus a unique client address. */
function kopf(ip: string, extra: Record<string, string> = {}) {
  return { origin: BASE, 'sec-fetch-site': 'same-origin', accept: 'application/json', 'x-forwarded-for': ip, ...extra };
}
/** Stable, unique client address per test and project. */
const ipFuer = (titel: string, projekt: string) => {
  let h = 0;
  for (const c of `${projekt}:${titel}`) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return `10.${(h >> 16) & 255}.${(h >> 8) & 255}.${h & 255}`;
};

async function csrf(request: APIRequestContext, ip: string): Promise<string> {
  const r = await request.get('/api/csrf', { headers: kopf(ip) });
  expect(r.status()).toBe(200);
  expect(r.headers()['cache-control']).toBe('no-store');
  return ((await r.json()) as { token: string }).token;
}

async function altcha(request: APIRequestContext, ip: string): Promise<string> {
  const r = await request.get('/api/altcha', { headers: kopf(ip) });
  expect(r.status()).toBe(200);
  const challenge = (await r.json()) as Challenge;
  const solution = await solveChallenge({ challenge, deriveKey });
  return Buffer.from(JSON.stringify({ challenge, solution })).toString('base64');
}

const jpegMitExif = () =>
  sharp({ create: { width: 320, height: 200, channels: 3, background: '#3d6300' } })
    .jpeg()
    .withExif({ IFD0: { Make: 'E2E-Testkamera', Artist: 'Geheimer Fotograf' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '50/1 3/1 0/1' } })
    .toBuffer();

interface MailpitAdresse {
  Name: string;
  Address: string;
}
interface MailpitNachricht {
  ID: string;
  From: MailpitAdresse;
  To: MailpitAdresse[];
  ReplyTo: MailpitAdresse[];
  Subject: string;
  Text: string;
  HTML: string;
  Attachments: { PartID: string; FileName: string; ContentType: string }[];
}

async function mails(request: APIRequestContext, query: string, anzahl: number): Promise<MailpitNachricht[]> {
  let liste: { ID: string }[] = [];
  await expect
    .poll(
      async () => {
        const r = await request.get(`${MAILPIT_API}/api/v1/search`, { params: { query } });
        liste = ((await r.json()) as { messages: { ID: string }[] }).messages ?? [];
        return liste.length;
      },
      { timeout: 15_000 },
    )
    .toBe(anzahl);
  return Promise.all(liste.map(async (m) => (await (await request.get(`${MAILPIT_API}/api/v1/message/${m.ID}`)).json()) as MailpitNachricht));
}

async function keineMails(request: APIRequestContext, marker: string) {
  // Give a (wrongly) accepted request time to arrive before asserting absence.
  await new Promise((r) => setTimeout(r, 500));
  const r = await request.get(`${MAILPIT_API}/api/v1/search`, { params: { query: marker } });
  expect(((await r.json()) as { messages_count: number }).messages_count).toBe(0);
}

async function formularAusfuellen(page: Page, marker: string, email: string, ohneJs = false) {
  await page.locator('#feld-name').fill('Erika Muster');
  await page.locator('#feld-email').fill(email);
  await page.locator('#feld-ort').fill('97421 Schweinfurt');
  await page.locator('#feld-nachricht').fill(`Neues Bad im Altbau, etwa 8 m². Kennung ${marker}`);
  // Without JS Playwright's stability check never settles for this checkbox (harness quirk), hence force.
  await page.locator('#feld-einwilligung').check({ force: ohneJs });
}

test.describe('Kontakt-API (Produktions-Build + Mailpit)', () => {
  test('Erfolg mit Foto im Browser: Anfrage mit neu kodiertem Foto plus Bestätigung ohne Inhalte', async ({ page, request }, info) => {
    const marker = randomUUID();
    const kunde = `kunde-${marker}@beispiel.test`;
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ipFuer(info.title, info.project.name) });
    await page.goto('/kontakt/');
    await expect(page.locator('altcha-widget')).toHaveCount(1);
    await formularAusfuellen(page, marker, kunde);
    await page.locator('#feld-anliegen').selectOption('wallbox');
    await page.locator('#feld-fotos').setInputFiles([
      { name: 'IMG_4711.jpg', mimeType: 'image/jpeg', buffer: await jpegMitExif() },
      { name: 'IMG_4712.HEIC', mimeType: 'image/heic', buffer: HEIC },
    ]);
    await page.locator('#kontakt-senden').click();
    await expect(page.locator('#kontakt-erfolg')).toBeFocused({ timeout: 30_000 });

    const [anfrage] = await mails(request, `to:"${TEST_EMPFAENGER}" ${marker}`, 1);
    expect(anfrage!.From).toEqual({ Name: 'RAUMSTROM Website', Address: 'anfrage@raumstrom.de' });
    expect(anfrage!.ReplyTo).toEqual([{ Name: 'Erika Muster', Address: kunde }]);
    expect(anfrage!.Subject).toBe('Neue Anfrage: Wallbox-Installation');
    expect(anfrage!.HTML).toBe('');
    expect(anfrage!.Text).toContain('Ort des Projekts: 97421 Schweinfurt');
    expect(anfrage!.Attachments.map((a) => [a.FileName, a.ContentType])).toEqual([
      ['foto-1.jpg', 'image/jpeg'],
      ['foto-2.jpg', 'image/jpeg'],
    ]);
    for (const a of anfrage!.Attachments) {
      const bild = Buffer.from(await (await request.get(`${MAILPIT_API}/api/v1/message/${anfrage!.ID}/part/${a.PartID}`)).body());
      const meta = await sharp(bild).metadata();
      expect(meta.format).toBe('jpeg');
      expect(meta.exif).toBeUndefined();
      expect(bild.includes(Buffer.from('E2E-Testkamera'))).toBe(false);
    }

    const [bestaetigung] = await mails(request, `to:"${kunde}"`, 1);
    expect(bestaetigung!.From.Address).toBe('anfrage@raumstrom.de');
    expect(bestaetigung!.Subject).toBe('Ihre Anfrage bei RAUMSTROM');
    expect(bestaetigung!.Attachments).toEqual([]);
    for (const teil of [marker, 'Erika', 'Schweinfurt', 'Altbau']) expect(bestaetigung!.Text).not.toContain(teil);
  });

  test('Widget: lokal ausgeliefert, kein Inline-Style, axe ohne Verstöße, keine Fremd-Requests', async ({ page }, info) => {
    const fremd: string[] = [];
    page.on('request', (r) => {
      if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) fremd.push(r.url());
    });
    const csp: string[] = [];
    page.on('console', (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text());
    });
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ipFuer(info.title, info.project.name) });
    await page.goto('/kontakt/');
    // QA B1: widget and its checkbox are visible (the mount point must not carry the class "altcha").
    await expect(page.locator('[data-altcha-platz]')).toBeVisible();
    await expect(page.locator('altcha-widget')).toBeVisible();
    await expect(page.locator('altcha-widget input[type="checkbox"]')).toBeVisible();
    await expect(page.getByRole('checkbox', { name: /Roboter/i })).toBeVisible();
    await page.locator('#feld-name').focus(); // auto="onfocus" starts the proof of work
    await expect(page.locator('altcha-widget input[name="altcha"]')).toHaveValue(/.{40,}/, { timeout: 30_000 });
    expect(await page.locator('altcha-widget [style]').count()).toBe(0);
    await expect(page.locator('altcha-widget a[href*="altcha.org"]')).toHaveCount(0);
    const { violations } = await new AxeBuilder({ page }).include('#kontakt-formular').analyze();
    expect(violations).toEqual([]);
    expect(fremd).toEqual([]);
    expect(csp).toEqual([]);
  });

  test('Serverfehler werden am Feld angezeigt (Foto mit falscher Signatur)', async ({ page, request }, info) => {
    const marker = randomUUID();
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ipFuer(info.title, info.project.name) });
    await page.goto('/kontakt/');
    await formularAusfuellen(page, marker, `kunde-${marker}@beispiel.test`);
    await page.locator('#feld-fotos').setInputFiles({ name: 'urlaub.jpg', mimeType: 'image/jpeg', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>') });
    await page.locator('#kontakt-senden').click();
    await expect(page.locator('#feld-fotos-fehler')).toContainText('JPG, PNG, WebP oder HEIC', { timeout: 30_000 });
    // A11y 2: focus on the first field with an error, the summary stays visible.
    await expect(page.locator('#feld-fotos')).toBeFocused();
    await expect(page.locator('#kontakt-fehler')).toBeVisible();
    await keineMails(request, marker);
  });

  test('Fehler im Browser: Fokus auf das erste Fehlerfeld, vollständige Feldnamen in der Zusammenfassung', async ({ page }, info) => {
    await page.setExtraHTTPHeaders({ 'x-forwarded-for': ipFuer(info.title, info.project.name) });
    await page.goto('/kontakt/');
    await page.locator('#feld-email').fill('erika@beispiel.de');
    await page.locator('#kontakt-senden').click();
    await expect(page.locator('#feld-name')).toBeFocused();
    const links = page.locator('#kontakt-fehler-liste a');
    await expect(links.first()).toHaveText(/^Name: /);
    await expect(links.filter({ hasText: 'Datenschutzhinweis:' })).toHaveCount(1);
    await expect(links.filter({ hasText: /Ich habe die:/ })).toHaveCount(0);
    for (const t of await links.allTextContents()) expect(t).not.toContain('Pflichtfeld');
  });

  test('Ohne JavaScript: nativer POST landet auf der Fehlerseite (Spam-Schutz braucht JS), nicht auf JSON', async ({ browser, request }, info) => {
    const marker = randomUUID();
    const ctx = await browser.newContext({ javaScriptEnabled: false, extraHTTPHeaders: { 'x-forwarded-for': ipFuer(info.title, info.project.name) } });
    const page = await ctx.newPage();
    await page.goto('/kontakt/');
    // QA B1: without JS the note about the spam protection (and the direct contact) is visible.
    await expect(page.locator('[data-altcha-platz] .noscript-hinweis')).toBeVisible();
    await expect(page.locator('[data-altcha-platz] .noscript-hinweis')).toContainText('benötigt JavaScript');
    await formularAusfuellen(page, marker, `kunde-${marker}@beispiel.test`, true);
    await expect(page.locator('#feld-einwilligung')).toBeChecked();
    await page.locator('#kontakt-senden').click();
    await expect(page).toHaveURL(/\/kontakt\/fehler\/$/);
    await expect(page.locator('h1')).toHaveText('Anfrage nicht gesendet');
    await ctx.close();
    await keineMails(request, marker);
  });

  test('Nativer POST mit gültigen Tokens: 303 auf die Danke-Seite', async ({ request }, info) => {
    const ip = ipFuer(info.title, info.project.name);
    const marker = randomUUID();
    const r = await request.post('/api/contact', {
      headers: kopf(ip, { accept: 'text/html,application/xhtml+xml' }),
      multipart: { name: 'Erika Muster', email: `kunde-${marker}@beispiel.test`, nachricht: `Ohne Skript ${marker}`, einwilligung: 'ja', website: '', csrf: await csrf(request, ip), altcha: await altcha(request, ip) },
      maxRedirects: 0,
    });
    expect(r.status()).toBe(303);
    expect(r.headers()['location']).toBe('/kontakt/danke/');
    const danke = await request.get('/kontakt/danke/');
    expect(danke.status()).toBe(200);
    expect(await danke.text()).toContain('name="robots" content="noindex"');
    await mails(request, `to:"${TEST_EMPFAENGER}" ${marker}`, 1);
  });

  test('Fehlerfälle der API: JSON ohne Interna, kein Versand', async ({ request }, info) => {
    const ip = ipFuer(info.title, info.project.name);
    const marker = randomUUID();
    const felder = { name: 'Erika Muster', email: `kunde-${marker}@beispiel.test`, nachricht: `Fehlerfall ${marker}`, einwilligung: 'ja', website: '' };
    const post = (headers: Record<string, string>, multipart: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>) =>
      request.post('/api/contact', { headers, multipart, maxRedirects: 0 });

    const fremd = await post(kopf(ip, { origin: 'https://boese.example', 'sec-fetch-site': 'cross-site' }), { ...felder, csrf: await csrf(request, ip) });
    expect(fremd.status()).toBe(403);

    const ohneCsrf = await post(kopf(ip), { ...felder, altcha: 'x' });
    expect(ohneCsrf.status()).toBe(403);
    expect(await ohneCsrf.json()).toEqual({ ok: false, nachricht: 'Das Formular ist abgelaufen. Bitte senden Sie es erneut.' });

    const ohneAltcha = await post(kopf(ip), { ...felder, csrf: await csrf(request, ip) });
    expect(ohneAltcha.status()).toBe(422);
    expect((await ohneAltcha.json()).nachricht).toContain('Spam-Schutz');

    const ungueltig = await post(kopf(ip), { ...felder, email: 'kaputt', nachricht: 'kurz', csrf: await csrf(request, ip) });
    expect(ungueltig.status()).toBe(422);
    const body = (await ungueltig.json()) as { ok: boolean; fehler: Record<string, string> };
    expect(Object.keys(body.fehler).sort()).toEqual(['email', 'nachricht']);

    const replay = await altcha(request, ip);
    const erst = await post(kopf(ip), { ...felder, csrf: await csrf(request, ip), altcha: replay, fotos: { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('GIF89a-kein-png') } });
    expect(erst.status()).toBe(422);
    expect((await erst.json()).fehler.fotos).toContain('JPG, PNG, WebP oder HEIC');
    const zweit = await post(kopf(ip), { ...felder, csrf: await csrf(request, ip), altcha: replay });
    expect(zweit.status()).toBe(422); // ALTCHA payload already used

    const json = await request.post('/api/contact', { headers: kopf(ip, { 'content-type': 'application/json' }), data: { ...felder } });
    expect([403, 415]).toContain(json.status());

    for (const r of [fremd, ohneCsrf, ohneAltcha, ungueltig, erst, zweit, json]) {
      expect(r.headers()['cache-control']).toBe('no-store');
      const text = await r.text();
      expect(text).not.toMatch(/at\s+\S+\s+\(|node_modules|Error:|stack/i);
    }
    await keineMails(request, marker);
  });

  test('Nur die vorgesehenen Methoden, Rate-Limit mit Retry-After', async ({ request }, info) => {
    const ip = ipFuer(info.title, info.project.name);
    expect((await request.get('/api/contact', { headers: kopf(ip) })).status()).toBe(405);
    expect((await request.fetch('/api/contact', { method: 'PUT', headers: kopf(ip) })).status()).toBe(405);
    expect((await request.post('/api/csrf', { headers: kopf(ip) })).status()).toBe(405);
    expect((await request.delete('/api/altcha', { headers: kopf(ip) })).status()).toBe(405);
    const status: number[] = [];
    let letzte;
    for (let i = 0; i < 6; i++) {
      letzte = await request.post('/api/contact', { headers: kopf(ip), multipart: { name: 'x' } });
      status.push(letzte.status());
    }
    expect(status.slice(0, 5).every((s) => s !== 429)).toBe(true);
    expect(status[5]).toBe(429);
    expect(Number(letzte!.headers()['retry-after'])).toBeGreaterThan(0);
  });
});

