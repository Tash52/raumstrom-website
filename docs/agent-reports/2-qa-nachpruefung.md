# Phase 2 · qa-verifier · Nachprüfung der QA- und A11y-Befunde

Stand: `main` @ `0065724` (Merge der Fix-Branches von page-builder, architect und backend-api). Geprüft am 2026-11-19. Code und Git-Stand habe ich nicht verändert.
Screenshots: `docs/agent-reports/screenshots/2-nachpruefung/` (je Desktop 1440 px und Mobil 390 px).

## Gesamturteil

**Bestanden.** Alle acht beauftragten Punkte sind mit Beleg erfüllt. Neu gefunden habe ich einen niedrigen Befund (N1, Einzug der Gewerke-Liste) und eine Beobachtung (N2, zwei Navigations-E2E schlugen in 1 von 3 Läufen fehl). Die Mail-E2E konnte ich nicht prüfen, weil kein Docker-Daemon und kein Mailpit verfügbar sind.

## 1. Befehle (frisch, wörtlich)

| Befehl | Ergebnis |
|---|---|
| `npm run build:staging` | Exit 0. `[raumstrom:precompress] 124 vorkomprimierte Dateien (62 Quellen, 1633 KB -> br 304 KB)`, `[build] Complete!` |
| `npm test` | Exit 0. `Test Files 15 passed (15)`, `Tests 283 passed (283)`; Hook-Test `# tests 7 # pass 7 # fail 0` |
| `npm run check` | Exit 0. `Result (147 files): 0 errors, 0 warnings, 0 hints` |
| `npm run scan:wording` | Exit 0. `Wording-Scan: keine verbotenen Begriffe gefunden.` |
| E2E (siehe unten) | Lauf 1: `12 failed, 3 skipped, 155 passed`. Lauf 3: `10 failed, 3 skipped, 157 passed`. Ohne `kontakt-api`: `151 passed, 3 skipped`, Exit 0 |

**E2E-Aufbau:** `docker info` meldet `failed to connect to the docker API at unix:///var/run/docker.sock`. Deshalb lief alles mit `E2E_MAILPIT=extern`. Auf 127.0.0.1:8025 lief bereits ein Stub, der nur `/api/v1/info` beantwortet. Ein SMTP auf 1025 gab es nicht. Playwright-Browser sind nicht installiert. Ich habe deshalb eine Kopie der Konfiguration unter `/tmp/qa-e2e/pw.config.ts` verwendet: lokaler Chrome (`channel: 'chrome'`), sonst identisch mit `playwright.config.ts`.

**Fehlgeschlagene Tests in Lauf 3 (jeweils chromium und mobile):** `kontakt-api.spec.ts:95`, `:161`, `:188`, `:205`, `:221`. Alle scheitern an der Mail-Abfrage (`messages_count` ist `undefined`, Zeile 82) oder an fehlendem SMTP (`/kontakt/fehler/` statt `/kontakt/danke/`, Zeile 214; kein `#kontakt-erfolg`, Zeile 108). Diese fünf Tests sind **nicht prüfbar, weil Mailpit und SMTP fehlen**. Sie müssen in CI oder mit Docker laufen.

Grün ohne Mailpit (beide Projekte): `kontakt-api.spec.ts:135` (Widget, axe, keine Fremd-Requests), `:175` (Fokus aufs erste Fehlerfeld, volle Feldnamen) und `:262` (Methoden, Rate-Limit).

## 2. Abnahmepunkte

