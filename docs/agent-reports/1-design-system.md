# Phase 1b · design-system · Bericht

Stand: 18.11.2026 · Hauptcheckout, nichts committet.

## Gestaltungsidee
Lesart: lokaler Handwerks- und Elektrobetrieb für Eigentümer und Verwaltungen. Bildsprache: Bauzeichnung bzw. „Hinter der Wand". Ein einziges markantes Element ist die **Leitung**: eine 2-px-Linie am linken Rand jeder Section mit einem Knoten an der Überschrift. Auf Hell ist sie Kabelgrün, auf Graphit Strom mit Glow. Sie läuft durch die Seite und endet im Footer in einem Punkt, wie im Logo. Alles andere bleibt ruhig.
- Typo: Archivo variabel. Überschriften in Expanded (`wdth` 125 %, 800), Fließtext 100 %/400, UI 108 %/560. Plex Mono nur für technische Werte (kW, DGUV V3, Maße, Bemaßungslinie) und nicht als Eyebrow über jeder Überschrift.
- Radien: Flächen 0, Bedienelemente und Karten 2 px, Punkte rund.
- Primär-Button: Graphit auf Kalk, Strom auf Graphit. Der Punkt im Button ist das Leitungsende und „schaltet" bei Hover oder Fokus ein (Strom-Glow).
- Karten: offen, ohne Kasten, mit Leitung oben. Bei Hover oder Fokus wandert der Knoten ans Ende der Linie (mit `--motion` multipliziert, steht also bei reduzierter Bewegung still).
- Kein Dark Mode über `prefers-color-scheme`: Die Marke legt Kalk als Grundfläche (60 %) fest. Dunkle Flächen setze ich gezielt ein (`flaeche-graphit`), die semantischen Tokens schalten dort um.

