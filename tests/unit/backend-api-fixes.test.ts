// backend-api, Phase-2 fixes: H-1 (global limit/slots/body timeout), M-1 (client address only from the
// server header), M-2 (HEIC in a worker, one at a time), L-3 (display name), L-4 (confirmation cap),
// QA B1 (mount point class), A11y 1/2 (label text, first error field).
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { describe, expect, it, vi } from 'vitest';
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { altchaSchluessel, erzeugeChallenge } from '../../src/lib/security/altcha.ts';
import { CLIENT_IP_HEADER, socketAdresse } from '../../src/lib/security/anfrage.ts';
import { ANNAHME, ANNAHME_PRO_CLIENT, PARALLEL, clientKennung, type ApiKontext } from '../../src/lib/security/api.ts';
import { leseBody } from '../../src/lib/security/body.ts';
import { erzeugeCsrfToken } from '../../src/lib/security/csrf.ts';
import { MAX_BODY, verarbeiteKontakt, type KontaktAbhaengigkeiten } from '../../src/lib/security/kontakt-ablauf.ts';
import { ableiten } from '../../src/lib/security/schluessel.ts';
import { Parallelitaet, SchluesselParallelitaet } from '../../src/lib/security/speicher.ts';
import { anzeigeName } from '../../src/lib/mail/kontakt-mails.ts';
import { dekodiereImWorker, MAX_PIXEL_HEIC } from '../../src/lib/uploads/heic.ts';
import { BILD_SLOT, kodiereNeu, MAX_PIXEL } from '../../src/lib/uploads/bild.ts';
import { beschriftung, erstesFehlerfeld, fehlerName, type TextKnoten } from '../../src/components/forms/formular-hilfen.ts';
import type { Firma } from '../../src/lib/schemas/index.ts';

const SECRET = 'unit-test-secret-fixes-0123456789abcdef0123';
const firma = parse(readFileSync(new URL('../../src/content/settings/firma.yaml', import.meta.url), 'utf8')) as Firma;
const HEIC = readFileSync(new URL('../fixtures/backend-api/testbild.heic', import.meta.url));
const KOSTEN_TEST = { cost: 10, counterMin: 50, counterMax: 200 } as const;

function kontext(trustProxy = false): ApiKontext {
  return {
    env: {
      TRUST_PROXY: trustProxy,
      ALTCHA_HMAC_KEY: SECRET,
      CSRF_SECRET: SECRET,
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: 1025,
      SMTP_SECURE: false,
      SMTP_USER: 'u',
      SMTP_PASS: 'p',
      MAIL_FROM: 'anfrage@raumstrom.de',
      MAIL_TO_STAGING: 'eingang@raumstrom.test',
    },
    csrfKey: ableiten(SECRET, 'csrf'),
    clientKey: ableiten(SECRET, 'client'),
    mailKey: ableiten(SECRET, 'mail'),
    altcha: altchaSchluessel(SECRET),
  };
}

async function altchaPayload(k: ApiKontext) {
  const challenge = await erzeugeChallenge(k.altcha, Date.now(), KOSTEN_TEST);
  const solution = await solveChallenge({ challenge, deriveKey });
  return Buffer.from(JSON.stringify({ challenge, solution })).toString('base64');
}

const KOPF = { origin: 'http://a', host: 'a' };
const abh = (k: ApiKontext, ip: string | undefined, extra: Partial<KontaktAbhaengigkeiten> = {}): KontaktAbhaengigkeiten => ({
  kontext: k,
  firma,
  anliegen: new Map(),
  sende: async () => {},
  socketAdresse: ip,
  ...extra,
});

async function gueltigeAnfrage(k: ApiKontext, felder: Record<string, string> = {}) {
  const f = new FormData();
  const basis = { name: 'Erika Muster', email: 'erika@beispiel.de', nachricht: 'Wir planen ein neues Bad im Altbau.', einwilligung: 'ja', website: '', csrf: erzeugeCsrfToken(k.csrfKey), altcha: await altchaPayload(k), ...felder };
  for (const [n, v] of Object.entries(basis)) f.set(n, v);
  return new Request('http://a/api/contact', { method: 'POST', body: f, headers: KOPF });
}

