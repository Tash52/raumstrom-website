# Phase 2 · architect · Verträge vor page-builder

Stand: 18.11.2026 auf c47f415, Hauptcheckout, nichts committet. Grundlage: `docs/agent-reports/2-legal-compliance.md` (Abschnitt 2 und 5).

## Geändert
1. **Marker-Renderer** `src/lib/content/rechtstext.ts` (rein, ohne `astro:content`): `renderMitFirma(text, { firma, features }, { links? })` sowie `resolvePfad`, `bedingungErfuellt`, `wendeBloeckeAn`, `aufzaehlung`, `MarkerFehler`. Dazu in `src/lib/content/index.ts` `renderRechtstext(entry)`, das `entry.rendered.html` mit `getFirma()`/`getFeatures()` füllt; Fehler nennen die Datei. Die Syntax ist die von legal-compliance:
   - `{{firma.<pfad>}}`, `{{firma.gesellschafter.*.name}}` (Liste „A, B und C"), `{{firma.vertretungsberechtigte}}`.
   - `<!-- wenn firma.x|features.y -->…<!-- /wenn -->`: Der Block bleibt bei nicht leerem Text (auch Platzhalter), `true` oder nicht leerer Liste. Verschachtelung und Bedingungen ohne Gegenstück brechen ab.
   - Werte werden HTML-escaped. `kontakt.email` wird zum `mailto:`-Link, `kontakt.telefon_anzeige` zum `tel:`-Link (mit `kontakt.telefon`), `*_url` mit https zum Link; Platzhalter erhalten nie einen Link.
   - Alle übrigen HTML-Kommentare werden entfernt.
   - Abbruch (`MarkerFehler`) bei unbekanntem Bereich oder Pfad, bei Werten, die kein Text sind, bei Resten von `{{`/`}}` und bei offenem `<!--`.
   - Geprüft auf dem echten, von Astro gerenderten HTML von `impressum.md` aus dem Content-Store: Marker und Kommentare kommen unverändert an, die Ausgabe enthält danach weder `{{` noch `<!--`.
2. **Launch-Check** (`scripts/lib/launch-check.mjs`):
   - Für Dateien unter `src/content/` mit Markern werden die Marker mit den echten Daten geprüft; ungültige Marker sind fatal (Art „Marker").
   - Platzhalter in Blöcken, die gerade ausgeblendet sind (Flag aus oder Firmenwert leer), zählen nicht.
   - Ist ein `features.*`-Block aktiv, wird jeder Kommentar darin als offener Punkt „Vor Aktivierung" gelistet (Vorschlag c von legal-compliance).
3. **Register** `firma.register{art, gericht, nummer}`: Schema `src/lib/schemas/firma.ts` (Platzhalter oder Text, leer = nicht eingetragen, Default leer), `firma.yaml` (3 Platzhalter), Keystatic (Objekt „Registereintrag"), Launch-Check-Kategorie „Rechtliches", `CLAUDE.md`.
4. **Wording:**
   - `ALLOWED` um `/günstigste Standardlieferung/gi` ergänzt (gesetzlicher Mustertext).
   - Superlativ-Regel „Nr. 1": Paragrafenverweise mit Abs./Absatz/Satz/Art./Artikel/Anlage/§ und Zahl davor sind ausgenommen („§ 5 Abs. 1 Nr. 1", „§ 309 Nr. 1").
   - `src/content/legal/widerruf.md:34`: `g&uuml;nstigste` → `günstigste`.
5. **Plural:**
   - `PARTNER_HINWEIS_PLURAL = 'Ausführung durch unsere Meister-Partnerbetriebe'` und `partnerHinweisText(anzahl)` in `src/lib/schemas/gewerke.ts`.
   - `kennzeichnung`/`partnerHinweis` liefern bei genau einem Partner-Gewerk den Singular, bei mehreren den Plural; doppelte IDs zählen einfach. `PARTNER_HINWEIS` (Singular) bleibt exportiert.
6. **Keystatic-Hinweis:** Die Collection heißt jetzt „Rechtstexte (nur lesen, im Texteditor ändern)", das Inhaltsfeld hat eine Warnbeschreibung (siehe Punkt 6 unten).

Tests:
- Neu `tests/unit/rechtstext.test.ts`: Werte, Escape, Listen, Links, Platzhalter, Blöcke für firma und features, Entfernen von Kommentaren, 11 Abbruchfälle; alle Rechtstexte im Repo lassen sich mit den echten Daten füllen.
- `tests/unit/launch-check.test.ts`: 4 neue Fälle (Flag aus, Flag an mit „Vor Aktivierung", leerer Firmenwert, unbekannter Marker fatal).
- `tests/unit/gewerke.test.ts`: Singular, Plural, Dubletten.
- `tests/unit/wording.test.ts`: Mustertext und Paragrafenverweise erlaubt; „die günstigste Lösung", „günstigste Standardpreise", „Nr. 1 in Schweinfurt" und „Seit 2020 Nr. 1" bleiben verboten.

## Befunde für andere (nicht geändert)
- **GewerkeHinweis.astro hat den Text fest verdrahtet** (`src/components/base/GewerkeHinweis.astro:6,24`: `import { PARTNER_HINWEIS }` und `{PARTNER_HINWEIS}`). Er zeigt deshalb auch bei mehreren Gewerken den Singular. Fix (design-system/page-builder): `import { partnerHinweis } …`, `const hinweis = await partnerHinweis(gewerke);` und `{hinweis}` statt `{PARTNER_HINWEIS}`.
- **legal-compliance:**
  - `impressum.md:23-25`: Den Register-Platzhalter ersetzen durch `<!-- wenn firma.register.nummer -->` … `{{firma.register.art}}, {{firma.register.gericht}}, {{firma.register.nummer}}` … `<!-- /wenn -->`.
  - `widerruf.md:32`: Der Kommentar erwähnt noch die HTML-Entity; er kann entfallen. Ein bloßes „günstigste" ohne „Standardlieferung" würde der Scan melden.
  - In Blöcken hinter Flags sind jetzt echte `[[PLATZHALTER: …]]` möglich; „VOR AKTIVIERUNG"-Kommentare werden bei aktivem Flag automatisch gelistet.

## 6. Keystatic und HTML-Kommentare (geprüft)
Dev-Server gestartet. Mit Playwright `impressum`, `datenschutz`, `agb`, `widerruf` und `cookie-einstellungen` im Keystatic-Editor geöffnet, ein Zeichen angehängt und gespeichert, dann die Dateien mit dem Original verglichen. Danach habe ich alles zurückgesetzt.
- **Kommentare bleiben erhalten:** Kopfvermerk, `<!-- wenn … -->`/`<!-- /wenn -->`, Quellenvermerke, `{{…}}`-Marker und `\`-Zeilenumbrüche bleiben unverändert, ebenso das Frontmatter.
- **Aber Keystatic formatiert um:**
  - GFM-Tabellen werden zu Markdoc-`{% table %}` (`cookie-einstellungen.md`). Das rendert die Astro-Markdown-Pipeline nicht, die Tabelle wäre kaputt.
  - Escapes `\*` werden zu `*` (`widerruf.md`, Muster-Formular). Das kann als Hervorhebung gerendert werden.
  - HTML-Entities in Kommentaren werden dekodiert, zusätzliche Leerzeilen kommen hinzu.
- Ein Versuch mit `fields.mdx({ extension: 'md' })` scheitert: Der Editor lädt Dokumente mit HTML-Kommentaren nicht (MDX erlaubt sie nicht). Verworfen.
- **Vorschlag:**
  - (a) Rechtstexte nicht über Keystatic speichern; das ist jetzt als Hinweis in der Keystatic-Oberfläche umgesetzt. Langfristig die `legal`-Collection aus Keystatic nehmen (Briefing 11.4 verlangt „alle Texte in Keystatic", also Entscheidung Betreiber/Orchestrator).
  - (b) Alternative: Rechtstexte ohne GFM-Tabellen und ohne `\*` schreiben (legal-compliance), dann ist Keystatic-Speichern verlustfrei. Das wäre mit einem Unit-Test absicherbar (kein `|---|`, kein `\*` in `src/content/legal`).
  - Auch `pages`/`leistungen`/`ratgeber` nutzen `fields.markdoc`: Dieselbe Tabellen-Umschreibung gilt dort. Die Konvention „keine GFM-Tabellen in Keystatic-gepflegten Texten" sollte in `CLAUDE.md`, sobald entschieden.

## Ergebnisse
`npm test` 181/181 (11 Dateien) + Hook 7/7 · `npm run build:staging` ok · `npm run test:e2e` 49 passed, 3 skipped (gewollt) · `npm run check` 0/0/0 · `npm run scan:wording` 0 Funde · `PLATZHALTER.md` neu erzeugt (3 neue Register-Punkte). `CLAUDE.md` 59 Zeilen (Register, Plural-Regel, Rechtstext-Renderer, Keystatic-Hinweis).

---

## Nacharbeit (Stand dae69c6): Sitemap ohne noindex, allowedDomains

1. **Sitemap generisch:**
   - `scripts/lib/noindex.mjs` (`isNoindexHtml`, `htmlFileFor`, `indexierbar`). Der Sitemap-Filter in `astro.config.mjs` liest das gebaute HTML jeder Seite und lässt alles mit `<meta name="robots" content="…noindex…">` weg. Seiten, deren HTML fehlt (z. B. der im Produktions-Build entfernte Styleguide), fallen ebenfalls heraus.
   - Das Build-Verzeichnis liefert eine kleine Integration (`astro:config:done` → `config.build.client`).
   - Die frühere Pfadregel für `/styleguide/` ist entfallen.
   - Ergebnis `build:staging`: 20 Einträge. Nicht enthalten sind `/kontakt/danke/`, `/kontakt/fehler/`, `/styleguide/`, 404 und die Rechtstexte, die als Entwurf auf noindex stehen.
2. **allowedDomains:**
   - `server/site.mjs` (`siteConfig`) leitet `site` und `security.allowedDomains` aus `firma.domain` ab (`https`, plus `www.`). Die Build-Variable `SITE_URL` überschreibt das, etwa für einen Staging-Host. Nur Staging-Builds (`--staging`) erlauben zusätzlich `localhost`/`127.0.0.1` (http), damit E2E über 127.0.0.1 läuft.
   - Ungültige Adressen brechen den Astro-Build ab. Der Launch-Check meldet sie als „Domain": nicht https, localhost, Pfad im Wert, ungültiger Host.
   - `SITE_URL` liest der Launch-Check nur aus der echten Umgebung, nicht aus `.env`, weil Astro sie dort auch nicht liest. Das ist in `.env.example` dokumentiert.
   - Folge für den Betrieb: Der Reverse-Proxy des Hosters muss `Host: raumstrom.de` und `X-Forwarded-Proto: https` setzen. Sonst baut Astro die URL weiter als `localhost` (unsicherer Fallback bleibt aus) und Safari < 16.4 bekommt 403. Das gehört in `docs/DEPLOYMENT.md`.
   - Astro vertraut danach `X-Forwarded-For` für `clientAddress`; das Rate-Limit nutzt weiter das eigene `TRUST_PROXY`.

Tests:
- `tests/unit/site.test.ts` (siteConfig, noindex-Erkennung, Filter), `tests/unit/launch-check.test.ts` (Domain).
- `tests/unit/production-build.test.ts`: Sitemap des Produktions-Builds ohne noindex-Seiten, generisch über alle Einträge geprüft.
- `tests/e2e/security.spec.ts`: POST `/api/contact` mit eigener Origin ohne `Sec-Fetch-Site` wird nicht von Astro abgewiesen (vorher 403 „Cross-site POST…", jetzt 303 vom Endpunkt), fremde Origin weiter 403.

Ergebnisse: `npm test` 226/226 (13 Dateien) + Hook 7/7 · `build:staging` ok · `build` Exit 1 (Launch-Check, gewollt) · `test:e2e` 157 passed, 3 skipped · `check` 0/0/0 · `scan:wording` 0 Funde. `CLAUDE.md` 64 Zeilen.