## Dateien
- `src/styles/tokens.css`: Markenfarben, abgeleitete Neutraltöne, semantische Tokens (hell plus `.flaeche-graphit`, `-graphit-2`, `.flaeche-kalk-tief`), fluide Typo-Skala, Abstände, Radien, Schatten, z-Ebenen, Bewegung (`--motion` 1/0, Dauern, Easing; reduziert über `prefers-reduced-motion` und `html[data-motion="reduce"]`, Letzteres als Haken für einen späteren Pausieren-Schalter).
- `src/styles/base.css` (Reset, Typo, Fokus, Hilfsklassen, `@view-transition`), `src/styles/forms.css` (globale Feldklassen, auch für React-Inseln), `src/styles/kontrast.ts` (WCAG-Funktionen und Paarliste, genutzt von Test und Styleguide).
- `src/assets/fonts/`: `archivo/archivo-var-latin(-ext).woff2` (61 KB / 53 KB), `ibm-plex-mono/IBMPlexMono-{Regular,Medium}-{Latin1,Latin2,Pi}.woff2`, OFL-Texte, `README.md` mit Quellen. Zusätzlich `public/fonts/*-OFL.txt`.
- `src/assets/brand/`: 5 SVGs (quer, quer negativ, gestapelt, Zeichen, Zeichen negativ) und `README.md` mit Regeln für Ersatzdateien. `public/favicon.svg`.
- `src/components/base/`: Button, TextLink, Karte, MonoLabel (wert/bemassung/marke), Section (Flächen, Leitung), Icon + `icons.ts` (Tabler), TextFeld, TextBereich, AuswahlFeld, Checkbox (auch Radio), Feldgruppe, DateiFeld, FeldFehler, `feld.ts`, Blueprint (team 4:5 mit Initialen, referenz 4:3 immer als „Illustration" gekennzeichnet), Logo.
- `src/components/layout/`: Header (mobil natives Popover-Menü ohne JS, Desktop ab 72em einzeilig), Footer (nur `getFirma()`, Platzhalterwerte und unbestätigte Orte werden nicht angezeigt), SkipLink, `navigation.ts` (Einträge laut Briefing 6, gerendert werden **nur Links auf existierende Seiten** über `import.meta.glob`, sonst würde der Crawl-Test an 404 scheitern).
- `src/layouts/BaseLayout.astro`: Fonts, genau 2 Preloads, Favicon, Skip-Link, Header, `main#inhalt`, Footer, Prop `ohneKopfFuss` für den Vollbild-Planer.
- `src/pages/styleguide/index.astro` (noindex, nicht verlinkt, aus der Sitemap gefiltert) mit live berechneter Kontrasttabelle.
- `src/pages/index.astro`: Stub (gehört page-builder) auf Layout und Komponenten umgestellt.
- `public/.well-known/security.txt` (RFC 9116, Contact als Platzhalter, Expires 2027-11-17).
- `astro.config.mjs`: Block `fonts` (`fontProviders.local()`, `unicodeRange` je Datei, `display: swap`, Fallbacks mit Metrik-Anpassung) und `sitemap({ filter })` für `/styleguide/`.
- `package.json`: `@tabler/icons` 3.52.0 (MIT, nur Build-Zeit, SVG-Komponenten), dev `@axe-core/playwright` 4.14.0 (MPL, Ausnahme schon freigegeben). `THIRD-PARTY-LICENSES.md` und `PLATZHALTER.md` neu erzeugt.
- Tests: `tests/unit/contrast.test.ts`, `tests/e2e/design-system.spec.ts`.

## Schriften und Lizenz
- Archivo: Omnibus-Type/Archivo, Commit `211127690e8ff106c36c935f7e5e697114cff103`, `fonts/variable/Archivo[wdth,wght].ttf` v2.001. Mit fontTools 4.60.1 auf `wght` 300–900 und `wdth` 100–125 begrenzt, Subsets Latin und Latin-Ext, WOFF2. OFL ohne reservierten Namen, das Subsetting ist deshalb zulässig.
- Plex Mono: npm `@ibm/plex-mono@2.5.0`, IBMs eigene Split-Dateien **unverändert**. „Plex" ist ein reservierter Schriftname, ein eigenes Subset wäre eine Modified Version und dürfte diesen Namen nicht tragen.
- Preload: Archivo Latin und Plex Mono Regular Latin1, per `fontData` (Reihenfolge der Varianten). Der Preload-Filter der Fonts-API kann bei lokalen Dateien keine Subsets unterscheiden. Die Inline-`<style>` der `<Font>`-Komponente bekommen von Astro CSP-Hashes (geprüft, 0 Konsolenfehler).
- Logo-Wortmarke als Pfade aus derselben Archivo-Datei (RAUM 800 / STROM 300, Breite 112 %). Das Skript liegt nicht im Repo; das Verfahren ist im README beschrieben.

## Tests (selbst ausgeführt)
| Prüfung | Ergebnis |
|---|---|
| `npm run build:staging` | ok |
| `npm run check` | 0 Fehler, 0 Warnungen |
| `npm test` | Vitest 115/115 (davon 40 Kontrast), Hook 7/7 |
| Gegenprobe Kontrast-Test | `--accent-text` hell auf Strom gesetzt: 3 Tests schlagen fehl, wieder zurückgesetzt |
| `npm run test:e2e` | 44 bestanden, 2 übersprungen (mobil/desktop-spezifisch); alte Security-Tests grün (Header, CSP, 0 Fremd-Requests, 0 Konsolenfehler) |
| axe (wcag2a/aa, 21a/aa, 22aa) auf `/` und `/styleguide/` | 0 Verstöße, Desktop und Pixel 7 |
| Weitere E2E | Skip-Link als erstes Fokusziel, Fokus sichtbar (Outline ≥ 2 px), reduzierte Bewegung → `--motion: 0`, Popover-Menü öffnet und schließt (Escape, Fokus zurück), kein horizontales Scrollen bei 320–1440 px, Header ≤ 80 px, Schriften nur von `/_astro/fonts/`, genau 2 Preloads, security.txt |
| Lighthouse 13.6 mobil, Start-Stub | Performance 100, A11y 100, Best Practices 100, SEO 100 (LCP 1,2 s, CLS 0, TBT 0) |
| Lighthouse mobil, Styleguide | 99 / 100 / 100 / SEO 63 (gewollt, noindex) |
| `npm run scan:wording`, `npm run licenses -- --check` | ok |
| Screenshots | `docs/agent-reports/screenshots/1/design-system-{start,styleguide}-{390,1440}.png`, `design-system-menue-390.png` |

## Offen
1. `server/headers.mjs` (architect): Chromium 1243 meldet für `Permissions-Policy` eine Warnung „Unrecognized feature: 'bluetooth'". Das ist kein Fehler, die Tests bleiben grün. Empfehlung: `bluetooth=()` entfernen.
2. `CLAUDE.md` (architect) nennt `src/components/layout/` als Ordner von page-builder. Laut meinem Auftrag gehören Header und Footer dort zu design-system. Bitte die Besitzerangabe klären. `navigation.ts` (Labels und Reihenfolge) darf page-builder pflegen.
3. Der Start-Stub hat noch keinen Bildinhalt (3D-Hero kommt in Phase 3), Seiten und CTA-Ziele kommen in Phase 2. Header-CTA und Footer-Rechtslinks erscheinen automatisch, sobald `/kontakt/`, `/impressum/` usw. existieren.
4. Logo und Zeichen sind ein Nachbau. Die finale Datei unter gleichem Namen ersetzt sie (Regeln: `src/assets/brand/README.md`).
5. `security.txt`: Contact-Adresse fehlt (steht im Launch-Check); Expires jährlich erneuern.
6. Für Felder, die erst per Skript Fehler bekommen: `aria-describedby` auf die Fehler-ID (`feld-<name>-fehler`) muss das Skript selbst setzen. Der leere Fehlercontainer ist immer im DOM.

## Risiken
- Preload über die Reihenfolge in `fontData`: Werden die Varianten umsortiert, lädt der Preload die falsche Datei vor. Eine Build-Prüfung bricht nur ab, wenn Dateien fehlen.
- Popover-Menü braucht Chrome 114+, Safari 17+ bzw. Firefox 125+. Ältere Browser sehen den Menü-Button ohne Funktion. Abhilfe wäre ein kleines gebündeltes Fallback-Skript, falls nötig.
- `fonts` in `astro.config.mjs` ist als `any` gecastet, weil der Config-Typ die Provider-Optionen aus einer Variable nicht ableitet. Astro validiert zur Laufzeit.
- Der Datei-Button zeigt im Test-Chromium englischen Text („Choose Files"), weil der Browser die Sprache vorgibt. In deutschen Browsern ist er deutsch.
