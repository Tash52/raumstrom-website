// design-system: colour contrast (WCAG 2.2 AA) and the Strom rule, checked against src/styles/tokens.css.
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { KONTRAST_PAARE, TEXT_TOKENS, kontrast, pruefePaare, tokenWerte } from '../../src/styles/kontrast.ts';

const css = readFileSync('src/styles/tokens.css', 'utf8');
const STROM = '#c5f01e';

describe('Kontrast-Funktion', () => {
  it('entspricht WCAG-Referenzwerten', () => {
    expect(kontrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(kontrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    expect(kontrast('#ffffff', '#ffffff')).toBe(1);
  });
});

describe('Markenfarben (Briefing Abschnitt 1)', () => {
  const root = tokenWerte(css, 'hell');
  it('haben die verbindlichen Werte', () => {
    expect(root['--color-kalk']).toBe('#f4f1eb');
    expect(root['--color-graphit']).toBe('#15191e');
    expect(root['--color-strom']).toBe('#c5f01e');
    expect(root['--color-kabelgruen']).toBe('#3d6300');
  });
  it('Strom auf Kalk ist als Text ungeeignet (deshalb verboten)', () => {
    expect(kontrast(STROM, '#f4f1eb')).toBeLessThan(3);
  });
});

describe('Semantische Farbpaare erfüllen WCAG 2.2 AA', () => {
  const ergebnisse = pruefePaare(css);
  it('deckt beide Kontexte ab', () => {
    expect(ergebnisse.length).toBe(KONTRAST_PAARE.length);
    expect(new Set(ergebnisse.map((e) => e.kontext))).toEqual(new Set(['hell', 'dunkel']));
  });
  for (const e of ergebnisse) {
    it(`${e.kontext}: ${e.zweck} (${e.vorne} auf ${e.hinten}) ≥ ${e.min}:1`, () => {
      expect(e.ratio, `${e.vorneHex} auf ${e.hintenHex}`).toBeGreaterThanOrEqual(e.min);
    });
  }
});

describe('Strom nie als Text auf hellem Grund', () => {
  it('kein Text-Token im hellen Kontext löst zu Strom auf', () => {
    const hell = tokenWerte(css, 'hell');
    for (const t of TEXT_TOKENS) expect(hell[t], t).not.toBe(STROM);
  });

  it('Komponenten setzen color nie direkt auf Strom (nur über semantische Tokens)', () => {
    const files = (readdirSync('src', { recursive: true }) as string[])
      .filter((f) => /\.(css|astro|tsx?)$/.test(f))
      .map((f) => path.join('src', f))
      .filter((f) => !f.endsWith(path.join('styles', 'tokens.css')));
    const verstoesse: string[] = [];
    // `color:` (not background-color, not border-color ...) with Strom as value
    const re = /(?<![-\w])color\s*:\s*(var\(--color-strom\)|#c5f01e)/gi;
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(re)) verstoesse.push(`${f}: ${m[0]}`);
    }
    expect(verstoesse).toEqual([]);
  });
});