/** multipart request without CSRF/ALTCHA (rejected with 403). */
function ohneToken(extra: Record<string, string> = {}) {
  const f = new FormData();
  f.set('name', 'x');
  return new Request('http://a/api/contact', { method: 'POST', body: f, headers: { ...KOPF, ...extra } });
}

/** Body that sends a few bytes and then stalls (slowloris). */
function haengendeAnfrage(extra: Record<string, string> = {}) {
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(new TextEncoder().encode('--x\r\n'));
    },
  });
  return new Request('http://a/api/contact', {
    method: 'POST',
    body,
    duplex: 'half',
    headers: { ...KOPF, 'content-type': 'multipart/form-data; boundary=x', 'content-length': '1000000', ...extra },
  } as RequestInit);
}

const SCHNELL = { schonfristMs: 100, minBytesProS: 10_000, maxDauerMs: 2_000, pruefIntervallMs: 20 };

describe('H-1: abgewiesene Anfragen sperren niemanden aus', () => {
  it('70 Anfragen ohne Token (verschiedene Clients) zählen nicht global: legitime Anfrage danach 200', async () => {
    const k = kontext();
    const status = new Set<number>();
    for (let i = 0; i < 70; i++) status.add((await verarbeiteKontakt(ohneToken(), abh(k, `203.0.113.${i}`))).status);
    expect([...status]).toEqual([403]);
    const e = await verarbeiteKontakt(await gueltigeAnfrage(k), abh(k, '198.51.100.99'));
    expect(e).toEqual({ status: 200, ok: true });
  });

  it('ein Client, der sein eigenes Limit erschöpft, betrifft andere Clients nicht', async () => {
    const k = kontext();
    const s = [];
    for (let i = 0; i < 8; i++) s.push((await verarbeiteKontakt(ohneToken(), abh(k, '203.0.113.200'))).status);
    expect(s).toEqual([403, 403, 403, 403, 403, 429, 429, 429]);
    expect((await verarbeiteKontakt(await gueltigeAnfrage(k), abh(k, '198.51.100.98'))).status).toBe(200);
  });

  it('Slowloris: hängender Body wird per Mindestrate beendet (408), Slots werden frei', async () => {
    const k = kontext();
    const t0 = Date.now();
    const e = await verarbeiteKontakt(haengendeAnfrage(), abh(k, '203.0.113.210', { bodyGrenzen: SCHNELL }));
    expect(e.status).toBe(408);
    expect(Date.now() - t0).toBeLessThan(1500);
    expect(ANNAHME.laufend).toBe(0);
    expect(ANNAHME_PRO_CLIENT.groesse).toBe(0);
    expect(PARALLEL.laufend).toBe(0);
  });

  it('höchstens 2 gleichzeitige Uploads je Client, danach 429; andere Clients unberührt', async () => {
    const k = kontext();
    const d = abh(k, '203.0.113.220', { bodyGrenzen: { ...SCHNELL, schonfristMs: 400 } });
    const laufend = [verarbeiteKontakt(haengendeAnfrage(), d), verarbeiteKontakt(haengendeAnfrage(), d)];
    await new Promise((r) => setTimeout(r, 20));
    expect((await verarbeiteKontakt(haengendeAnfrage(), d)).status).toBe(429);
    expect((await verarbeiteKontakt(await gueltigeAnfrage(k), abh(k, '198.51.100.97'))).status).toBe(200);
    expect((await Promise.all(laufend)).map((e) => e.status)).toEqual([408, 408]);
    expect(ANNAHME.laufend).toBe(0);
  });

  it('Body ohne Content-Length über dem Limit wird beim Lesen abgebrochen (413)', async () => {
    const k = kontext();
    let gesendet = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        gesendet += 1024 * 1024;
        c.enqueue(new Uint8Array(1024 * 1024));
      },
    });
    const req = new Request('http://a/api/contact', { method: 'POST', body, duplex: 'half', headers: { ...KOPF, 'content-type': 'multipart/form-data; boundary=x' } } as RequestInit);
    const e = await verarbeiteKontakt(req, abh(k, '203.0.113.230'));
    expect(e.status).toBe(413);
    expect(gesendet).toBeLessThan(MAX_BODY + 4 * 1024 * 1024);
    expect(ANNAHME.laufend).toBe(0);
  });

  it('globales Limit zählt nur echte Versandversuche und greift nach 60 (frisches Modul)', async () => {
    vi.resetModules();
    const ablauf = await import('../../src/lib/security/kontakt-ablauf.ts');
    const k = kontext();
    // Rejected requests (CSRF missing, ALTCHA wrong) never touch the global budget.
    for (let i = 0; i < 80; i++) await ablauf.verarbeiteKontakt(ohneToken(), abh(k, `192.0.2.${i}`));
    for (let i = 0; i < 5; i++) await ablauf.verarbeiteKontakt(await gueltigeAnfrage(k, { altcha: 'kaputt' }), abh(k, `192.0.2.${100 + i}`));
    const s: number[] = [];
    for (let i = 0; i < 61; i++) s.push((await ablauf.verarbeiteKontakt(await gueltigeAnfrage(k), abh(k, `10.1.${i}.1`))).status);
    expect(s.slice(0, 60).every((x) => x === 200)).toBe(true);
    expect(s[60]).toBe(429);
  }, 60_000);
});