| Punkt | Urteil | Beleg |
|---|---|---|
| **B1** ALTCHA-Widget sichtbar und barrierefrei | **bestanden** | `[data-altcha-platz]` hat `display:block` und eine BoundingBox von 704×48 (Desktop) bzw. 339×48 (Mobil). Die Checkbox ist sichtbar und per Tastatur fokussierbar. Ihr Name lautet „Ich bin kein Roboter“ (Aria-Snapshot `checkbox "Ich bin kein Roboter"`). Nach dem Fokus startet die Prüfung (`auto="onfocus"`): `checkbox "Überprüft" [checked]`, `data-state="verified"`. axe meldet auf `/kontakt/` `[]` (Desktop und Mobil). Es gab 0 Fremd-Requests. Screenshots: `kontakt-widget-{desktop,mobil}.png` |
| **B1** noscript-Hinweis sichtbar | **bestanden** | Mit abgeschaltetem JS: `isVisible() = true`, BoundingBox 704×54 bzw. 339×77. Text: „Der Spam-Schutz dieses Formulars benötigt JavaScript. Bitte aktivieren Sie JavaScript, um die Anfrage zu senden.“ Screenshots: `kontakt-noscript-{desktop,mobil}.png`. Ursache behoben in `src/components/forms/KontaktFormular.astro:80` (`class="spamschutz"`) |
| **B2** `/partner/` verlinkt | **bestanden** | Alle 29 von 29 `index.html` in `dist/client` enthalten `href="/partner/"`. Im Footer unter „Seiten“ steht der Link „Partner werden“, sichtbar. Ein Klick führt zu `/partner/` mit der H1 „Partner“. Screenshots: `footer-partner-{desktop,mobil}.png` |
| **A11y 1** Fehlerliste mit vollem Label-Text | **bestanden** | Beim leeren Absenden erscheint der Titel „Bitte prüfen Sie 4 Angaben“ mit den Einträgen „Name: …“, „E-Mail: …“, „Ihr Vorhaben: …“ und „Datenschutzhinweis: …“. Die Labels lauten „Name (Pflichtfeld)“ und „Ihr Vorhaben (Pflichtfeld)“. Der Zusatz „(Pflichtfeld)“ wird also korrekt entfernt, und die Einwilligung heißt nicht mehr „Ich habe die:“. Screenshot: `kontakt-fehler-{desktop,mobil}.png` |
| **A11y 2** Fokus auf erstes Fehlerfeld | **bestanden** | Nach dem Absenden ist `document.activeElement` gleich `INPUT#feld-name`, und das ist auch das erste `[aria-invalid=true]` im DOM. Die Zusammenfassung hat `role="alert"`. Der Link `#feld-einwilligung` setzt den Fokus auf `#feld-einwilligung`. |
| Ablauf-Liste ohne doppelte Nummerierung (Screenreader-Baum) | **bestanden** | `list-style-type` ist `none` (ol und li), `padding-left` ist `0px`. Der vollständige CDP-AX-Baum von `/leistungen/trockenbau/` enthält **0** `ListMarker`. Keine Überschrift enthält „Schritt“. Die Überschriften lauten `heading "Aufmaß und Planung" [level=3]` usw. Sichtbar steht „Schritt 1:“ usw. Die Zählung kommt vom `ol` (`role="list"`). Screenshot: `ablauf-trockenbau-{desktop,mobil}.png` |
| Brotkrumen ohne Einzug | **bestanden** | Am `ol` ist `padding-left` `0px`, `margin-left` `0px` und `list-style` `none`. Das erste `li` liegt bei x=64, die H1 ebenfalls bei x=64 (Desktop). Mobil liegen beide bei x=21. Screenshot: `brotkrumen-trockenbau-{desktop,mobil}.png` |
| Neuer E2E-Test interne Verlinkung | **bestanden** | `seiten.spec.ts:178` ist in allen drei Läufen in beiden Projekten grün. **Red-Green:** Ich habe die Testlogik 1:1 nachgebaut (`/tmp/qa-e2e/verlinkt.mjs`) und gegen eine Kopie von `dist/client` laufen lassen. Ergebnis: `indexierbar 20 unverlinkt []`. Danach habe ich in der Kopie alle `href="/partner/"` entfernt. Ergebnis: `unverlinkt ["/partner/"]`. Der Test erkennt den Fehler also. |
| Kompression (br/gz) ohne Regression | **bestanden** | Alle 95 Text-Assets (html, css, js, svg, xml, txt, json) aus `dist/client` habe ich je mit `br`, `gzip` und `identity` abgerufen (`/tmp/qa-e2e/kompression.mjs`), insgesamt 285 Abrufe. 62 kamen als br, 62 als gzip, der Rest unkodiert. Alle dekodierten Inhalte sind **byte-gleich** mit der Datei in `dist`. Es gab 0 Fehler, `Vary: Accept-Encoding` ist überall gesetzt, und `identity` wird nie kodiert. Stichproben: `br;q=0, gzip` liefert gzip, `gzip;q=0` liefert unkodiert, `*` liefert br. Die CSP bleibt bei kodierten Antworten erhalten. HEAD liefert br mit Content-Length, CSS hat `immutable`. Im Browser wurden Seiten, CSS und JS als br geladen. Die Seiten rendern korrekt (Screenshots), und alle E2E außerhalb der Mail-Tests sind grün. |

## 3. Neue Befunde

| Nr. | Schwere | Befund | Datei:Zeile | Zuständig |
|---|---|---|---|---|
| N1 | niedrig (belegt) | Die Gewerke-Liste auf den Leistungsseiten hat den Browser-Standardeinzug. `.gewerke-liste` setzt kein `padding`, daher `padding-left: 40px`. Gemessen: `ul` bei x=21, `li` bei x=61, H1 bei x=21 (Mobil 390 px). Der obere Rahmen läuft über die volle Breite, die Trennlinien der Einträge sind eingerückt. Es ist dieselbe Fehlerklasse wie H5 (Brotkrumen). Das Problem besteht schon seit `ed37c19` und ist keine Regression der Fixes. | `src/components/sections/GewerkeListe.astro:17` (ul), `:35-40` (Stil); Screenshot `brotkrumen-trockenbau-mobil.png` | page-builder |
| N2 | Beobachtung (Ursache: Vermutung) | `design-system.spec.ts:96` und `:125` (chromium) schlugen im ersten Volllauf fehl: `/styleguide/` ohne `navigation "Hauptnavigation"` bzw. ohne `#hauptmenue`. Isoliert liefen sie 13/13 grün, ohne die Mail-Suite 151/151 und im dritten Volllauf ebenfalls grün. Die Fehler sind also nicht reproduzierbar. Vermutung: Last durch parallele Kontakt-Tests (Foto- und HEIC-Verarbeitung). Bitte in CI beobachten, ob der Test flaky ist. | `tests/e2e/design-system.spec.ts:108`, `:130` | design-system (Test), architect (CI) |

Hinweis ohne Befund: Mobil steht nach dem Fokus auf `#feld-name` der Titel der Fehlerzusammenfassung oberhalb des sichtbaren Bereichs. Durch `role="alert"` wird er trotzdem angesagt.

## 4. Nicht prüfbar

- Kontakt-E2E mit Mailversand (`kontakt-api.spec.ts:95, :161, :188, :205, :221`), weil kein Docker-Daemon, kein Mailpit und kein SMTP verfügbar sind. Diese Tests bitte in CI nachholen.
