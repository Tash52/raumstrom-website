# Phase 5 · qa-verifier · Abnahme „gestaltbarer Planer, 8 Stilpakete"

Stand: 21.11.2026. Code-Stand `main` 158214b (HEAD 0137937 enthält nur Doku/Screenshots). `dist/` nicht neu gebaut: Kopie per `cp -a` nach `/tmp/qa5/dist`, Server `server/server.mjs` auf 127.0.0.1:4650 (Wegwerf-Secrets), E2E auf Port 4601. Mailpit-Stub (`/api/v1/info`, `messages_count`) auf 127.0.0.1:8025, `E2E_MAILPIT=extern`. Browser: Playwright-Chromium headless (SwiftShader), 1440 × 900 und 390 × 844 (Touch, DPR 2). Skripte: `/tmp/qa5/{lib,a-flaechen,b-elektro,c-stil,d-nass,e-richtung,f-leiste,g-3d,h-alle,i-kontrast,j-warn}.mjs`, `/tmp/qa5/v1.mts`, `/tmp/qa5/vergleich.mjs`.

Grundlage: Plan Abschnitt 3 (Phase 5), Briefing 7.2, 7.3, 7.5, Berichte `5-planner-design.md`, `5-planner-geometry.md`, `5-trend-researcher.md`, `UEBERGABE.md`.

## 1. Automatische Prüfungen (wörtlich)

| Befehl | Ergebnis |
| --- | --- |
| `npm ci` | `added 521 packages, and audited 522 packages in 16s` · `found 0 vulnerabilities`, Exit 0 |
| `npm test` | Vitest `Test Files  30 passed (30)` · `Tests  480 passed (480)`; Hook-Test `# pass 7` `# fail 0`; Exit 0 |
| `npm run check` | `Result (240 files): - 0 errors - 0 warnings - 1 hint`, Exit 0 |
| `npm run licenses -- --check` | `Lizenzen ok (599 Pakete).` Exit 0 |
| `npm run trend-schema -- --check` | `Trend-Schema aktuell.` Exit 0 |
| `npm run scan:wording` | `Wording-Scan: keine verbotenen Begriffe gefunden.` Exit 0 |
| `npm run platzhalter` | `Launch-Check: 127 offene(r) Punkt(e), 0 Fehler.` Exit 0. Änderte nur das Datum in `PLATZHALTER.md` (20.→21.11.); Datei auf den HEAD-Inhalt zurückgeschrieben, Arbeitsbaum dort unverändert |
| `E2E_MAILPIT=extern E2E_PORT=4601 npx playwright test` | `4 failed` · `5 skipped` · `223 passed (3.4m)`. Rot nur die 4 bekannten Mail-Tests `kontakt-api.spec.ts:96` und `:206` (chromium + mobile, kein SMTP). Übersprungen: 5 projektspezifische Skips (Desktop-/Mobil-only). `planer-gestalten.spec.ts` + `raumplaner.spec.ts`: 30/30 grün |

## 2. Abnahmepunkte

Legende: **bestanden** = selbst im Browser oder per Befehl belegt; **nicht bestanden**; **nicht prüfbar** (mit Grund).

### Werkzeugleiste und Flächenmodi (Briefing 7.2)