describe('leseBody', () => {
  const strom = (teile: Uint8Array[]) => new Request('http://a/', { method: 'POST', body: new Blob(teile as BlobPart[]) });
  it('liest vollständig unter dem Limit', async () => {
    const r = await leseBody(strom([new Uint8Array([1, 2]), new Uint8Array([3])]), { maxBytes: 10, ...SCHNELL });
    expect(r).toEqual({ ok: true, daten: new Uint8Array([1, 2, 3]) });
  });
  it('bricht über dem Limit ab', async () => {
    expect(await leseBody(strom([new Uint8Array(11)]), { maxBytes: 10, ...SCHNELL })).toEqual({ ok: false, grund: 'zu-gross' });
  });
  it('absolute Höchstdauer greift auch bei ausreichender Rate', async () => {
    let n = 0;
    const body = new ReadableStream<Uint8Array>({
      async pull(c) {
        await new Promise((r) => setTimeout(r, 10));
        n += 1;
        c.enqueue(new Uint8Array(1000));
      },
    });
    const req = new Request('http://a/', { method: 'POST', body, duplex: 'half' } as RequestInit);
    const r = await leseBody(req, { maxBytes: 10_000_000, maxDauerMs: 200, minBytesProS: 1, schonfristMs: 100, pruefIntervallMs: 10 });
    expect(r).toEqual({ ok: false, grund: 'zeit' });
    expect(n).toBeGreaterThan(0);
  });
});

describe('Parallelität mit Warteschlange', () => {
  it('übergibt Slots in Reihenfolge, Warteschlange begrenzt, Wartezeit begrenzt', async () => {
    const p = new Parallelitaet(1, 2);
    const erster = p.belege()!;
    const a = p.warte(1000);
    const b = p.warte(1000);
    expect(await p.warte(1000)).toBeNull(); // queue full
    expect(p.wartend).toBe(2);
    erster();
    const freiA = (await a)!;
    expect(p.laufend).toBe(1);
    freiA();
    const freiB = (await b)!;
    freiB();
    freiB();
    expect(p.laufend).toBe(0);
    const blockiert = p.belege()!;
    expect(await p.warte(20)).toBeNull(); // timed out
    expect(p.wartend).toBe(0);
    blockiert();
    expect(p.laufend).toBe(0);
  });
  it('pro Schlüssel begrenzt, Einträge verschwinden bei 0', () => {
    const p = new SchluesselParallelitaet(2);
    const a1 = p.belege('a')!;
    const a2 = p.belege('a')!;
    expect(p.belege('a')).toBeNull();
    expect(p.belege('b')).toBeTypeOf('function');
    a1();
    a1();
    a2();
    expect(p.belege('a')).toBeTypeOf('function');
  });
});

