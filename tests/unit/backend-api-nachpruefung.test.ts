// backend-api, fixes after the Phase-2 security re-test (SECURITY-REPORT "Phase 2 – Nachprüfung"):
// N-1 (global budget only for real sends, limit for rejected photos, IPv6 /48), N-2 (body slots only while
// reading, own pool for small bodies, displacement of slow readers, stricter rate), M-2 rest (await
// worker exit, one image at a time, RGB, alpha limit), N-3 (no libheif output), I-7 (HEAD).
import { readFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import { parse } from 'yaml';
import { describe, expect, it, vi } from 'vitest';
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import { altchaSchluessel, erzeugeChallenge } from '../../src/lib/security/altcha.ts';
import type { ApiKontext } from '../../src/lib/security/api.ts';
import { BODY_GRENZEN, leseBody, leseFrist } from '../../src/lib/security/body.ts';
import { erzeugeCsrfToken } from '../../src/lib/security/csrf.ts';
import type { KontaktAbhaengigkeiten } from '../../src/lib/security/kontakt-ablauf.ts';
import { ableiten, netzKennung, netzSchluessel48 } from '../../src/lib/security/schluessel.ts';
import { Annahme, RateLimiter, type Lesevorgang } from '../../src/lib/security/speicher.ts';
import { dekodiereImWorker, MAX_PIXEL_HEIC, MAX_PIXEL_HEIC_ALPHA } from '../../src/lib/uploads/heic.ts';
import type { Firma } from '../../src/lib/schemas/index.ts';

const SECRET = 'unit-test-secret-nachpruefung-0123456789abc';
const firma = parse(readFileSync(new URL('../../src/content/settings/firma.yaml', import.meta.url), 'utf8')) as Firma;
const HEIC = readFileSync(new URL('../fixtures/backend-api/testbild.heic', import.meta.url));
const KOSTEN_TEST = { cost: 10, counterMin: 50, counterMax: 200 } as const;
const KOPF = { origin: 'http://a', host: 'a' };

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

const abh = (k: ApiKontext, ip: string | undefined, extra: Partial<KontaktAbhaengigkeiten> = {}): KontaktAbhaengigkeiten => ({
  kontext: k,
  firma,
  anliegen: new Map(),
  sende: async () => {},
  socketAdresse: ip,
  ...extra,
});

async function anfrage(k: ApiKontext, dateien: File[] = [], felder: Record<string, string> = {}) {
  const challenge = await erzeugeChallenge(k.altcha, Date.now(), KOSTEN_TEST);
  const solution = await solveChallenge({ challenge, deriveKey });
  const f = new FormData();
  const basis = {
    name: 'Erika Muster',
    email: 'erika@beispiel.de',
    nachricht: 'Wir planen ein neues Bad im Altbau.',
    einwilligung: 'ja',
    website: '',
    csrf: erzeugeCsrfToken(k.csrfKey),
    altcha: Buffer.from(JSON.stringify({ challenge, solution })).toString('base64'),
    ...felder,
  };
  for (const [n, v] of Object.entries(basis)) f.set(n, v);
  for (const d of dateien) f.append('fotos', d);
  // Through a Response so the request carries a real Content-Length like a browser upload.
  const r = new Response(f);
  const ct = r.headers.get('content-type')!;
  const body = new Uint8Array(await r.arrayBuffer());
  return new Request('http://a/api/contact', { method: 'POST', body, headers: { ...KOPF, 'content-type': ct, 'content-length': String(body.byteLength) } });
}

const keinBild = () => new File(['kein bild'], 'x.jpg', { type: 'image/jpeg' });
const heicDatei = () => new File([HEIC], 'f.heic', { type: 'image/heic' });

/** Fresh modules: limits, pools and slots start empty. */
async function frisch() {
  vi.resetModules();
  const ablauf = await import('../../src/lib/security/kontakt-ablauf.ts');
  const api = await import('../../src/lib/security/api.ts');
  const bild = await import('../../src/lib/uploads/bild.ts');
  return { ...ablauf, ...api, BILD_SLOT: bild.BILD_SLOT };
}

describe('N-1: globales Budget nur für echte Versandversuche', () => {
  it('RateLimiter.stand liest, ohne zu zählen', () => {
    const l = new RateLimiter(2, 60_000);
    expect(l.stand('a')).toEqual({ erlaubt: true, retryNachS: 0 });
    l.pruefe('a');
    expect(l.stand('a').erlaubt).toBe(true);
    expect(l.stand('a').erlaubt).toBe(true);
    l.pruefe('a');
    expect(l.stand('a').erlaubt).toBe(false);
    expect(l.stand('a').retryNachS).toBeGreaterThan(0);
  });

  it('Reproduktion: 12 Adressen x 5 Anfragen mit Nicht-Bild, danach legitime Anfrage -> 200 (nicht 429)', async () => {
    const m = await frisch();
    const k = kontext();
    const status: Record<number, number> = {};
    for (let a = 0; a < 12; a++) {
      for (let i = 0; i < 5; i++) {
        const e = await m.verarbeiteKontakt(await anfrage(k, [keinBild()]), abh(k, `192.0.2.${120 + a}`));
        status[e.status] = (status[e.status] ?? 0) + 1;
      }
    }
    // 3 rejected photos per client, then the client gets 429 before any image work.
    expect(status).toEqual({ 422: 36, 429: 24 });
    expect(m.LIMITS.kontaktGesamt.stand('gesamt').erlaubt).toBe(true);
    expect(await m.verarbeiteKontakt(await anfrage(k), abh(k, '198.51.100.99'))).toEqual({ status: 200, ok: true });
    expect(await m.verarbeiteKontakt(await anfrage(k, [heicDatei()]), abh(k, '198.51.100.98'))).toEqual({ status: 200, ok: true });
  }, 60_000);

  it('60 Anfragen mit defektem Foto verbrauchen kein Budget; abgelehnte Fotos sperren nur den eigenen Client für Fotos', async () => {
    const m = await frisch();
    const k = kontext();
    for (let i = 0; i < 60; i++) expect((await m.verarbeiteKontakt(await anfrage(k, [keinBild()]), abh(k, `10.2.${i}.1`))).status).toBe(422);
    expect((await m.verarbeiteKontakt(await anfrage(k), abh(k, '198.51.100.97'))).status).toBe(200);
    // One client: 3 rejected photo uploads, the 4th photo request is refused, a request without photo still works.
    const ip = '203.0.113.50';
    for (let i = 0; i < 3; i++) expect((await m.verarbeiteKontakt(await anfrage(k, [keinBild()]), abh(k, ip))).status).toBe(422);
    const gesperrt = await m.verarbeiteKontakt(await anfrage(k, [heicDatei()]), abh(k, ip));
    expect(gesperrt).toMatchObject({ status: 429 });
    expect((gesperrt as { retryNachS?: number }).retryNachS).toBeGreaterThan(0);
    expect((await m.verarbeiteKontakt(await anfrage(k), abh(k, ip))).status).toBe(200);
  }, 60_000);

  it('Budget wird unmittelbar vor dem Versand verbucht, auch wenn der Versand scheitert (502)', async () => {
    const m = await frisch();
    const k = kontext();
    const fehlschlag = async () => {
      throw Object.assign(new Error('x'), { code: 'ECONNECTION' });
    };
    for (let i = 0; i < 60; i++) expect((await m.verarbeiteKontakt(await anfrage(k), abh(k, `10.3.${i}.1`, { sende: fehlschlag }))).status).toBe(502);
    const e = await m.verarbeiteKontakt(await anfrage(k), abh(k, '10.3.200.1'));
    expect(e).toMatchObject({ status: 429 });
  }, 60_000);

  it('IPv6: alle /64 eines /48 teilen ein zusätzliches Limit (20 je 15 min)', async () => {
    expect(netzKennung('2001:db8:1:2:3::1', 48)).toBe('2001:0db8:0001::/48');
    expect(netzKennung('2001:db8:1:2:3::1')).toBe('2001:0db8:0001:0002::/64');
    const k = kontext();
    expect(netzSchluessel48(k.clientKey, '192.0.2.1')).toBeNull();
    expect(netzSchluessel48(k.clientKey, '2001:db8:1:2::1')).toBe(netzSchluessel48(k.clientKey, '2001:db8:1:ff::9'));
    const m = await frisch();
    const s: number[] = [];
    const ohne = () => new Request('http://a/api/contact', { method: 'POST', body: new FormData(), headers: KOPF });
    for (let i = 0; i < 21; i++) s.push((await m.verarbeiteKontakt(ohne(), abh(k, `2001:db8:1:${i.toString(16)}::1`))).status);
    expect(s.slice(0, 20).every((x) => x === 403)).toBe(true);
    expect(s[20]).toBe(429);
    // Another /48 is unaffected.
    expect((await m.verarbeiteKontakt(ohne(), abh(k, '2001:db8:2::1'))).status).toBe(403);
  });
});

describe('N-2: Annahme nur während des Lesens, eigener Pool für kleine Bodys', () => {
  it('strengere Mindestrate und Frist nach Content-Length', () => {
    expect(BODY_GRENZEN.minBytesProS).toBeGreaterThanOrEqual(64 * 1024);
    expect(BODY_GRENZEN.schonfristMs).toBeLessThanOrEqual(5_000);
    expect(leseFrist(null, BODY_GRENZEN)).toBe(BODY_GRENZEN.maxDauerMs);
    expect(leseFrist(64 * 1024, BODY_GRENZEN)).toBe(BODY_GRENZEN.schonfristMs + 1000);
    expect(leseFrist(20_000_000, BODY_GRENZEN)).toBe(BODY_GRENZEN.maxDauerMs);
  });

  it('Slot ist während Bildarbeit und Versand frei', async () => {
    const m = await frisch();
    const k = kontext();
    let waehrendVersand: number[] = [];
    const sende = async () => {
      waehrendVersand = [m.ANNAHME.laufend, m.ANNAHME_KLEIN.laufend, m.ANNAHME.reserviert, m.ANNAHME_KLEIN.reserviert];
    };
    expect((await m.verarbeiteKontakt(await anfrage(k, [heicDatei()]), abh(k, '198.51.100.1', { sende }))).status).toBe(200);
    expect(waehrendVersand).toEqual([0, 0, 0, 0]);
  });

  it('volle Upload-Annahme blockiert keine Anfrage ohne Foto; große Anfrage ohne verdrängbaren Leser -> 503', async () => {
    const m = await frisch();
    const k = kontext();
    const belegt = [];
    for (;;) {
      const p = m.ANNAHME.belege(m.MAX_BODY);
      if (!p) break;
      belegt.push(p);
    }
    expect(belegt.length).toBeGreaterThan(0);
    expect((await m.verarbeiteKontakt(await anfrage(k), abh(k, '198.51.100.2'))).status).toBe(200);
    const gross = new File([new Uint8Array(m.KLEIN_BODY + 1)], 'g.jpg', { type: 'image/jpeg' });
    // All readers are fresh (inside the grace period): nobody is displaced.
    expect((await m.verarbeiteKontakt(await anfrage(k, [gross]), abh(k, '198.51.100.3'))).status).toBe(503);
    for (const p of belegt) p.frei();
    expect(m.ANNAHME.reserviert).toBe(0);
  });

  it('Anfragen ohne Foto warten nicht auf Bildarbeit (volle Warteschlangen -> trotzdem 200)', async () => {
    const m = await frisch();
    const k = kontext();
    const frei = [];
    for (let i = 0; i < m.PARALLEL.max; i++) frei.push(m.PARALLEL.belege()!);
    const bildFrei = m.BILD_SLOT.belege()!;
    const t0 = Date.now();
    expect((await m.verarbeiteKontakt(await anfrage(k), abh(k, '198.51.100.4'))).status).toBe(200);
    expect(Date.now() - t0).toBeLessThan(2_000);
    bildFrei();
    for (const f of frei) f();
  });

  it('Annahme: Reservierung, Slots, Verdrängung des langsamsten Lesers nach der Schonfrist', () => {
    let jetzt = 0;
    const a = new Annahme({ maxSlots: 3, maxBytes: 300, schonfristMs: 1000, verdraengenUnterBytesProS: 100, uhr: () => jetzt });
    const abgebrochen: string[] = [];
    const lies = (name: string, res: number) => {
      const p = a.belege(res);
      if (p) p.vorgang.abbrechen = () => abgebrochen.push(name);
      return p;
    };
    const langsam = lies('langsam', 100)!;
    const schnell = lies('schnell', 100)!;
    const mittel = lies('mittel', 100)!;
    expect(a.laufend).toBe(3);
    // Full, all within the grace period: rejected, nobody cancelled.
    expect(lies('neu', 10)).toBeNull();
    jetzt = 2000;
    langsam.vorgang.bytes = 20; // 10 B/s
    mittel.vorgang.bytes = 100; // 50 B/s
    schnell.vorgang.bytes = 10_000; // 5000 B/s, never displaced
    const neu = lies('neu', 100)!;
    expect(neu).not.toBeNull();
    expect(abgebrochen).toEqual(['langsam']);
    expect(langsam.vorgang.verdraengt).toBe(true);
    expect(a.laufend).toBe(3);
    // Needs room for 2 x 100 bytes, only "mittel" is displaceable: nothing happens.
    expect(lies('riesig', 200)).toBeNull();
    expect(abgebrochen).toEqual(['langsam']);
    langsam.frei(); // late release of a displaced reader changes nothing
    expect([a.laufend, a.reserviert]).toEqual([3, 300]);
    for (const p of [schnell, mittel, neu]) p.frei();
    expect([a.laufend, a.reserviert]).toEqual([0, 0]);
  });

  it('leseBody: verdrängter Leser endet mit "verdraengt", Bytes werden mitgezählt', async () => {
    const vorgang: Lesevorgang = { start: Date.now(), bytes: 0, verdraengt: false };
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array(500));
      },
    });
    const req = new Request('http://a/', { method: 'POST', body, duplex: 'half' } as RequestInit);
    const lauf = leseBody(req, { maxBytes: 10_000, maxDauerMs: 5_000, minBytesProS: 1, schonfristMs: 5_000, pruefIntervallMs: 50 }, vorgang);
    await new Promise((r) => setTimeout(r, 30));
    expect(vorgang.bytes).toBe(500);
    vorgang.verdraengt = true;
    vorgang.abbrechen!();
    expect(await lauf).toEqual({ ok: false, grund: 'verdraengt' });
    expect(await leseBody(new Request('http://a/', { method: 'POST', body: 'x' }), { maxBytes: 10, ...BODY_GRENZEN }, vorgang)).toEqual({ ok: false, grund: 'verdraengt' });
  });

  it('verdrängte Anfrage erhält 503, Client-Slot wird frei', async () => {
    const m = await frisch();
    const k = kontext();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode('--x\r\n'));
      },
    });
    const req = new Request('http://a/api/contact', {
      method: 'POST',
      body,
      duplex: 'half',
      headers: { ...KOPF, 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(m.MAX_BODY) },
    } as RequestInit);
    const lauf = m.verarbeiteKontakt(req, abh(k, '203.0.113.60'));
    await new Promise((r) => setTimeout(r, 20));
    expect(m.ANNAHME.laufend).toBe(1);
    // Simulate displacement by a newer request (the pool does exactly this).
    const intern = m.ANNAHME as unknown as { o: { schonfristMs: number } };
    intern.o.schonfristMs = 0;
    const vollePlaetze = [];
    for (;;) {
      const p = m.ANNAHME.belege(m.MAX_BODY);
      if (!p) break;
      vollePlaetze.push(p);
      if (vollePlaetze.length > 20) break;
    }
    expect(await lauf).toMatchObject({ status: 503 });
    for (const p of vollePlaetze) p.frei();
    expect(m.ANNAHME_PRO_CLIENT.groesse).toBe(0);
  });
});