| Punkt | Ergebnis | Beleg |
| --- | --- | --- |
| 9 Modi (Bauen · Elektro · Wände · Boden · Fliesen · Decke · Türen & Fenster · Einrichtung · Ansicht) | **bestanden** | Texte exakt, 1440 und 390; bei 390 horizontal scrollbare Leiste (scrollWidth 731 / 390, `overflow-x:auto`), gewählter Modus rückt in den Viewport. `5-qa-werkzeugleiste-oben-390.png` |
| Kachel-Auswahl mit Vorschau | **bestanden** | Kacheln mit gezeichneter Vorschau in allen Flächenmodi, Screenshots `5-qa-waende-akzent-1440.png`, `5-qa-fliesen-1440.png` |
| Wände: Farbe (Palette mit eigenen Namen + Farbrad) | **bestanden** | „Salbei" → `Wände in Wohnzimmer: Wandfarbe matt, Salbei.`; Farbrad `#336699` + „Farbe übernehmen" → `…, #336699.` (1440 und 390) |
| Wände: Tapete (Raufaser, Vlies, Strukturvlies, Glasfaser, Mustertapete in Designs) | **bestanden** | Alle 5 Tapeten angewendet; Mustertapete-Designs `Streifen/Rauten/Bögen/Punkte/Blätter`, Wandseite → `Wände dieser Wandseite: Mustertapete, Bögen, #336699.` |
| Wände: Putz (Q3, Q4, Rau, Kalk, Lehm, Betonoptik, Mikrozement) | **bestanden** | Alle 7 Putze angewendet (`h-alle.mjs`: 20/20 Wandkacheln inkl. Akustik-/Wandpaneel, Holzverkleidung, Vorsatzschale, Nische) |
| Pro Wandseite und pro Raum, Akzentwand | **bestanden** | „Wandseite im Raum" (Wand 1–7 mit Innenlänge) + „Wandseite / Fläche" → `Wände dieser Wandseite: Akzentwand, #336699.`; Raum und „Alle Räume" ebenso. In 3D Wand antippen → `Wände dieser Wandseite: Akzentwand, Kalkweiß.` (1440 und 390 per Touch) |
| Boden mit Muster/Richtung, Holzton, Sockelleiste | **bestanden** | Parkett → Fischgrät (`Stab 60 × 10 cm`), Holzton, `Sockelleiste Holz`; alle 12 Bodenkacheln. Richtung 0°→90° ändert die Darstellung sichtbar (`5-qa-richtung-0-1440.png` / `-90-`). Meldung nennt die Richtung nicht (Befund Q3) |
| Fliesen: Format, Muster, Fuge, Höhe, Oberfläche | **bestanden** | 8 Formate (30×60 … Zellige), 7 Muster, Fugenfarbe, Fuge 5 mm, Höhe halbhoch/Spritzschutz/raumhoch je in der Meldung; Wand- und Bodenfliesen; alle 7 Oberflächen |
| Decke (Farbe, abgehängt, Lichtvoute, Stuck) | **bestanden** | 4/4 Kacheln, Meldungen `Decke mit Lichtvoute`, `Decke mit Stuckleiste`, `Abgehängte Decke`, Deckenfarbe „Muschel"; in 3D per Boden-Tippen im Modus Decke |
| Türen & Fenster: Stil, Farbe, Zarge, Glas, Schiebetür, Fensterbank, „auf alle" | **bestanden** | Tür: Landhaus, Farbe, Stahlzarge, satiniert, Schiebetür → `Tür geändert.`; Fenster Holz + Fensterbank Holz, „Auf alle Fenster übertragen" (`5-qa-tueren-fenster-1440.png`) |
| Pipette | **bestanden** (mit Befund Q2) | Akzentwand aufgenommen (`Pipette: Akzentwand, #336699 übernommen.`) und auf Wandseite im Schlafzimmer angewendet. Im Modus Fliesen „Wände" mit gewähltem Raum liest die Pipette aber den Boden (Q2) |
| Undo/Redo | **bestanden** | Knöpfe, Strg+Z, Strg+Y, Strg+Umschalt+Z; Elektro-Stückliste 8 → 7 → 8; Stilpaket rückgängig |

### Elektro

