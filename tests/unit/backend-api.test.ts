// backend-api: CSRF, origin, rate limit, replay, ALTCHA, validation, magic bytes, re-encoding, mails and
// the whole POST /api/contact flow with a fake mailer (no SMTP). E2E against Mailpit: tests/e2e/kontakt-api.spec.ts.
import { readFileSync } from 'node:fs';
import { crc32 } from 'node:zlib';
import sharp from 'sharp';
import { parse } from 'yaml';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { solveChallenge } from 'altcha-lib';
import { deriveKey } from 'altcha-lib/algorithms/pbkdf2';
import type { SendMailOptions } from 'nodemailer';
import { altchaSchluessel, erzeugeChallenge, pruefeAltcha } from '../../src/lib/security/altcha.ts';
import type { ApiKontext } from '../../src/lib/security/api.ts';
import { CSRF_GUELTIG_MS, erzeugeCsrfToken, pruefeCsrfToken, verbraucheCsrfToken } from '../../src/lib/security/csrf.ts';
import { istGleicherUrsprung } from '../../src/lib/security/herkunft.ts';
import { empfaenger, verarbeiteKontakt } from '../../src/lib/security/kontakt-ablauf.ts';
import { MELDUNG, pruefeDateiLimits, validiere, zerlege } from '../../src/lib/security/kontakt-validierung.ts';
import { ableiten, clientAdresse, netzKennung } from '../../src/lib/security/schluessel.ts';
import { BEREINIGUNG_MS, EinmalSpeicher, MAX_AUFBEWAHRUNG_MS, Parallelitaet, RateLimiter } from '../../src/lib/security/speicher.ts';
import { LIMITS as API_LIMITS } from '../../src/lib/security/api.ts';
import { anfrageMail, anzeigeName, bestaetigungMail } from '../../src/lib/mail/kontakt-mails.ts';
import { erzeugeTransport } from '../../src/lib/mail/transport.ts';
import { BildFehler, kodiereNeu } from '../../src/lib/uploads/bild.ts';
import { erkenneBildTyp } from '../../src/lib/uploads/signatur.ts';
import type { Firma } from '../../src/lib/schemas/index.ts';

const SECRET = 'unit-test-secret-0123456789abcdef0123456789';
const firma = parse(readFileSync(new URL('../../src/content/settings/firma.yaml', import.meta.url), 'utf8')) as Firma;
const HEIC = readFileSync(new URL('../fixtures/backend-api/testbild.heic', import.meta.url));
const KOSTEN_TEST = { cost: 10, counterMin: 50, counterMax: 200 } as const;

