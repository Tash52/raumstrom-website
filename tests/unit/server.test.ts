import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { FALLBACK_CSP, finalizePolicy } from '../../server/csp.mjs';
import { REQUIRED_ENV, parseEnv } from '../../server/env.mjs';
import { SECURITY_HEADERS } from '../../server/headers.mjs';
import { resolveStatic, routeKey } from '../../server/static.mjs';

const root = mkdtempSync(path.join(tmpdir(), 'static-'));
mkdirSync(path.join(root, 'kontakt'));
mkdirSync(path.join(root, '.well-known'));
writeFileSync(path.join(root, 'index.html'), 'x');
writeFileSync(path.join(root, 'kontakt/index.html'), 'x');
writeFileSync(path.join(root, '.well-known/security.txt'), 'x');
writeFileSync(path.join(root, '.secret'), 'x');
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('Statische Auslieferung', () => {
  it('liefert Seiten und leitet auf Slash um', () => {
    expect(resolveStatic(root, '/')).toEqual({ file: path.join(root, 'index.html') });
    expect(resolveStatic(root, '/kontakt/')).toEqual({ file: path.join(root, 'kontakt/index.html') });
    expect(resolveStatic(root, '/kontakt')).toEqual({ redirect: '/kontakt/' });
    expect(resolveStatic(root, '/.well-known/security.txt')).toEqual({ file: path.join(root, '.well-known/security.txt') });
  });
  it.each(['/../package.json', '/..%2fpackage.json', '/%2e%2e/x', '/.secret', '/a%00b', '/%E0%A4%A', '/kontakt\\..\\x', '/index.html/'])(
    'blockiert %s',
    (p) => expect(resolveStatic(root, p)).toEqual({ notFound: true }),
  );
  it('normalisiert Routen für die CSP-Zuordnung', () => {
    expect(routeKey('/')).toBe('/');
    expect(routeKey('/index.html')).toBe('/');
    expect(routeKey('/kontakt/')).toBe('/kontakt');
    expect(routeKey('/kontakt/index.html')).toBe('/kontakt');
    expect(routeKey('/404.html')).toBe('/404');
  });
});

describe('CSP und Header', () => {
  it('Fallback-Policy ist streng', () => {
    expect(FALLBACK_CSP).toContain("default-src 'none'");
    expect(FALLBACK_CSP).toContain("frame-ancestors 'none'");
    expect(FALLBACK_CSP).not.toMatch(/unsafe/);
  });
  it('finalizePolicy ergänzt Pflicht-Direktiven und verweigert unsafe-inline', () => {
    const p = finalizePolicy("script-src 'self' 'sha256-abc='; style-src 'self'");
    for (const d of ['default-src', 'object-src', 'base-uri', 'form-action', 'frame-ancestors']) expect(p).toContain(d);
    expect(() => finalizePolicy("script-src 'self' 'unsafe-inline'")).toThrow();
    expect(() => finalizePolicy("script-src 'unsafe-eval'")).toThrow();
  });
  it('setzt alle Header aus Briefing Abschnitt 8', () => {
    for (const h of ['Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy']) {
      expect(SECURITY_HEADERS).toHaveProperty(h);
    }
  });
});

describe('Fail-secure', () => {
  it('kennt die Pflicht-Secrets', () => {
    expect(REQUIRED_ENV).toEqual(expect.arrayContaining(['ALTCHA_HMAC_KEY', 'CSRF_SECRET', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'MAIL_FROM']));
  });
  it('lehnt kurze und Platzhalter-Secrets ab', () => {
    const ok = { ALTCHA_HMAC_KEY: 'a'.repeat(32), CSRF_SECRET: 'b'.repeat(32), SMTP_HOST: 'smtp.raumstrom.de', SMTP_PORT: '465', SMTP_USER: 'u', SMTP_PASS: 'p'.repeat(12), MAIL_FROM: 'a@raumstrom.de' };
    expect(parseEnv(ok).ok).toBe(true);
    expect(parseEnv({ ...ok, CSRF_SECRET: 'kurz' }).ok).toBe(false);
    expect(parseEnv({ ...ok, ALTCHA_HMAC_KEY: 'change-me-change-me-change-me-change-me' }).ok).toBe(false);
  });
  it('Server startet ohne Secrets nicht und gibt keine Werte aus', () => {
    const r = spawnSync(process.execPath, ['server/server.mjs'], { env: { PATH: process.env.PATH ?? '', SMTP_PASS: 'geheim-123456' }, encoding: 'utf8', timeout: 10_000 });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('fail-secure');
    expect(r.stderr).toContain('ALTCHA_HMAC_KEY');
    expect(r.stderr + r.stdout).not.toContain('geheim-123456');
  });
});