| Punkt | Ergebnis | Beleg |
| --- | --- | --- |
| Alle Typen laut 7.2 | **bestanden** | 31 Kacheln, Liste deckt 7.2 vollständig ab |
| Platzieren an Wand (Standardhöhen) und Decke | **bestanden** | 2× Steckdose 2-fach (30 cm), Ausschalter (105 cm), LAN 2-fach, USB-Steckdose, Klingel an der Wand; Deckenauslass, Rauchwarnmelder an der Decke; Wandtyp im Raum abgewiesen (`sitzt an der Wand`) |
| Höhe ändern | **bestanden** | 30 → 115 cm: `Höhe 1,15 m.`, Zonenhinweis `data-gestalt-zone=nein` |
| Zonen-Overlay 2D/3D | **bestanden** (Kontrast siehe a11y B2) | 2D: 152 Linien, Arten ZW-o, ZW-u, ZW-m, ZS-t, ZS-f, ZS-e; 3D: Bänder im Modus Elektro und per „Installationszonen einblenden" (`5-qa-elektro-3d-zonen-1440.png`, `5-qa-ansicht-rundgang-*.png`) |
| Stückliste je Raum stimmt | **bestanden** | Gesetzt = Liste, 1440 und 390: Wohnzimmer {Steckdose 2-fach 2, Ausschalter 1, LAN 2-fach 1, Deckenauslass 1}, Schlafzimmer {USB 1, Rauchwarnmelder 1}, Flur {Klingel 1}; „außerhalb der Installationszonen" korrekt markiert. Warntext zu kontrastarm (Q1) |
| Klingel nur Audio | **bestanden** | Kachel „Klingel / Sprechanlage (Audio)", kein Kamera-/Video-Typ |

### Einrichtung und Ansicht

| Punkt | Ergebnis | Beleg |
| --- | --- | --- |
| Einrichtung „nur Visualisierung" sichtbar | **bestanden** | Panel und 3D-Overlay: „Einrichtung nur zur Visualisierung, nicht Teil des Angebots."; Bett platziert/gedreht/verschoben, WC platziert; 10 Möbel |
| Orbit | **bestanden** | Ziehen dreht (`5-qa-ansicht-orbit-*.png`) |
| Draufsicht | **bestanden** | Radio und Knopf (`5-qa-ansicht-draufsicht-*.png`) |
| Rundgang (WASD, Touch-Joystick) | **bestanden** | `data-planer-blick=rundgang`, W/Pfeil bewegt; Joystick nur bei Touch sichtbar (390 ja, 1440 nein); „Rundgang beenden" |
| Tageszeit/Licht | **bestanden** | 7 Uhr und 21 Uhr sichtbar verschieden (`5-qa-ansicht-morgen-masse-zonen-*`, `5-qa-ansicht-abend-*`) |
| Wände ausblenden (ganz/niedrig/aus) | **bestanden** | `5-qa-ansicht-waende-niedrig-*`, `5-qa-ansicht-waende-aus-*` |
| Maße | **bestanden** | 22 Maßlabels (CSS2D). Kosmetisch: Labels überdecken Raumbeschriftungen teilweise (Hinweis H2) |
| Screenshot | **bestanden** | Download `raumplaner-ansicht-2026-11-21.png`, 62 KB (1440) / 29 KB (390) |

### Stilpakete (Briefing 7.3)

| Punkt | Ergebnis | Beleg |
| --- | --- | --- |
| Alle 8 Pakete im Planer auswählbar | **bestanden** | „Ideenlos? Stilpakete 2026/27": Dark & Moody, Hotelbad, Industrial Loft, Japandi, Landhaus modern, Mid-Century, Modern Warm Minimal, Skandinavisch hell (1440 und 390) |
| Paket auf Raum | **bestanden** | Alle 8 nacheinander „Auf Raum" Wohnzimmer; Wand und Boden je Paket per Pipette gelesen (z. B. Japandi: Kalkputz Haferweiß, Parkett Landhausdiele Eiche hell), Schlafzimmer bleibt leer |
| Paket auf Wohnung | **bestanden** | Hotelbad / Mid-Century / Japandi auf alle 5 Räume: Wand, Boden, Decke gesetzt; Bad bekommt Wandfliesen halbhoch und Wandfarbe statt Tapete (Mid-Century: `Wandfarbe seidenmatt` statt Mustertapete), Küche Spritzschutz an jeder Wandseite |
| Danach einzeln änderbar | **bestanden** | Boden Wohnzimmer → Teppich, Schlafzimmer-Boden und Wohnzimmer-Wand unverändert; Akzentwand auf einzelner Wandseite |
| Elektro-Vorschlag | **bestanden** (als Text) | Erscheint je Paket als Text, setzt keine Punkte (im Bericht als Vereinfachung genannt) |
| `trend_quelle_notiz` nicht ausgeliefert | **bestanden** | `data-planer-stilpakete` im HTML ohne das Feld, keine Notiz im HTML |
| Schema/Felder | **bestanden** | `trend-schema --check` ok, Vitest „alle 8 Stilpakete" grün |