function kontext(): ApiKontext {
  return {
    env: {
      TRUST_PROXY: false,
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

async function altchaPayload(k = kontext(), now = Date.now()) {
  const challenge = await erzeugeChallenge(k.altcha, now, KOSTEN_TEST);
  const solution = await solveChallenge({ challenge, deriveKey });
  return Buffer.from(JSON.stringify({ challenge, solution })).toString('base64');
}

const jpegMitExif = () =>
  sharp({ create: { width: 64, height: 48, channels: 3, background: '#3d6300' } })
    .jpeg()
    .withExif({
      IFD0: { Make: 'Testkamera', Model: 'Geheim 1', Copyright: 'Max Mustermann' },
      IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '50/1 3/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '10/1 14/1 0/1' },
    })
    .toBuffer();

/** PNG header announcing 20000 x 20000 pixels (decompression bomb), no real pixel data. */
function pngBombe(): Buffer {
  const chunk = (typ: string, daten: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(daten.length);
    const td = Buffer.concat([Buffer.from(typ, 'ascii'), daten]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(20000, 0);
  ihdr.writeUInt32BE(20000, 4);
  ihdr.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', Buffer.alloc(0)), chunk('IEND', Buffer.alloc(0))]);
}

describe('CSRF-Token', () => {
  const key = ableiten(SECRET, 'csrf');
  it('gültig, signiert, ablaufend', () => {
    const t = erzeugeCsrfToken(key, 1_000_000);
    expect(pruefeCsrfToken(key, t, 1_000_001).ok).toBe(true);
    expect(pruefeCsrfToken(key, t, 1_000_000 + CSRF_GUELTIG_MS + 1)).toEqual({ ok: false, grund: 'abgelaufen' });
    expect(pruefeCsrfToken(ableiten('anderes-secret-0123456789abcdef01234', 'csrf'), t, 1_000_001)).toEqual({ ok: false, grund: 'signatur' });
  });
  it('Manipulation und Unsinn werden abgelehnt', () => {
    const t = erzeugeCsrfToken(key);
    const [v, bis, id, sig] = t.split('.');
    const laenger = `${v}.${(Number.parseInt(bis!, 36) + 1e9).toString(36)}.${id}.${sig}`;
    expect(pruefeCsrfToken(key, laenger).ok).toBe(false);
    for (const x of [undefined, '', 'abc', 'v1...', t + 'x', 'x'.repeat(500), 42]) expect(pruefeCsrfToken(key, x).ok).toBe(false);
  });
  it('ist nur einmal verwendbar', () => {
    const speicher = new EinmalSpeicher();
    const p = pruefeCsrfToken(key, erzeugeCsrfToken(key));
    if (!p.ok) throw new Error('Token ungültig');
    expect(verbraucheCsrfToken(speicher, p)).toBe(true);
    expect(verbraucheCsrfToken(speicher, p)).toBe(false);
  });
});

describe('Herkunft (Origin/Sec-Fetch-Site)', () => {
  const req = (h: Record<string, string>) => new Request('http://localhost/api/contact', { method: 'POST', headers: h });
  const o = { trustProxy: false, erlaubt: ['https://raumstrom.de'] };
  it('gleicher Ursprung erlaubt', () => {
    expect(istGleicherUrsprung(req({ origin: 'http://127.0.0.1:4399', host: '127.0.0.1:4399', 'sec-fetch-site': 'same-origin' }), o)).toBe(true);
    expect(istGleicherUrsprung(req({ origin: 'https://raumstrom.de', host: 'intern:8080' }), o)).toBe(true);
  });
  it('fremde, fehlende oder verdächtige Herkunft abgelehnt', () => {
    expect(istGleicherUrsprung(req({ origin: 'https://boese.example', host: 'raumstrom.de' }), o)).toBe(false);
    expect(istGleicherUrsprung(req({ host: 'raumstrom.de' }), o)).toBe(false);
    expect(istGleicherUrsprung(req({ origin: 'null', host: 'raumstrom.de' }), o)).toBe(false);
    expect(istGleicherUrsprung(req({ origin: 'https://raumstrom.de', host: 'raumstrom.de', 'sec-fetch-site': 'cross-site' }), o)).toBe(false);
    expect(istGleicherUrsprung(req({ origin: 'https://raumstrom.de', host: 'raumstrom.de', 'sec-fetch-site': 'same-site' }), o)).toBe(false);
  });
  it('X-Forwarded-Host nur mit TRUST_PROXY', () => {
    const r = req({ origin: 'https://raumstrom.de:8443', host: 'intern', 'x-forwarded-host': 'raumstrom.de:8443' });
    expect(istGleicherUrsprung(r, { trustProxy: false })).toBe(false);
    expect(istGleicherUrsprung(r, { trustProxy: true })).toBe(true);
  });
});

describe('Rate-Limit und Replay-Speicher', () => {
  it('blockiert nach max und gibt nach dem Fenster wieder frei', () => {
    let t = 0;
    const rl = new RateLimiter(3, 1000, 100, () => t);
    expect([1, 2, 3].map(() => rl.pruefe('a').erlaubt)).toEqual([true, true, true]);
    const r = rl.pruefe('a');
    expect(r.erlaubt).toBe(false);
    expect(r.retryNachS).toBeGreaterThanOrEqual(1);
    expect(rl.pruefe('b').erlaubt).toBe(true);
    t = 1000;
    expect(rl.pruefe('a').erlaubt).toBe(true);
  });
  it('Speicher bleibt bei Flut begrenzt', () => {
    const rl = new RateLimiter(1, 60_000, 50, () => 0);
    for (let i = 0; i < 500; i++) rl.pruefe(`k${i}`);
    const es = new EinmalSpeicher(50, () => 0);
    for (let i = 0; i < 500; i++) es.markiere(`n${i}`, 1000);
    expect(es.groesse).toBeLessThanOrEqual(50);
  });
  it('Einmal-Speicher erkennt Wiederholung bis zum Ablauf', () => {
    let t = 0;
    const es = new EinmalSpeicher(100, () => t);
    expect(es.markiere('x', 100)).toBe(true);
    expect(es.markiere('x', 100)).toBe(false);
    t = 101;
    expect(es.markiere('x', 200)).toBe(true);
  });
  it('Parallelität begrenzt', () => {
    const p = new Parallelitaet(1);
    const frei = p.belege();
    expect(frei).toBeTypeOf('function');
    expect(p.belege()).toBeNull();
    frei!();
    frei!();
    expect(p.belege()).toBeTypeOf('function');
  });
  it('Client-Kennung: IPv6 als /64, X-Forwarded-For nur mit TRUST_PROXY (letzter Eintrag)', () => {
    expect(netzKennung('2001:db8:1:2:aaaa::1')).toBe(netzKennung('2001:db8:1:2:ffff:1:2:3'));
    expect(netzKennung('2001:db8:1:2::1')).not.toBe(netzKennung('2001:db8:1:3::1'));
    expect(netzKennung('::ffff:192.0.2.1')).toBe('192.0.2.1');
    const r = new Request('http://x/', { headers: { 'x-forwarded-for': '198.51.100.7, 203.0.113.9' } });
    expect(clientAdresse(r, '10.0.0.1', false)).toBe('10.0.0.1');
    expect(clientAdresse(r, '10.0.0.1', true)).toBe('203.0.113.9');
  });
});

describe('Zeitbasierte Löschung (spätestens nach 24 h, Fake-Timer)', () => {
  afterEach(() => vi.useRealTimers());
  it('Timer räumt abgelaufene Einträge auch ohne weitere Zugriffe', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const rl = new RateLimiter(2, 23 * 60 * 60 * 1000);
    const es = new EinmalSpeicher();
    rl.pruefe('hmac-der-adresse');
    es.markiere('nonce', Date.now() + 10 * 60 * 1000);
    expect([rl.groesse, es.groesse]).toEqual([1, 1]);
    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(es.groesse).toBe(0);
    expect(rl.groesse).toBe(1);
    vi.advanceTimersByTime(MAX_AUFBEWAHRUNG_MS - 15 * 60 * 1000);
    expect(rl.groesse).toBe(0);
  });
  it('Ablaufzeiten über 24 h werden gekappt, zu lange Fenster abgelehnt', () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    const es = new EinmalSpeicher();
    es.markiere('x', Date.now() + 7 * MAX_AUFBEWAHRUNG_MS);
    vi.advanceTimersByTime(MAX_AUFBEWAHRUNG_MS);
    expect(es.groesse).toBe(0);
    expect(() => new RateLimiter(1, MAX_AUFBEWAHRUNG_MS)).toThrow();
  });
  it('Bereinigung auch beim Zugriff (höchstens alle 5 min), eigene Uhr', () => {
    let t = 0;
    const rl = new RateLimiter(1, 60_000, 1000, () => t);
    for (let i = 0; i < 10; i++) rl.pruefe(`k${i}`);
    t = BEREINIGUNG_MS;
    rl.pruefe('neu');
    expect(rl.groesse).toBe(1);
  });
  it('API-Limits halten Fenster plus Bereinigungsintervall unter 24 h', () => {
    for (const l of Object.values(API_LIMITS)) expect(l.fensterMs + BEREINIGUNG_MS).toBeLessThanOrEqual(MAX_AUFBEWAHRUNG_MS);
  });
});

describe('ALTCHA mit Replay-Schutz', () => {
  it('gültige Lösung einmal akzeptiert, Wiederholung abgelehnt', async () => {
    const k = kontext();
    const speicher = new EinmalSpeicher();
    const p = await altchaPayload(k);
    expect(await pruefeAltcha(p, k.altcha, speicher)).toEqual({ ok: true });
    expect(await pruefeAltcha(p, k.altcha, speicher)).toEqual({ ok: false, grund: 'wiederholt' });
  });
  it('falscher Schlüssel, manipulierte Lösung, Ablauf und Unsinn abgelehnt', async () => {
    const k = kontext();
    const speicher = new EinmalSpeicher();
    const p = await altchaPayload(k);
    expect((await pruefeAltcha(p, altchaSchluessel('ein-ganz-anderer-schluessel-0123456789'), speicher)).ok).toBe(false);
    const obj = JSON.parse(Buffer.from(p, 'base64').toString());
    // Deterministic mode: the signed derived key is what proves the work (the counter is not re-derived).
    obj.solution.derivedKey = obj.solution.derivedKey.replace(/^./, (c: string) => (c === '0' ? '1' : '0'));
    expect(await pruefeAltcha(Buffer.from(JSON.stringify(obj)).toString('base64'), k.altcha, speicher)).toMatchObject({ ok: false });
    const alt = await altchaPayload(k, Date.now() - 11 * 60_000);
    expect(await pruefeAltcha(alt, k.altcha, speicher)).toEqual({ ok: false, grund: 'abgelaufen' });
    expect(await pruefeAltcha(undefined, k.altcha, speicher)).toEqual({ ok: false, grund: 'fehlt' });
    expect(await pruefeAltcha('%%%', k.altcha, speicher)).toEqual({ ok: false, grund: 'format' });
    expect(await pruefeAltcha(Buffer.from('{"test":true}').toString('base64'), k.altcha, speicher)).toEqual({ ok: false, grund: 'format' });
    expect(speicher.groesse).toBe(0);
  });
  it('Challenge nutzt PBKDF2, ist signiert und läuft ab', async () => {
    const c = await erzeugeChallenge(kontext().altcha);
    expect(c.parameters.algorithm).toBe('PBKDF2/SHA-256');
    expect(c.signature).toBeTruthy();
    expect(c.parameters.expiresAt).toBeGreaterThan(Date.now() / 1000);
  });
});

describe('Validierung', () => {
  const gut = { name: 'Erika Muster', email: 'erika@beispiel.de', nachricht: 'Bad im Altbau, etwa 8 m², ab Frühjahr.', einwilligung: 'ja' };
  it('gültige Anfrage wird normalisiert', () => {
    const r = validiere({ ...gut, telefon: ' +49 9721 123-45 ', anliegen: 'sonstiges', name: '  Erika   Muster ' }, ['badsanierung']);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.daten).toMatchObject({ name: 'Erika Muster', telefon: '+49 9721 123-45', anliegen: 'sonstiges' });
  });
  it('Pflichtfelder, Formate und Steuerzeichen', () => {
    const r = validiere({ name: 'E', email: 'kein-mail', nachricht: 'kurz', einwilligung: 'nein', telefon: 'ruf an', anliegen: 'gibt-es-nicht' }, ['badsanierung']);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.fehler).sort()).toEqual(['anliegen', 'einwilligung', 'email', 'nachricht', 'name', 'telefon']);
    for (const name of ['Erika\r\nBcc: opfer@example.com', 'Erika\u0000', 'Erika‮evil']) {
      const x = validiere({ ...gut, name }, []);
      expect(x.ok, JSON.stringify(name)).toBe(false);
    }
    expect(validiere({ ...gut, email: 'a@b.de\r\nBcc: x@y.de' }, []).ok).toBe(false);
    expect(validiere({ ...gut, nachricht: 'x'.repeat(4001) }, []).ok).toBe(false);
    expect(validiere({ ...gut, skizze: '{kaputt' }, []).ok).toBe(false);
    const leer = validiere({}, []);
    expect(leer.ok).toBe(false);
    if (!leer.ok) expect(leer.fehler.name).toBe(MELDUNG.name);
  });
  it('FormData: unbekannte oder doppelte Felder abgelehnt, leere Datei ignoriert', () => {
    const f = new FormData();
    f.set('name', 'Erika');
    f.append('fotos', new File([], ''));
    expect(zerlege(f)).toEqual({ felder: { name: 'Erika' }, dateien: [] });
    f.append('name', 'Zweiter');
    expect(zerlege(f)).toBeNull();
    const g = new FormData();
    g.set('bcc', 'x@y.de');
    expect(zerlege(g)).toBeNull();
    const h = new FormData();
    h.set('name', new File(['x'], 'a.txt'));
    expect(zerlege(h)).toBeNull();
  });
  it('Datei-Limits (Anzahl, Einzelgröße, Gesamtgröße)', () => {
    const mb = (n: number) => new File([new Uint8Array(n * 1024 * 1024)], 'x.jpg');
    expect(pruefeDateiLimits([mb(1), mb(1)])).toBeNull();
    expect(pruefeDateiLimits(Array.from({ length: 6 }, () => mb(0.01)))).toBe(MELDUNG.fotosAnzahl);
    expect(pruefeDateiLimits([mb(11)])).toBe(MELDUNG.fotosGroesse);
    expect(pruefeDateiLimits([mb(9), mb(9), mb(9)])).toBe(MELDUNG.fotosGesamt);
  });
});