describe('M-1: Client-Adresse nur aus dem Server-Header', () => {
  const ctx = (h: Record<string, string>) => ({ request: new Request('http://a/', { headers: h }) });
  it('liest x-raumstrom-client-ip, ignoriert X-Forwarded-For und ungültige Werte', () => {
    expect(CLIENT_IP_HEADER).toBe('x-raumstrom-client-ip');
    expect(socketAdresse(ctx({ [CLIENT_IP_HEADER]: '192.0.2.7', 'x-forwarded-for': '198.51.100.1' }))).toBe('192.0.2.7');
    expect(socketAdresse(ctx({ [CLIENT_IP_HEADER]: '2001:db8::1' }))).toBe('2001:db8::1');
    expect(socketAdresse(ctx({ 'x-forwarded-for': '198.51.100.1' }))).toBeUndefined();
    expect(socketAdresse(ctx({ [CLIENT_IP_HEADER]: '192.0.2.7, 198.51.100.1' }))).toBeUndefined();
    expect(socketAdresse(ctx({ [CLIENT_IP_HEADER]: 'unbekannt' }))).toBeUndefined();
  });
  it('ohne Header: ein gemeinsamer Bucket, wechselnder X-Forwarded-For hilft nicht (TRUST_PROXY=false)', async () => {
    const k = kontext(false);
    const kennungen = new Set([1, 2, 3].map((i) => clientKennung(new Request('http://a/', { headers: { 'x-forwarded-for': `192.0.2.${i}` } }), undefined, k)));
    expect(kennungen.size).toBe(1);
    const s = [];
    for (let i = 0; i < 6; i++) {
      const req = ohneToken({ 'x-forwarded-for': `198.51.100.${i}` });
      s.push((await verarbeiteKontakt(req, abh(k, socketAdresse({ request: req })))).status);
    }
    expect(s).toEqual([403, 403, 403, 403, 403, 429]);
  });
});

describe('M-2: HEIC im Worker, höchstens ein Bild gleichzeitig', () => {
  it('niedrigeres Pixellimit für HEIC', () => {
    expect(MAX_PIXEL_HEIC).toBeLessThan(MAX_PIXEL);
    expect(MAX_PIXEL_HEIC).toBeGreaterThanOrEqual(5712 * 4284); // 24-MP iPhone photo
    expect(BILD_SLOT.max).toBe(1);
  });
  it('dekodiert im Worker (RGB ohne Alpha); Pixellimit und Zeitlimit greifen dort', async () => {
    const roh = await dekodiereImWorker(HEIC);
    expect([roh.breite, roh.hoehe, roh.kanaele, roh.pixel.byteLength]).toEqual([96, 64, 3, 96 * 64 * 3]);
    await expect(dekodiereImWorker(HEIC, { maxPixel: 100 })).rejects.toMatchObject({ grund: 'zu-gross' });
    await expect(dekodiereImWorker(HEIC, { timeoutMs: 1 })).rejects.toMatchObject({ grund: 'defekt' });
    await expect(dekodiereImWorker(Buffer.concat([HEIC.subarray(0, 40), Buffer.alloc(100)]))).rejects.toMatchObject({ grund: 'defekt' });
  });
  it('Warteschlange: nie mehr als ein Bild, volle Schlange -> ausgelastet (503)', async () => {
    const belegt = BILD_SLOT.belege()!;
    const wartend = Array.from({ length: BILD_SLOT.maxWartende }, (_, i) => kodiereNeu(HEIC, i + 1));
    await expect(kodiereNeu(HEIC, 9)).rejects.toMatchObject({ grund: 'ausgelastet' });
    let max = 0;
    const messung = setInterval(() => (max = Math.max(max, BILD_SLOT.laufend)), 1);
    belegt();
    const ergebnisse = await Promise.all(wartend);
    clearInterval(messung);
    expect(ergebnisse.every((r) => r.typ === 'image/jpeg' && r.inhalt.byteLength > 0)).toBe(true);
    expect(max).toBeLessThanOrEqual(1);
    expect(BILD_SLOT.laufend).toBe(0);
  });
  it('Event-Loop bleibt während der Dekodierung frei', async () => {
    let ticks = 0;
    const t = setInterval(() => ticks++, 1);
    await kodiereNeu(HEIC, 1);
    clearInterval(t);
    expect(ticks).toBeGreaterThan(0);
  });
});

describe('L-3: Anzeigename', () => {
  it('neutralisiert Encoded-Words, Steuer- und Formatzeichen', () => {
    expect(anzeigeName('Eve "Boss" <ceo@firma.de>, x@y.de; =?utf-8?B?QmNjOiB2QHguZGU=?=')).toBe('Eve Boss ceo firma.de x y.de utf-8?B?QmNjOiB2QHguZGU =');
    expect(anzeigeName('a=?b?=c')).not.toMatch(/=\?|\?=/);
    expect(anzeigeName('=?=?==??')).not.toMatch(/=\?|\?=/);
    expect(anzeigeName('Erika‮etsum​ Muster x')).toBe('Erika etsum Muster x');
    expect(anzeigeName('Ärger mit Öl?')).toBe('Ärger mit Öl?');
    expect(Array.from(anzeigeName('😀'.repeat(150)))).toHaveLength(100);
  });
});