describe('M-2 Rest: Speicher bei HEIC', () => {
  it('Worker ist beendet, bevor das Ergebnis (oder der Fehler) zurückkommt', async () => {
    const original = Worker.prototype.terminate;
    let beendet = 0;
    const spy = vi.spyOn(Worker.prototype, 'terminate').mockImplementation(async function (this: Worker) {
      const code = await original.call(this);
      beendet += 1;
      return code;
    });
    try {
      await dekodiereImWorker(HEIC);
      expect(beendet).toBe(1);
      await expect(dekodiereImWorker(HEIC, { maxPixel: 10 })).rejects.toMatchObject({ grund: 'zu-gross' });
      expect(beendet).toBe(2);
    } finally {
      spy.mockRestore();
    }
  });

  it('RGB statt RGBA ohne Alpha; Bilder mit Alpha haben ein niedrigeres Pixellimit', async () => {
    const roh = await dekodiereImWorker(HEIC);
    expect(roh.kanaele).toBe(3);
    expect(MAX_PIXEL_HEIC_ALPHA).toBeLessThan(MAX_PIXEL_HEIC);
    expect(MAX_PIXEL_HEIC_ALPHA).toBeGreaterThanOrEqual(12_000_000);
  });

  it('ein Bild nach dem anderen über alle Anfragen (Dekodieren bis fertiges JPEG)', async () => {
    const m = await frisch();
    const k = kontext();
    let max = 0;
    const messung = setInterval(() => (max = Math.max(max, m.BILD_SLOT.laufend)), 1);
    const laeufe = [0, 1, 2].map(async (i) => m.verarbeiteKontakt(await anfrage(k, [heicDatei(), heicDatei()]), abh(k, `198.51.100.${30 + i}`)));
    const s = (await Promise.all(laeufe)).map((e) => e.status);
    clearInterval(messung);
    expect(s).toEqual([200, 200, 200]);
    expect(max).toBe(1);
    expect(m.BILD_SLOT.laufend).toBe(0);
    expect(m.PARALLEL.laufend).toBe(0);
  });
});

