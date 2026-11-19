// Phase-2 server fixes (Security-Report M-1, L-1, L-2) and precompressed static files,
// tested as units and against server/server.mjs with a minimal fake dist.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { brotliDecompressSync, gunzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CLIENT_IP_HEADER, clientIp, normalizeIp, prepareProxyHeaders } from '../../server/proxy.mjs';
import { acceptedEncodings, resolveStatic } from '../../server/static.mjs';
import { MIN_BYTES, precompress } from '../../scripts/lib/precompress.mjs';

type FakeReq = { headers: Record<string, string | string[] | undefined>; socket: { remoteAddress?: string } };
const fakeReq = (headers: FakeReq['headers'], remoteAddress = '192.0.2.10'): FakeReq => ({ headers: { ...headers }, socket: { remoteAddress } });

describe('M-1: Proxy-Header und Client-Adresse', () => {
  const spoofed = {
    host: 'raumstrom.de',
    'x-forwarded-for': '203.0.113.7',
    'x-forwarded-proto': 'https',
    'x-forwarded-host': 'evil.example',
    'x-forwarded-port': '443',
    'x-forwarded-prefix': '/x',
    forwarded: 'for=203.0.113.7;proto=https',
    [CLIENT_IP_HEADER]: '198.51.100.1',
  };
  it('TRUST_PROXY=false: entfernt X-Forwarded-*/Forwarded, Adresse vom Socket', () => {
    const req = fakeReq(spoofed, '::ffff:192.0.2.10');
    prepareProxyHeaders(req as never, { trustProxy: false });
    expect(req.headers).toEqual({ host: 'raumstrom.de', [CLIENT_IP_HEADER]: '192.0.2.10' });
  });
  it('TRUST_PROXY=true: Header bleiben, Adresse = letzter gültiger X-Forwarded-For-Eintrag', () => {
    const req = fakeReq({ ...spoofed, 'x-forwarded-for': '203.0.113.7, 198.51.100.23' });
    prepareProxyHeaders(req as never, { trustProxy: true });
    expect(req.headers[CLIENT_IP_HEADER]).toBe('198.51.100.23');
    expect(req.headers['x-forwarded-proto']).toBe('https');
  });
  it('TRUST_PROXY=true ohne gültigen Eintrag: Socket-Adresse', () => {
    expect(clientIp(fakeReq({ 'x-forwarded-for': '1.2.3.4, unsinn' }) as never, true)).toBe('192.0.2.10');
    expect(clientIp(fakeReq({}) as never, true)).toBe('192.0.2.10');
    expect(clientIp({ headers: {}, socket: {} } as never, false)).toBe('unbekannt');
  });
  it('normalisiert Adressen', () => {
    expect(normalizeIp('::FFFF:10.0.0.1')).toBe('10.0.0.1');
    expect(normalizeIp('2001:DB8::1')).toBe('2001:db8::1');
    expect(normalizeIp('x')).toBeUndefined();
  });
});

const root = mkdtempSync(path.join(tmpdir(), 'static-l1-'));
mkdirSync(path.join(root, 'kontakt'));
mkdirSync(path.join(root, 'über uns'));
writeFileSync(path.join(root, 'kontakt/index.html'), 'x');
writeFileSync(path.join(root, 'über uns/index.html'), 'x');
writeFileSync(path.join(root, 'kontakt/index.html.br'), 'x');
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('L-1: keine protokoll-relative Weiterleitung', () => {
  it.each(['/%2Fkontakt', '/%2f%2Fkontakt', '/%5Ckontakt', '/kontakt%2F'])('%s → 404', (p) => {
    expect(resolveStatic(root, p)).toEqual({ notFound: true });
  });
  it('Weiterleitung aus Segmenten, kodiert, genau ein führender Schrägstrich', () => {
    expect(resolveStatic(root, '//kontakt')).toEqual({ redirect: '/kontakt/' });
    expect(resolveStatic(root, '/%C3%BCber%20uns')).toEqual({ redirect: '/%C3%BCber%20uns/' });
  });
  it('vorkomprimierte Dateien nicht direkt abrufbar', () => {
    expect(resolveStatic(root, '/kontakt/index.html.br')).toEqual({ notFound: true });
  });
});

describe('Accept-Encoding', () => {
  it.each([
    ['gzip, deflate, br, zstd', ['br', 'gzip']],
    ['gzip', ['gzip']],
    ['br;q=0, gzip;q=0.5', ['gzip']],
    ['*', ['br', 'gzip']],
    ['*;q=0, gzip', ['gzip']],
    ['identity', []],
    ['', []],
  ])('%s', (h, expected) => expect([...acceptedEncodings(h)]).toEqual(expected));
});