describe('L-4: Eingangsbestätigungen begrenzt (frisches Modul)', () => {
  it('höchstens 2 je Adresse, 20 je Stunde insgesamt; gesperrte Adresse verbraucht kein Budget', async () => {
    vi.resetModules();
    const { darfBestaetigen } = await import('../../src/lib/security/kontakt-ablauf.ts');
    const k = kontext();
    expect([darfBestaetigen(k, 'a@x.de'), darfBestaetigen(k, 'A@x.de'), darfBestaetigen(k, 'a@x.de')]).toEqual([true, true, false]);
    for (let i = 0; i < 5; i++) expect(darfBestaetigen(k, 'a@x.de')).toBe(false);
    const rest = Array.from({ length: 19 }, (_, i) => darfBestaetigen(k, `p${i}@x.de`));
    expect(rest.filter(Boolean)).toHaveLength(18);
    expect(rest.at(-1)).toBe(false);
  });
});

describe('Formular: QA B1 und A11y', () => {
  it('B1: Einhängepunkt trägt nicht die Klasse "altcha" (altcha.css versteckt .altcha)', () => {
    const astro = readFileSync(new URL('../../src/components/forms/KontaktFormular.astro', import.meta.url), 'utf8');
    const platz = astro.match(/<div[^>]*data-altcha-platz[^>]*>/)?.[0] ?? '';
    expect(platz).not.toBe('');
    expect(platz).not.toMatch(/class="[^"]*\baltcha\b/);
    const css = readFileSync(new URL('../../node_modules/altcha/dist/external/altcha.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.altcha\{[^}]*display:none/);
  });

  const text = (t: string): TextKnoten => ({ nodeType: 3, textContent: t });
  const el = (kinder: TextKnoten[], klasse = ''): TextKnoten => ({
    nodeType: 1,
    textContent: kinder.map((k) => k.textContent).join(''),
    childNodes: kinder,
    classList: { contains: (n: string) => klasse.split(' ').includes(n) },
  });
  it('A11y 1: vollständiger Label-Text ohne Pflichtfeld-Hinweis, Kurzname für die Einwilligung', () => {
    const label = el([text('Ich habe die '), el([text('Datenschutzerklärung')], 'textlink'), text(' zur Kenntnis genommen.'), el([text(' (Pflichtfeld)')], 'feld-pflicht')]);
    expect(beschriftung(label)).toBe('Ich habe die Datenschutzerklärung zur Kenntnis genommen.');
    expect(fehlerName('einwilligung', label)).toBe('Datenschutzhinweis');
    const nameLabel = el([text('Ihr '), el([text('Name')]), el([text(' (Pflichtfeld)')], 'feld-pflicht')]);
    expect(fehlerName('name', nameLabel)).toBe('Ihr Name');
    expect(fehlerName('name', nameLabel, 'Name')).toBe('Name');
    expect(fehlerName('ort', null)).toBe('ort');
  });
  it('A11y 2: erstes Fehlerfeld in Dokumentreihenfolge', () => {
    const reihenfolge = ['name', 'email', 'telefon', 'nachricht', 'fotos', 'einwilligung'];
    expect(erstesFehlerfeld(reihenfolge, { einwilligung: 'x', email: 'y' })).toBe('email');
    expect(erstesFehlerfeld(reihenfolge, {})).toBeUndefined();
    expect(erstesFehlerfeld(reihenfolge, { csrf: 'x' })).toBeUndefined();
  });
  it('A11y: Formular-Skript nutzt die Helfer (kein firstChild mehr, Fokus aufs Feld)', () => {
    const js = readFileSync(new URL('../../src/components/forms/kontakt-formular.ts', import.meta.url), 'utf8');
    expect(js).not.toMatch(/firstChild/);
    expect(js).toMatch(/erstesFehlerfeld\(/);
    expect(js).toMatch(/fehlerName\(/);
  });
});