describe('Uploads: Signatur und Neukodierung', () => {
  it('erkennt Bildtypen am Inhalt, nicht am Namen', async () => {
    const roh = sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } });
    expect(erkenneBildTyp(await roh.clone().jpeg().toBuffer())).toBe('jpeg');
    expect(erkenneBildTyp(await roh.clone().png().toBuffer())).toBe('png');
    expect(erkenneBildTyp(await roh.clone().webp().toBuffer())).toBe('webp');
    expect(erkenneBildTyp(HEIC)).toBe('heic');
    expect(erkenneBildTyp(await roh.clone().avif().toBuffer())).toBeNull();
    expect(erkenneBildTyp(await roh.clone().gif().toBuffer())).toBeNull();
    expect(erkenneBildTyp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))).toBeNull();
    expect(erkenneBildTyp(Buffer.from('%PDF-1.7\n%âãÏÓ\n1 0 obj'))).toBeNull();
    expect(erkenneBildTyp(Buffer.from('<!doctype html><html>'))).toBeNull();
    expect(erkenneBildTyp(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
  it('Neukodierung entfernt EXIF (inkl. GPS) und vergibt den Dateinamen', async () => {
    const original = await jpegMitExif();
    const vorher = await sharp(original).metadata();
    expect(vorher.exif).toBeDefined();
    expect(original.includes(Buffer.from('Testkamera'))).toBe(true);
    const neu = await kodiereNeu(original, 2);
    const nachher = await sharp(neu.inhalt).metadata();
    expect(neu.dateiname).toBe('foto-2.jpg');
    expect(nachher.format).toBe('jpeg');
    expect(nachher.exif).toBeUndefined();
    expect(nachher.icc).toBeUndefined();
    expect(nachher.xmp).toBeUndefined();
    expect(neu.inhalt.includes(Buffer.from('Testkamera'))).toBe(false);
    expect(neu.inhalt.includes(Buffer.from('Mustermann'))).toBe(false);
  });
  it('wendet die EXIF-Ausrichtung an, bevor die Metadaten fallen', async () => {
    const hoch = await sharp({ create: { width: 40, height: 20, channels: 3, background: '#000' } }).jpeg().withMetadata({ orientation: 6 }).toBuffer();
    const neu = await sharp((await kodiereNeu(hoch, 1)).inhalt).metadata();
    expect([neu.width, neu.height]).toEqual([20, 40]);
    expect(neu.orientation).toBeUndefined();
  });
  it('HEIC wird dekodiert und als JPEG neu kodiert', async () => {
    const neu = await kodiereNeu(HEIC, 1);
    const m = await sharp(neu.inhalt).metadata();
    expect([m.format, m.width, m.height]).toEqual(['jpeg', 96, 64]);
  });
  it('große Bilder werden verkleinert, PNG mit Transparenz wird geflättet', async () => {
    const gross = await sharp({ create: { width: 4000, height: 1000, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const m = await sharp((await kodiereNeu(gross, 1)).inhalt).metadata();
    expect([m.width, m.height, m.hasAlpha]).toEqual([2560, 640, false]);
  });
  it('Fälschungen, defekte Dateien und Dekompressionsbomben werden abgelehnt', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
    await expect(kodiereNeu(svg, 1)).rejects.toMatchObject({ grund: 'typ' });
    const kaputt = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 7)]);
    await expect(kodiereNeu(kaputt, 1)).rejects.toBeInstanceOf(BildFehler);
    await expect(kodiereNeu(pngBombe(), 1)).rejects.toMatchObject({ grund: 'zu-gross' });
    const heicKaputt = Buffer.concat([HEIC.subarray(0, 40), Buffer.alloc(100)]);
    await expect(kodiereNeu(heicKaputt, 1)).rejects.toMatchObject({ grund: 'defekt' });
  });
});

