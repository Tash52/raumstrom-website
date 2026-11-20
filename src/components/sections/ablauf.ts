// Splits a numbered Markdown list ("1. **Titel.** Text") into steps for AblaufListe.
// Throws on anything else so a changed content format breaks the build instead of rendering nothing.
export interface AblaufSchritt {
  titel: string;
  text: string;
}

const SCHRITT = /^(\d+)\.\s+\*\*(.+?)\*\*\s*(.*)$/;

export function parseAblaufListe(markdown: string, quelle = 'Ablauf'): AblaufSchritt[] {
  const schritte: AblaufSchritt[] = [];
  let aktuell: AblaufSchritt | null = null;
  for (const zeile of markdown.split(/\r?\n/)) {
    if (!zeile.trim()) continue;
    const m = SCHRITT.exec(zeile.trim());
    if (m) {
      if (Number(m[1]!) !== schritte.length + 1) {
        throw new Error(`${quelle}: Nummerierung unterbrochen bei "${zeile.trim()}" (erwartet ${schritte.length + 1}.)`);
      }
      aktuell = { titel: m[2]!.trim().replace(/[.:]$/, ''), text: m[3]!.trim() };
      schritte.push(aktuell);
    } else if (aktuell && /^\s+\S/.test(zeile)) {
      aktuell.text = `${aktuell.text} ${zeile.trim()}`.trim(); // indented continuation line
    } else {
      throw new Error(`${quelle}: Zeile nicht lesbar (erwartet "N. **Titel.** Text"): "${zeile.trim()}"`);
    }
  }
  if (schritte.length === 0) throw new Error(`${quelle}: keine Schritte gefunden`);
  const leer = schritte.findIndex((s) => !s.titel || !s.text);
  if (leer >= 0) throw new Error(`${quelle}: Schritt ${leer + 1} ohne Titel oder Text`);
  return schritte;
}
