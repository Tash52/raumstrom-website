import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseAblaufListe } from '../../src/components/sections/ablauf.ts';

describe('parseAblaufListe', () => {
  it('zerlegt nummerierte Schritte', () => {
    const r = parseAblaufListe('1. **Anfrage.** Text eins.\n2. **Angebot:** Text zwei.');
    expect(r).toEqual([
      { titel: 'Anfrage', text: 'Text eins.' },
      { titel: 'Angebot', text: 'Text zwei.' },
    ]);
  });
  it('hängt eingerückte Folgezeilen an', () => {
    expect(parseAblaufListe('1. **A.** eins\n   zwei')[0]?.text).toBe('eins zwei');
  });
  it('bricht bei unlesbarem Format ab', () => {
    expect(() => parseAblaufListe('- **A.** x')).toThrow(/nicht lesbar/);
    expect(() => parseAblaufListe('')).toThrow(/keine Schritte/);
    expect(() => parseAblaufListe('1. **A.**')).toThrow(/ohne Titel oder Text/);
    expect(() => parseAblaufListe('1. **A.** x\n3. **B.** y')).toThrow(/Nummerierung/);
  });
  it('liest den echten Abschnitt in start.md (4 Schritte)', () => {
    const md = readFileSync('src/content/pages/start.md', 'utf8');
    const block = (md.split('id: ablauf')[1] ?? '').split(/\n {2}- id:/)[0]!.split('text: |-\n')[1] ?? '';
    const text = block.split('\n').map((l) => l.replace(/^ {6}/, '')).join('\n');
    expect(parseAblaufListe(text)).toHaveLength(4);
  });
});