describe('Mails', () => {
  const daten = { name: 'Erika "Chef" <Muster>', email: 'erika@beispiel.de', telefon: '', ort: '97421 Schweinfurt', anliegen: '', nachricht: 'Kaufen Sie https://spam.example jetzt!', skizze: undefined, einwilligung: 'ja' as const };
  const k = { firma, mailFrom: 'anfrage@raumstrom.de', empfaenger: 'eingang@raumstrom.test', anliegenTitel: null, eingang: new Date('2026-11-18T10:00:00Z') };
  it('Anfrage: Absender eigene Domain, Kunde nur Reply-To, Text ohne HTML', () => {
    const m = anfrageMail(daten, [], k);
    expect(m.from).toEqual({ name: 'RAUMSTROM Website', address: 'anfrage@raumstrom.de' });
    expect(m.to).toBe('eingang@raumstrom.test');
    expect(m.replyTo).toEqual({ name: 'Erika Chef Muster', address: 'erika@beispiel.de' });
    expect(m.subject).toBe('Neue Anfrage über die Website');
    expect(m.html).toBeUndefined();
    expect(String(m.text)).toContain('Kaufen Sie https://spam.example jetzt!');
    expect(m.disableFileAccess && m.disableUrlAccess).toBe(true);
  });
  it('Eingangsbestätigung enthält keine Nutzereingaben (kein Spam-Relay)', () => {
    const m = bestaetigungMail(daten.email, k);
    const alles = JSON.stringify(m);
    for (const teil of ['Erika', 'spam.example', 'Schweinfurt', 'Kaufen']) expect(alles).not.toContain(teil);
    expect(m.to).toBe('erika@beispiel.de');
    expect(m.from).toEqual({ name: 'RAUMSTROM', address: 'anfrage@raumstrom.de' });
    expect(m.attachments).toBeUndefined();
    expect((m.headers as Record<string, string>)['Auto-Submitted']).toBe('auto-replied');
  });
  it('Anzeigename ohne Zeichen, die die Adresse verändern könnten', () => {
    expect(anzeigeName('a"b<c>d,e;f:g\\h@i\r\nj')).toBe('a b c d e f g h i j');
  });
  it('SMTP-Transport erzwingt TLS und Zertifikatsprüfung, kein Datei-/URL-Zugriff', () => {
    const t = erzeugeTransport({ SMTP_HOST: 'smtp.example', SMTP_PORT: 587, SMTP_SECURE: false, SMTP_USER: 'u', SMTP_PASS: 'p' });
    const o = (t as unknown as { options: Record<string, unknown> }).options;
    expect(o).toMatchObject({ secure: false, requireTLS: true, disableFileAccess: true, disableUrlAccess: true, tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' } });
  });
  it('Empfänger aus firma.yaml, Staging-Adresse nur solange Platzhalter', () => {
    expect(empfaenger(firma, 'staging@raumstrom.test')).toBe('staging@raumstrom.test');
    expect(empfaenger(firma, undefined)).toBeNull();
    const echt = { ...firma, kontakt: { ...firma.kontakt, anfragen_empfaenger: 'anfragen@raumstrom.de' } };
    expect(empfaenger(echt, 'staging@raumstrom.test')).toBe('anfragen@raumstrom.de');
  });
});

describe('POST /api/contact (Ablauf mit Test-Mailer)', () => {
  let ip = 0;
  async function anfrage(felder: Record<string, string>, opts: { dateien?: File[]; headers?: Record<string, string>; ohneCsrf?: boolean; ohneAltcha?: boolean } = {}) {
    const k = kontext();
    const f = new FormData();
    const basis: Record<string, string> = {
      name: 'Erika Muster',
      email: 'erika@beispiel.de',
      nachricht: 'Wir planen ein neues Bad im Altbau.',
      einwilligung: 'ja',
      website: '',
      ...(opts.ohneCsrf ? {} : { csrf: erzeugeCsrfToken(k.csrfKey) }),
      ...(opts.ohneAltcha ? {} : { altcha: await altchaPayload(k) }),
      ...felder,
    };
    for (const [n, v] of Object.entries(basis)) f.set(n, v);
    for (const d of opts.dateien ?? []) f.append('fotos', d);
    const req = new Request('http://localhost/api/contact', { method: 'POST', body: f, headers: { origin: 'http://127.0.0.1:4399', host: '127.0.0.1:4399', 'sec-fetch-site': 'same-origin', ...opts.headers } });
    const mails: SendMailOptions[] = [];
    ip += 1;
    const e = await verarbeiteKontakt(req, { kontext: k, firma, anliegen: new Map([['badsanierung', 'Badsanierung']]), sende: async (m) => void mails.push(m), socketAdresse: `192.0.2.${ip}` });
    return { e, mails };
  }

  it('Erfolg mit Foto: Anfrage an Empfänger (Foto neu kodiert) plus Bestätigung', async () => {
    const foto = new File([await jpegMitExif()], 'IMG_0001.svg', { type: 'image/svg+xml' });
    const { e, mails } = await anfrage({ anliegen: 'badsanierung' }, { dateien: [foto] });
    expect(e).toEqual({ status: 200, ok: true });
    expect(mails).toHaveLength(2);
    const [an, best] = mails as [SendMailOptions, SendMailOptions];
    expect(an.to).toBe('eingang@raumstrom.test');
    expect(an.subject).toBe('Neue Anfrage: Badsanierung');
    const anhang = (an.attachments ?? [])[0] as { filename: string; content: Buffer };
    expect(anhang.filename).toBe('foto-1.jpg');
    expect((await sharp(anhang.content).metadata()).exif).toBeUndefined();
    expect(best.to).toBe('erika@beispiel.de');
  });
  it('Honeypot: Antwort wie Erfolg, aber kein Versand', async () => {
    const { e, mails } = await anfrage({ website: 'http://spam.example' });
    expect(e.ok).toBe(true);
    expect(mails).toHaveLength(0);
  });
  it('Fehlerfälle ohne Versand', async () => {
    const faelle = [
      [await anfrage({}, { headers: { origin: 'https://boese.example', 'sec-fetch-site': 'cross-site' } }), 403],
      [await anfrage({}, { ohneCsrf: true }), 403],
      [await anfrage({}, { ohneAltcha: true }), 422],
      [await anfrage({ email: 'kaputt' }), 422],
      [await anfrage({}, { dateien: [new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'x.jpg', { type: 'image/jpeg' })] }), 422],
      [await anfrage({ bcc: 'opfer@example.com' }), 400],
    ] as const;
    for (const [{ e, mails }, status] of faelle) {
      expect(e.status).toBe(status);
      expect(mails).toHaveLength(0);
    }
  });
  it('falscher Content-Type und übergroßer Body werden vor dem Lesen abgelehnt', async () => {
    const k = kontext();
    const d = { kontext: k, firma, anliegen: new Map(), sende: async () => {}, socketAdresse: '198.51.100.1' };
    const h = { origin: 'http://a', host: 'a' };
    expect((await verarbeiteKontakt(new Request('http://a/', { method: 'POST', body: '{}', headers: { ...h, 'content-type': 'application/json' } }), d)).status).toBe(415);
    const gross = new Request('http://a/', { method: 'POST', body: 'x', headers: { ...h, 'content-type': 'multipart/form-data; boundary=x', 'content-length': String(30 * 1024 * 1024) } });
    expect((await verarbeiteKontakt(gross, d)).status).toBe(413);
  });
  it('CSRF-Token und ALTCHA sind nicht wiederverwendbar', async () => {
    const k = kontext();
    const csrf = erzeugeCsrfToken(k.csrfKey);
    const altcha = await altchaPayload(k);
    const senden = async () => {
      const f = new FormData();
      for (const [n, v] of Object.entries({ name: 'Erika Muster', email: 'erika@beispiel.de', nachricht: 'Wir planen ein neues Bad.', einwilligung: 'ja', csrf, altcha })) f.set(n, v);
      const req = new Request('http://a/api/contact', { method: 'POST', body: f, headers: { origin: 'http://a', host: 'a' } });
      return verarbeiteKontakt(req, { kontext: k, firma, anliegen: new Map(), sende: async () => {}, socketAdresse: '198.51.100.2' });
    };
    expect((await senden()).status).toBe(200);
    expect((await senden()).status).toBe(422); // ALTCHA nonce already used
  });
  it('Rate-Limit pro Client', async () => {
    const k = kontext();
    const d = { kontext: k, firma, anliegen: new Map(), sende: async () => {}, socketAdresse: '198.51.100.99' };
    const req = () => new Request('http://a/', { method: 'POST', body: 'x', headers: { origin: 'http://a', host: 'a', 'content-type': 'multipart/form-data; boundary=x' } });
    const status = [];
    for (let i = 0; i < 6; i++) status.push((await verarbeiteKontakt(req(), d)).status);
    expect(status).toEqual([400, 400, 400, 400, 400, 429]);
  });
});
