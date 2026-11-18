import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { findGewerk, kennzeichnung, partnerGewerke } from '../../src/lib/content/gewerke.ts';
import { PARTNER_HINWEIS, PARTNER_HINWEIS_PLURAL, gewerkeSchema, partnerHinweisText, type Gewerk } from '../../src/lib/schemas/index.ts';

const { gewerke } = gewerkeSchema.parse(parse(readFileSync('src/content/settings/gewerke.yaml', 'utf8')));

describe('Gewerke-Kennzeichnung (partnerHinweis)', () => {
  it('Hinweistexte sind exakt der freigegebene Wortlaut', () => {
    expect(PARTNER_HINWEIS).toBe('Ausführung durch unseren Meister-Partnerbetrieb');
    expect(PARTNER_HINWEIS_PLURAL).toBe('Ausführung durch unsere Meister-Partnerbetriebe');
    expect([0, 1, 2, 6].map(partnerHinweisText)).toEqual([null, PARTNER_HINWEIS, PARTNER_HINWEIS_PLURAL, PARTNER_HINWEIS_PLURAL]);
  });

  it('genau ein Partner-Gewerk: Singular', () => {
    expect(kennzeichnung(gewerke, ['elektroinstallation'])).toBe(PARTNER_HINWEIS);
    expect(kennzeichnung(gewerke, ['trockenbau', 'malerarbeiten'])).toBe(PARTNER_HINWEIS);
    expect(kennzeichnung(gewerke, ['elektroinstallation', 'elektroinstallation'])).toBe(PARTNER_HINWEIS);
  });

  it('mehrere Partner-Gewerke: Plural', () => {
    expect(kennzeichnung(gewerke, ['wallbox-installation', 'zaehlerschrank'])).toBe(PARTNER_HINWEIS_PLURAL);
    expect(kennzeichnung(gewerke, ['koordination', 'elektroinstallation', 'fliesen-bad', 'putz-stuck', 'malerarbeiten'])).toBe(PARTNER_HINWEIS_PLURAL);
  });

  it('nur eigene Gewerke: kein Hinweis', () => {
    expect(kennzeichnung(gewerke, ['trockenbau', 'bodenbelag', 'demontage-entkernung'])).toBeNull();
    expect(kennzeichnung(gewerke, ['pruefservice-dguv-v3'])).toBeNull();
    expect(kennzeichnung(gewerke, [])).toBeNull();
  });

  it('nennt die Partner-Gewerke', () => {
    expect(partnerGewerke(gewerke, ['trockenbau', 'fliesen-bad', 'putz-stuck']).map((g) => g.id)).toEqual(['fliesen-bad', 'putz-stuck']);
  });

  it('Umstellen in der Matrix wirkt ohne Codeänderung', () => {
    const umgestellt: Gewerk[] = gewerke.map((g) => (g.id === 'elektroinstallation' ? { ...g, ausfuehrung: 'eigen' } : g));
    expect(kennzeichnung(umgestellt, ['elektroinstallation'])).toBeNull();
  });

  it('unbekannte IDs brechen ab (Tippfehler fallen im Build auf)', () => {
    expect(() => findGewerk(gewerke, 'elektro')).toThrow(/Unbekanntes Gewerk "elektro"/);
    expect(() => kennzeichnung(gewerke, ['trockenbau', 'tippfehler'])).toThrow();
  });
});
