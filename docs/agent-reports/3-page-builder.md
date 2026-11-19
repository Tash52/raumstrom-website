# Phase 3 · page-builder (Kurzbericht)

Startseite zeigt jetzt den Abschnitt `ablauf` („So läuft's ab", 4 Schritte) aus `pages/start.md`.

- `src/components/sections/ablauf.ts`: `parseAblaufListe(markdown, quelle)` zerlegt `N. **Titel.** Text` in `{titel,text}[]`. Wirft bei unlesbarer Zeile, unterbrochener Nummerierung, leerem Titel/Text oder keinem Schritt, daher bricht der Build ab statt still leer zu rendern. Eingerückte Folgezeilen werden angehängt, Schluss-Punkt/Doppelpunkt im Titel entfällt.
- `src/pages/index.astro`: neue Section nach „koordination", `AblaufListe` (Motion-Hooks `data-prozess*` von motion-3d, unverändert). Hintergrund-Wechsel angepasst (Raumplaner-Teaser kalk-tief, Region hell), damit keine zwei gleichen Flächen aufeinanderfolgen.
- `tests/unit/ablauf-liste.test.ts`: 4 Tests, inkl. echter Abschnitt aus `start.md`.
- Geprüft: Vitest 317 grün, Hook-Test 7/7, `npm run check` 0 Fehler, `build:staging` ok. Screenshots (Desktop, Mobil 390 px, Desktop reduced-motion) unter `docs/agent-reports/screenshots/3-page-builder/`: 4 Schritte, Leitung und Knoten korrekt, eine H1.
- Hinweis: Schritt 3 enthält sichtbar `[[PLATZHALTER: Frist …]]` (Inhalt, content-writer/Betreiber). `npm run platzhalter` nicht erneut ausgeführt, da keine Inhaltsänderung.
