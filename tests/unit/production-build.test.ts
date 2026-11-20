// Production build (without --staging) served by server/server.mjs with secrets from a .env file.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { freierPort } from '../freier-port.ts';

const work = mkdtempSync(path.join(tmpdir(), 'prod-build-'));
// Inside the project so the prerender step can resolve node_modules; .astro/ is gitignored.
const out = path.resolve('.astro/prod-build-test');
const envFile = path.join(work, '.env');
// Free port: parallel test runs (other worktrees) must not collide (QA finding B1).
const PORT = freierPort();
let server: ReturnType<typeof spawn> | undefined;

beforeAll(async () => {
  const build = spawnSync(process.execPath, ['scripts/astro.mjs', 'build', '--outDir', out], { encoding: 'utf8', timeout: 180_000 });
  expect(build.status, build.stderr).toBe(0);
  writeFileSync(
    envFile,
    [
      '# Test-.env',
      `ALTCHA_HMAC_KEY="${'a'.repeat(40)}"`,
      `CSRF_SECRET=${'c'.repeat(40)}`,
      'SMTP_HOST=127.0.0.1',
      'SMTP_PORT=1025',
      'SMTP_SECURE=false',
      'SMTP_USER=test',
      "SMTP_PASS='geheimes-passwort'",
      'MAIL_FROM=anfrage@raumstrom.de',
      'PORT=1', // overridden by the real environment below
    ].join('\n'),
  );
  // Only PATH and the overrides come from the environment; all secrets come from the .env file.
  server = spawn(process.execPath, ['server/server.mjs'], {
    env: { PATH: process.env.PATH ?? '', RAUMSTROM_DIST: out, RAUMSTROM_ENV_FILE: envFile, PORT: String(PORT), RAUMSTROM_LAUF_ID: 'lauf-a' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = '';
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Server startet nicht: ${log}`)), 15_000);
    const on = (d: Buffer) => {
      log += d.toString();
      if (log.includes('läuft auf')) {
        clearTimeout(t);
        resolve();
      }
    };
    server!.stdout!.on('data', on);
    server!.stderr!.on('data', on);
    server!.on('exit', (code) => reject(new Error(`Server beendet (${code}): ${log}`)));
  });
}, 200_000);

afterAll(() => {
  server?.kill();
  rmSync(work, { recursive: true, force: true });
  rmSync(out, { recursive: true, force: true });
});

describe('Produktions-Build', () => {
  it('enthält den Styleguide nicht (nur dev/staging)', () => {
    expect(existsSync(path.join(out, 'client/index.html'))).toBe(true);
    expect(existsSync(path.join(out, 'client/styleguide'))).toBe(false);
  });

  it('Sitemap enthält keine noindex-Seiten (generisch)', () => {
    const xml = readFileSync(path.join(out, 'client/sitemap-0.xml'), 'utf8');
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]!).pathname);
    expect(locs).toContain('/');
    for (const p of ['/kontakt/danke/', '/kontakt/fehler/', '/styleguide/', '/404/']) expect(locs).not.toContain(p);
    for (const p of locs) {
      const html = readFileSync(path.join(out, 'client', p, 'index.html'), 'utf8');
      expect(html, p).not.toMatch(/name="robots" content="[^"]*noindex/);
    }
  });

  it('Server liest Secrets aus .env, Umgebung hat Vorrang (PORT)', async () => {
    const res = await fetch(`http://127.0.0.1:${PORT}/healthz`);
    expect(res.status).toBe(200);
  });

  it('/healthz bestätigt nur die eigene Lauf-ID (E2E-Isolation)', async () => {
    expect((await fetch(`http://127.0.0.1:${PORT}/healthz?lauf=lauf-a`)).status).toBe(200);
    expect((await fetch(`http://127.0.0.1:${PORT}/healthz?lauf=lauf-b`)).status).toBe(409);
  });

  it('/styleguide/ liefert 404, Startseite 200', async () => {
    expect((await fetch(`http://127.0.0.1:${PORT}/styleguide/`)).status).toBe(404);
    expect((await fetch(`http://127.0.0.1:${PORT}/`)).status).toBe(200);
  });
});