describe('Vorkomprimierung (Build-Nachschritt)', () => {
  it('schreibt .br/.gz nur für Textdateien ab Mindestgröße und entfernt veraltete', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'precompress-'));
    const text = 'RAUMSTROM '.repeat(200);
    writeFileSync(path.join(dir, 'a.html'), text);
    writeFileSync(path.join(dir, 'b.png'), text);
    writeFileSync(path.join(dir, 'klein.css'), 'a{}');
    writeFileSync(path.join(dir, 'klein.css.br'), 'alt');
    await precompress(dir);
    expect(brotliDecompressSync(readFileSync(path.join(dir, 'a.html.br'))).toString()).toBe(text);
    expect(gunzipSync(readFileSync(path.join(dir, 'a.html.gz'))).toString()).toBe(text);
    expect(existsSync(path.join(dir, 'b.png.br'))).toBe(false);
    expect(existsSync(path.join(dir, 'klein.css.br'))).toBe(false);
    expect('a{}'.length).toBeLessThan(MIN_BYTES);
    rmSync(dir, { recursive: true, force: true });
  });
});

// --- Integration: real server, fake dist (static files + an echo handler instead of Astro) ---

const dist = mkdtempSync(path.join(tmpdir(), 'server-http-'));
const client = path.join(dist, 'client');
const PAGE = '<!doctype html><title>t</title>' + '<p>RAUMSTROM Seite</p>'.repeat(100);
mkdirSync(path.join(client, 'kontakt'), { recursive: true });
mkdirSync(path.join(dist, 'server'));
writeFileSync(path.join(client, 'index.html'), PAGE);
writeFileSync(path.join(client, 'kontakt/index.html'), PAGE);
writeFileSync(path.join(client, 'bild.png'), 'PNG'.repeat(400));
// Stands in for Astro's handler: reports the headers it receives.
writeFileSync(
  path.join(dist, 'server/entry.mjs'),
  `export function handler(req, res) { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ method: req.method, headers: req.headers, body: 'x'.repeat(2000) })); }\n`,
);
const envFile = path.join(dist, '.env');
writeFileSync(envFile, '');

async function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const s = createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address() as { port: number };
      s.close(() => resolve(port));
    });
  });
}

type Res = { status: number; headers: http.IncomingHttpHeaders; body: Buffer };
function request(port: number, method: string, p: string, headers: Record<string, string> = {}): Promise<Res> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, method, path: p, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

