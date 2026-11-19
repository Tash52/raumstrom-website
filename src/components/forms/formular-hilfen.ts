// Pure helpers of the contact form script (no DOM globals, unit-tested in tests/unit/backend-api-fixes.test.ts).

/** Short names in the error summary where the label is a whole sentence (A11y finding 1). */
export const FEHLERNAME: Readonly<Record<string, string>> = {
  einwilligung: 'Datenschutzhinweis',
};

/** Minimal node shape, so the walker works with real DOM nodes and with test doubles. */
export interface TextKnoten {
  nodeType: number;
  textContent: string | null;
  childNodes?: ArrayLike<TextKnoten>;
  classList?: { contains(name: string): boolean };
}

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/**
 * Full visible label text (all text nodes, also inside links), without the "(Pflichtfeld)" marker
 * (`.feld-pflicht`), whitespace collapsed.
 */
export function beschriftung(label: TextKnoten | null | undefined): string {
  if (!label) return '';
  const teile: string[] = [];
  const lauf = (n: TextKnoten) => {
    if (n.nodeType === TEXT_NODE) {
      teile.push(n.textContent ?? '');
      return;
    }
    if (n.nodeType !== ELEMENT_NODE) return;
    if (n.classList?.contains('feld-pflicht')) return;
    for (const c of Array.from(n.childNodes ?? [])) lauf(c);
  };
  lauf(label);
  return teile.join('').replace(/\s+/g, ' ').trim();
}

/** Name for the error summary: explicit short name, else the full label, else the field name. */
export function fehlerName(name: string, label: TextKnoten | null | undefined, explizit?: string | null): string {
  return (explizit ?? '').trim() || FEHLERNAME[name] || beschriftung(label) || name;
}

/** First field (in document order) that has an error; undefined if none of them is a form field. */
export function erstesFehlerfeld(reihenfolge: readonly string[], fehler: Readonly<Record<string, string>>): string | undefined {
  return reihenfolge.find((n) => Boolean(fehler[n]));
}
