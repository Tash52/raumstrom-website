// Wording rules (Briefing Abschnitt 1, rechtlich relevant). Used by scripts/wording-scan.mjs and tests.

/** Allowed phrases are blanked out before the rules run (columns stay intact). */
export const ALLOWED = [/Meister-Partnerbetrieb\w*/gi, /meisterpflichtig\w*/gi];

export const RULES = [
  { id: 'meister', re: /meister\w*/gi, hint: '„Meister" nur als „Meister-Partnerbetrieb" (oder „meisterpflichtig")' },
  { id: 'innung', re: /innung\w*/gi, hint: 'kein Innungsbetrieb' },
  { id: 'fachbetrieb', re: /\w*fachbetrieb\w*/gi, hint: 'kein „(zertifizierter) Fachbetrieb"' },
  {
    id: 'zertifiziert',
    re: /zertifiziert\w*\s+(?:\w+\s+)?(?:betrieb|unternehmen|elektriker|handwerker|firma)\w*/gi,
    hint: 'keine Zertifizierungs-Behauptung für RAUMSTROM',
  },
  { id: 'sicherheitstechnik', re: /sicherheitstechnik\w*/gi, hint: 'keine Sicherheitstechnik im Angebot (Säule 3 = „Sicher betreiben"/„Prüfservice")' },
  { id: 'alarmanlage', re: /alarm(?:anlage|technik|system)\w*/gi, hint: 'keine Alarmanlagen im Angebot' },
  {
    id: 'kamera',
    re: /(?:überwachungs|sicherheits|video|ip-)kamera\w*|videoüberwachung\w*|kameraüberwachung\w*|kamerasystem\w*/gi,
    hint: 'keine Kameras/Videoüberwachung im Angebot',
  },
  {
    id: 'superlativ',
    re: /\b(?:günstigst|billigst|preiswertest|schnellst|zuverlässigst)\w*|\b(?:der|die|das|den|dem|des|unser\w*)\s+beste[nrms]?\b|\bnr\.?\s*1\b|\bnummer\s+(?:1|eins)\b|marktführer\w*|\bführende[nrms]?\b/gi,
    hint: 'keine unbelegten Superlative',
  },
  { id: 'festpreisgarantie', re: /festpreis[-\s]?garantie\w*/gi, hint: 'kein „Festpreis-Garantie"' },
];

function blankAllowed(line) {
  let out = line;
  for (const re of ALLOWED) out = out.replace(re, (m) => ' '.repeat(m.length));
  return out;
}

/** @returns {{rule: string, line: number, column: number, match: string, hint: string}[]} */
export function scanText(text) {
  const findings = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = blankAllowed(raw);
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      for (const m of line.matchAll(rule.re)) {
        findings.push({ rule: rule.id, line: i + 1, column: (m.index ?? 0) + 1, match: m[0], hint: rule.hint });
      }
    }
  });
  return findings;
}

/** Folders and file types that contain website text. docs/ is not scanned (it discusses the rules). */
export const SCAN_DIRS = ['src', 'public'];
export const SCAN_EXTS = ['.astro', '.md', '.mdoc', '.mdx', '.yaml', '.yml', '.json', '.html', '.txt', '.svg', '.ts', '.tsx', '.js', '.jsx', '.mjs'];