const servers: ReturnType<typeof spawn>[] = [];
async function start(trustProxy: boolean): Promise<number> {
  const port = await freePort();
  const child = spawn(process.execPath, ['server/server.mjs'], {
    env: {
      PATH: process.env.PATH ?? '',
      RAUMSTROM_DIST: dist,
      RAUMSTROM_ENV_FILE: envFile,
      PORT: String(port),
      TRUST_PROXY: String(trustProxy),
      ALTCHA_HMAC_KEY: 'a'.repeat(40),
      CSRF_SECRET: 'c'.repeat(40),
      SMTP_HOST: '127.0.0.1',
      SMTP_PORT: '1025',
      SMTP_USER: 'test',
      SMTP_PASS: 'p'.repeat(12),
      MAIL_FROM: 'anfrage@raumstrom.de',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  servers.push(child);
  let log = '';
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Server startet nicht: ${log}`)), 10_000);
    const on = (d: Buffer) => {
      log += d.toString();
      if (log.includes('läuft auf')) {
        clearTimeout(t);
        resolve();
      }
    };
    child.stdout?.on('data', on);
    child.stderr?.on('data', on);
  });
  return port;
}

let direct = 0;
let proxied = 0;
beforeAll(async () => {
  [direct, proxied] = await Promise.all([start(false), start(true)]);
  await precompress(client);
});
afterAll(() => {
  for (const s of servers) s.kill();
  rmSync(dist, { recursive: true, force: true });
});

const echo = (r: Res) => JSON.parse(r.body.toString()) as { method: string; headers: Record<string, string> };

describe('Server: M-1', () => {
  const spoof = { 'x-forwarded-for': '203.0.113.7', 'x-forwarded-proto': 'https', 'x-forwarded-host': 'raumstrom.de', forwarded: 'for=203.0.113.7', [CLIENT_IP_HEADER]: '198.51.100.1' };
  it('TRUST_PROXY=false: Astro sieht keine Proxy-Header, Client-Adresse vom Socket', async () => {
    const { headers } = echo(await request(direct, 'GET', '/api/echo', spoof));
    expect(headers[CLIENT_IP_HEADER]).toBe('127.0.0.1');
    expect(Object.keys(headers).filter((h) => h.startsWith('x-forwarded') || h === 'forwarded')).toEqual([]);
  });
  it('TRUST_PROXY=true: letzter X-Forwarded-For-Eintrag, eigener Header überschrieben', async () => {
    const { headers } = echo(await request(proxied, 'GET', '/api/echo', { ...spoof, 'x-forwarded-for': '203.0.113.7, 198.51.100.23' }));
    expect(headers[CLIENT_IP_HEADER]).toBe('198.51.100.23');
    expect(headers['x-forwarded-proto']).toBe('https');
  });
});

describe('Server: L-1', () => {
  it.each(['/%2Fkontakt', '/%2F%2Fkontakt'])('%s ohne protokoll-relative Location', async (p) => {
    const r = await request(direct, 'GET', p);
    expect(r.status).toBe(404);
    expect(r.headers.location).toBeUndefined();
  });
  it('/kontakt → 308 /kontakt/ (Query bleibt)', async () => {
    const r = await request(direct, 'GET', '/kontakt?a=1');
    expect(r.status).toBe(308);
    expect(r.headers.location).toBe('/kontakt/?a=1');
  });
});

describe('Server: L-2', () => {
  // CONNECT never reaches the request handler (Node emits 'connect', no listener → socket closed);
  // unknown tokens such as TRACK are rejected by Node's parser with 400.
  it.each(['TRACE', 'PROPFIND'])('%s /api/* → 405 mit Allow', async (m) => {
    const r = await request(direct, m, '/api/contact');
    expect(r.status).toBe(405);
    expect(r.headers.allow).toBe('GET, HEAD, POST');
    expect(r.headers['content-security-policy']).toBeTruthy();
  });
  it('bekannte Methoden gehen an Astro', async () => {
    expect(echo(await request(direct, 'DELETE', '/api/contact')).method).toBe('DELETE');
  });
});

describe('Server: vorkomprimierte Auslieferung', () => {
  it('br bevorzugt, Content-Type und ETag je Variante, Vary', async () => {
    const plain = await request(direct, 'GET', '/kontakt/');
    const brotli = await request(direct, 'GET', '/kontakt/', { 'accept-encoding': 'gzip, deflate, br' });
    const gz = await request(direct, 'GET', '/kontakt/', { 'accept-encoding': 'gzip' });
    expect(plain.headers['content-encoding']).toBeUndefined();
    expect(plain.body.toString()).toBe(PAGE);
    expect(brotli.headers['content-encoding']).toBe('br');
    expect(brotliDecompressSync(brotli.body).toString()).toBe(PAGE);
    expect(Number(brotli.headers['content-length'])).toBe(brotli.body.length);
    expect(gz.headers['content-encoding']).toBe('gzip');
    expect(gunzipSync(gz.body).toString()).toBe(PAGE);
    for (const r of [plain, brotli, gz]) {
      expect(r.headers['content-type']).toBe('text/html; charset=utf-8');
      expect(r.headers.vary).toBe('Accept-Encoding');
    }
    expect(new Set([plain, brotli, gz].map((r) => r.headers.etag)).size).toBe(3);
    const cached = await request(direct, 'GET', '/kontakt/', { 'accept-encoding': 'br', 'if-none-match': String(brotli.headers.etag) });
    expect(cached.status).toBe(304);
    expect(cached.headers.vary).toBe('Accept-Encoding');
  });
  it('HEAD liefert Länge der Variante ohne Body', async () => {
    const r = await request(direct, 'HEAD', '/', { 'accept-encoding': 'br' });
    expect(r.headers['content-encoding']).toBe('br');
    expect(Number(r.headers['content-length'])).toBeGreaterThan(0);
    expect(r.body.length).toBe(0);
  });
  it('veraltete Variante wird ignoriert', async () => {
    const file = path.join(client, 'index.html');
    const future = new Date(Date.now() + 60_000);
    utimesSync(file, future, future);
    const r = await request(direct, 'GET', '/', { 'accept-encoding': 'br, gzip' });
    expect(r.headers['content-encoding']).toBeUndefined();
    expect(r.body.toString()).toBe(PAGE);
  });
  it('Binärdateien und API nicht komprimiert', async () => {
    const png = await request(direct, 'GET', '/bild.png', { 'accept-encoding': 'br' });
    expect(png.headers['content-encoding']).toBeUndefined();
    expect(png.headers.vary).toBeUndefined();
    const api = await request(direct, 'GET', '/api/echo', { 'accept-encoding': 'br, gzip' });
    expect(api.headers['content-encoding']).toBeUndefined();
    expect(echo(api).method).toBe('GET');
  });
});
