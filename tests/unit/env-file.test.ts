import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { loadDotEnv, readDotEnv } from '../../server/env.mjs';
import { runLaunchCheck } from '../../scripts/lib/launch-check.mjs';

const dir = mkdtempSync(path.join(tmpdir(), 'envfile-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('.env laden (Server und Launch-Check gleich)', () => {
  it('liest Kommentare, Anführungszeichen und leere Werte wie node --env-file', () => {
    const f = path.join(dir, 'a.env');
    writeFileSync(f, '# Kommentar\nA=1\nB="zwei Worte"\nC=\'x#y\'\nD=\n');
    expect(readDotEnv(f)).toEqual({ A: '1', B: 'zwei Worte', C: 'x#y', D: '' });
    expect(readDotEnv(path.join(dir, 'fehlt.env'))).toEqual({});
  });

  it('gesetzte Umgebungsvariablen haben Vorrang', () => {
    const f = path.join(dir, 'b.env');
    writeFileSync(f, 'A=datei\nB=datei\n');
    const target: Record<string, string | undefined> = { A: 'umgebung' };
    loadDotEnv(f, target);
    expect(target).toEqual({ A: 'umgebung', B: 'datei' });
  });

  it('Launch-Check sieht dieselben Secrets aus .env', () => {
    const root = mkdtempSync(path.join(dir, 'root-'));
    writeFileSync(path.join(root, '.env'), `ALTCHA_HMAC_KEY=${'a'.repeat(40)}\n`);
    const texts = runLaunchCheck({ root, env: {} }).filter((f) => f.art === 'Umgebungsvariable').map((f) => f.text);
    expect(texts.some((t) => t.startsWith('ALTCHA_HMAC_KEY'))).toBe(false);
    expect(texts.some((t) => t.startsWith('CSRF_SECRET'))).toBe(true);
  });
});