describe('N-3: keine libheif-Ausgaben im Server-Log', () => {
  it('defektes HEIC schreibt nichts nach stdout/stderr', async () => {
    const out = vi.spyOn(process.stdout, 'write');
    const err = vi.spyOn(process.stderr, 'write');
    const log = vi.spyOn(console, 'log');
    try {
      const abgeschnitten = HEIC.subarray(0, Math.floor(HEIC.byteLength * 0.6));
      await expect(dekodiereImWorker(abgeschnitten)).rejects.toMatchObject({ grund: 'defekt' });
      await expect(dekodiereImWorker(Buffer.concat([HEIC.subarray(0, 40), Buffer.alloc(100)]))).rejects.toMatchObject({ grund: 'defekt' });
      await new Promise((r) => setTimeout(r, 50));
      expect(out).not.toHaveBeenCalled();
      expect(err).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
    } finally {
      out.mockRestore();
      err.mockRestore();
      log.mockRestore();
    }
  });
});

describe('I-7: HEAD auf /api/altcha und /api/csrf', () => {
  it('kopfAntwort: Status und Header wie GET, ohne Body', async () => {
    const { kopfAntwort } = await import('../../src/lib/security/api.ts');
    const ok = kopfAntwort({ erlaubt: true, retryNachS: 0 });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toMatch(/application\/json/);
    expect(ok.headers.get('cache-control')).toBe('no-store');
    expect(ok.body).toBeNull();
    const voll = kopfAntwort({ erlaubt: false, retryNachS: 42 });
    expect([voll.status, voll.headers.get('retry-after'), voll.body]).toEqual([429, '42', null]);
  });
  it.each(['altcha', 'csrf'])('/api/%s exportiert HEAD (ohne Zählung) und nennt ihn in Allow', (name) => {
    const code = readFileSync(new URL(`../../src/pages/api/${name}.ts`, import.meta.url), 'utf8');
    expect(code).toMatch(/export const HEAD: APIRoute/);
    expect(code).toMatch(new RegExp(`LIMITS\\.${name}\\.stand\\(`));
    expect(code).toMatch(/methodeNichtErlaubt\('GET, HEAD'\)/);
  });
});