### Weitere Punkte

| Punkt | Ergebnis | Beleg |
| --- | --- | --- |
| v1-Projekt-JSON lädt (Migration) | **bestanden** (Bibliothek) / UI **nicht prüfbar** | Echte v1-Dateien mit dem Phase-4-Code (git `db37377~1`) erzeugt (4 Vorlagen, ein Raum umbenannt), mit `parseProjekt` aus main geladen: alle `v1 -> v2`, Wände/Räume/Öffnungen erhalten, neutrale Vorgaben, v2-Rundlauf ok, v3 abgelehnt. Im Planer gibt es noch keinen Datei-Import (Briefing 7.4, Phase 6) |
| Texturen-Herkunft `public/textures/QUELLEN.md` (CC0) | **bestanden** | Poly-Haven-API bestätigt Namen und Urheber aller 4 Assets; Originale (1k-Diffuse von dl.polyhaven.org) auf 64 px verglichen: mittlere Abweichung 0,7–1,1 von 255, Gegenprobe falsche Zuordnung 23,6. Lizenz-Seite verlinkt, Umwandlung dokumentiert. KTX2 → WebP begründet (CSP `unsafe-eval`) |
| Texturen lazy, selbst gehostet, 0 Fremd-Requests, 0 CSP | **bestanden** | Alle Browserläufe: `fremd=0 csp=0 pageerror=0 console.error=0`; E2E prüft Nachladen erst bei Bedarf und 256 px auf Mobil |
| Wording: Ansicht statt Kamera, keine Marken-/Farbsystemnamen | **bestanden** | Sichtbarer Planertext in allen 9 Modi ohne Kamera/Video/Meister/Superlative/RAL/NCS/Pantone; Paket- und Farbnamen eigene (Haferweiß, Salbei, Taubenblau …); `scan:wording` sauber. RAL/NCS/Pantone nur im Code-Kommentar `src/lib/materials/farben.ts:3` und `docs/TREND-UPDATE.md:10` als Verbot |
| Gewerke-Kennzeichnung (Stichprobe) | **bestanden** | `/leistungen/bad-fliesen/`, `/boden/`, `/elektro-modernisierung/` zeigen „Ausführung durch unsere(n) Meister-Partnerbetrieb(e)"; Planer ohne Gewerke-Aussagen |
| 60 fps / Mittelklasse-Gerät | **nicht prüfbar** | Keine GPU in der Cloud (Plan Abschnitt 5, Punkt 2); Gerätetest durch den Betreiber |
| Kontrast/Tastatur/Chunk-Größen | siehe `5-a11y-perf-tester.md` | Nicht doppelt gemessen, außer Q1 (neu) |

### Phase-4-Nachprüfungspunkte

| Punkt | Ergebnis | Beleg |
| --- | --- | --- |
| Gewählter Raum im Plan gekennzeichnet | **bestanden** | `[data-planer-raum-auswahl="r2"]`, Kontur `rgb(61, 99, 0)` 3 px; Kontrast zur gewählten Füllung ≥ 5,3:1 (ohne Alpha gerechnet, mit Alpha höher). `5-qa-p4-raumauswahl-*.png` |
| Kurzanleitung bei 390 px | **bestanden** | Kurzanleitung im Fluss über der Zeichenfläche, keine Überdeckung von Zoomknöpfen (3) und Statusmeldung (1440 und 390); Fokus nach „Verstanden" auf dem Editor. `5-qa-p4-kurzanleitung-390.png` |

## 3. Befunde

- **Q1 (mittel, belegt, WCAG 1.4.3): Warntext im Elektro-Panel unter 4,5:1.** `.gestalt-warnung` nutzt `var(--color-fehler-dunkel)` (`#ff8b7b`, laut `src/styles/tokens.css:28` für dunklen Grund) auf hellem Panel: gemessen `rgb(255,139,123)` auf `rgb(244,241,235)` = **2,02:1**. Datei: `src/islands/planner/gestalten/gestalten.css:79`. Betrifft „· N außerhalb der Installationszonen" in der Stückliste (`Panel.tsx:625`) und „Liegt außerhalb der Installationszonen …" (`Panel.tsx:691`). Sichtbar in `5-qa-elektro-stueckliste-390.png`. Fix: `var(--color-fehler)` (`#b42318`, 5,8:1). Ergänzt a11y B5 („kein Text unter 4,5:1"), dort waren keine Warnungen im Zustand. Verantwortlich: **planner-design**.
- **Q2 (niedrig, belegt): Pipette im Modus Fliesen „Wände" liest den Boden.** Ist ein ganzer Raum gewählt (Ziel `boden`), nimmt `nimmPipette` immer `boden`, unabhängig von „Fliesen für: Wände" (`src/islands/planner/gestalten/aktionen.ts:169`, ebenso `refAmZiel` `aktionen.ts:160`). `wendeAn` beachtet `fliesenZiel` dagegen (`aktionen.ts:113`). Beobachtet: Bad nach Paket „Hotelbad", Pipette ergab die Bodenfliese mit „halbhoch". Fix: bei `fliesenZiel === 'wand'` `gestaltung.fliesen` des Raums lesen. Verantwortlich: **planner-design**.
- **Q3 (niedrig, belegt): Verlegerichtung fehlt in der Beschreibung.** `beschreibeRef` (`src/lib/materials/katalog.ts:450-461`) gibt `richtungGrad` nicht aus. Meldung nach Richtungswechsel bleibt gleich, und `raumMaterialien` (Grundlage für das PDF in Phase 6) verliert die Richtung. Darstellung in 3D stimmt. Verantwortlich: **planner-design** (vor Phase 6).
- **Q4 (Hinweis, belegt): veralteter Kommentar.** `src/lib/materials/katalog.ts:11` nennt `<id>-<px>.ktx2`, ausgeliefert wird WebP. Verantwortlich: **planner-design**.
- **Q5 (Hinweis, belegt): CLAUDE.md ohne die neuen Schnittstellen.** `raumMaterialien`, `beschreibeRef`, `materialVon`, `NUR_VISUALISIERUNG` (`src/lib/materials/index.ts`), `elektroStueckliste`, `elektroGesamt`, `installationsZonen`, `inZone` (`src/lib/electro/index.ts`) und `public/textures/` fehlen (grep ohne Treffer; offen laut `5-planner-design.md`). Verantwortlich: **architect**.
- **H1 (Hinweis, belegt): Tippen auf ein Fenster im Modus Elektro.** Liegt der Klickpunkt auf einer Fenster-/Türöffnung, kommt „Tippen Sie auf eine Wandseite oder in einen Raum." (`aktionen.ts:326`), obwohl man auf die Wand getippt hat. Ein Satz wie „Hier ist ein Fenster, bitte daneben tippen" wäre klarer. Verantwortlich: **planner-design**.
- **H2 (Hinweis, belegt, kosmetisch): Maßlabels überdecken Raumlabels in 3D** (z. B. „2,40 m" über „Schlafzimmer · 11,5 m²", `5-qa-ansicht-abend-1440.png`). Verantwortlich: **planner-design**.

Vermutungen: keine als „bestanden" gewertet. Nicht selbst geprüft: Fischgrät-Ausrichtung je Stab (laut Bericht vereinfacht), Möbel blockieren den Rundgang nicht (laut Bericht).

## 4. Fazit

DoD Phase 5 „gestaltbarer Planer, 8 Stilpakete": **erfüllt**. Alle 9 Modi, Elektro mit Zonen und korrekter Stückliste, Ansichten, Pipette, Undo/Redo und alle 8 Stilpakete (Raum/Wohnung, danach einzeln änderbar) funktionieren bei 1440 und 390 px ohne Skript-, CSP- oder Fremd-Request-Fehler. Vor Phase 6 beheben: Q1 (Kontrast) sowie Q2 und Q3 (Pipette, Richtung im PDF-Text). Q4, Q5, H1 und H2 sind Kleinigkeiten.

Screenshots: `docs/agent-reports/screenshots/5-qa-*.png` (1440 und 390).
