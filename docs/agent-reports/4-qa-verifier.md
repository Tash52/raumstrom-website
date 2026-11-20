# Phase 4 · qa-verifier · Abnahme Raumplaner Teil 1

Stand: 20.11.2026, `main` @ `c586b90`. Geprüft in einem frischen Klon (Scratchpad), damit `npm ci` nicht das `node_modules` des parallel messenden a11y-perf-tester ersetzt. `dist/` nicht neu gebaut: Kopie des vom Orchestrator gebauten `build:staging` (`cp -a`). Eigener Server auf Port 4520, E2E auf 4510/4511, Mailpit-Info-Stub auf 127.0.0.1:8025.

## 1. Befehle und Ausgaben (wörtlich, gekürzt auf die Summen)

- `npm ci`: `added 521 packages, and audited 522 packages in 13s` · `found 0 vulnerabilities`
- `npm test`: `Test Files  24 passed (24)` · `Tests  402 passed (402)`; Hook-Test `# tests 7 # pass 7 # fail 0`; Exit 0
- `npm run check`: `Result (207 files): - 0 errors - 0 warnings - 5 hints`; Exit 0 (Hinweise: `z.number().finite()` deprecated, `src/lib/geometry/projekt.ts:20/:21`)
- `npm run scan:wording`: `Wording-Scan: keine verbotenen Begriffe gefunden.`
- `npm run licenses -- --check`: `Lizenzen ok (599 Pakete).`
- `npm run platzhalter`: keine Änderung an `PLATZHALTER.md` (`git status` leer)
- E2E gesamt (`E2E_MAILPIT=extern E2E_PORT=4510 npx playwright test`): `5 failed · 5 skipped · 208 passed (3.4m)`
  - 4 × erwartbar (kein Mailpit): `kontakt-api.spec.ts:96` und `:206`, jeweils chromium und mobile
  - 1 × **unerwartet**: `[mobile] raumplaner.spec.ts:102` „Tastatur: Rechteck zeichnen …" – `Expected: "Räume (1)" Received: "Räume (0)"` (Zeile 121)
  - Nachlauf nur dieses Tests, `--repeat-each=6`: `12 passed` → flaky, siehe Befund B1
  - 5 skipped sind bewusste `test.skip` (Desktop/Mobil-Weichen in `design-system.spec.ts`, `motion-3d.spec.ts`)

## 2. Browserprüfung (eigene Skripte, Playwright, 1440 px und 390 px)

Screenshots: `docs/agent-reports/screenshots/4-qa/` (`desktop-*` und `mobil-*`: 01 Start, 02 Kurzanleitung, 03 2D-Editor EFH, 04 3D EFH, 05 3D Draufsicht, 06 Upload + Kalibrierung + gezeichnete Wände, 07 ohne WebGL, 08 noscript, 09 HEIC-Upload).

Gemessen je Profil (Desktop und Mobil identisch, sofern nicht anders genannt):
- Vorlagen: 1-Zimmer 10 Wände/3 Räume/3 Türen/3 Fenster · 2-Zimmer 17/5/5/6 · 3-Zimmer 22/7/7/8 · EFH-EG 22/7/7/9
- 3D (SwiftShader): `data-planer-3d="bereit"`, Öffnungen in den Wänden sichtbar ausgeschnitten, Glas und Türblätter vorhanden (04, 05). Tastatur (Pfeile, `+`) ändert das Canvas-Bild (Pixelvergleich: verändert).
- JPEG-Upload mit EXIF → Editor, Werkzeug Maßstab aktiv, Kalibrierung per Tastatur „Maßstab festgelegt (4,00 m)".
- Wände per Maus (Desktop) bzw. Touch-Tap (Mobil) mit absichtlich schiefen Punkten: Winkel `[0, 90, -135]` → Einrasten 0°/90°/45° belegt.
- Zoom: Mausrad (Desktop) und Zwei-Finger-Pinch über CDP-Touch (Mobil) ändern die Transformation (`scale(12.35)` → `scale(49.4)`), keine Wand dabei erzeugt.
- HEIC (`tests/fixtures/backend-api/testbild.heic`): Editor erscheint, `heic-to`-Chunk und blob-Worker geladen, 0 Fehler, 0 CSP-Verstöße.
- Ohne WebGL: 3D-Tab zeigt „Die 3D-Ansicht ist in diesem Browser nicht verfügbar …" mit Link `/kontakt/`; 2D bleibt nutzbar.
- Ohne JavaScript: `.planer-noscript` „Der Raumplaner benötigt JavaScript … zum Kontaktformular." mit Link `/kontakt/`.
- Konsole: 0 `error`, 0 `pageerror`, 0 CSP-Meldungen, `securitypolicyviolation` leer, 0 Fremd-Requests (alle Läufe). Warnungen: `BVH: "maxLeafSize" … deprecated` (32×, three-bvh-csg), `THREE.Clock … deprecated`, SwiftShader „GPU stall due to ReadPixels" (Folge meiner Pixel-Screenshots).
- Header: `/raumplaner/` `script-src 'self' 'wasm-unsafe-eval' …`, `worker-src 'self' blob:`; `/kontakt/` `script-src 'self' …` ohne wasm, `worker-src 'self'`; `/pdfjs/pdf.worker.min.mjs` `script-src 'self' 'wasm-unsafe-eval'`. Kein `'unsafe-inline'`/`'unsafe-eval'`.

## 3. DoD Phase 4 – Einzelbewertung

| Punkt | Ergebnis | Beleg |
|---|---|---|
| Upload Bild | bestanden | JPEG/PNG mit EXIF im Browser (meine Läufe, E2E `raumplaner.spec.ts` Upload) |
| Upload PDF (selbst gehosteter Worker, Seitenauswahl) | bestanden | E2E „mehrseitiges PDF", Worker-Request `/pdfjs/pdf.worker.min.mjs`, grün in beiden Projekten |
| Upload HEIC | bestanden | eigener Browserlauf mit Fixture, beide Viewports |
| EXIF entfernt | bestanden (Code + Verhalten) | Neu-Zeichnen auf Canvas `src/islands/planner/upload/verarbeiten.ts:27-50`, Bild verlässt den Browser nicht und ist nicht im Projekt-JSON |
| Falsches Format / > 20 MB abgelehnt | bestanden | E2E grün |
| Kalibrierung | bestanden | eigener Lauf + E2E, „Maßstab festgelegt" |
| Wände mit Snapping (90°/45°, Andocken, Raster) | bestanden | gemessene Winkel 0/90/−135; Unit `tests/unit/geometry/` (Snapping, Andocken, T-Anschluss) |
| Raumerkennung | bestanden mit Einschränkung | Vorlagen 3/5/7/7 Räume, E2E 10,0 m²; aber B1 (Tastatur unter Last) |
| Türen/Fenster | bestanden | Vorlagen mit Öffnungen, E2E Fenster per Tap/Klick, Tür über Panel |
| 3D mit Öffnungen (CSG) | bestanden | Screenshots `*-04-3d-efh.png`, `*-05-3d-draufsicht.png` |
| Vorlagen (4) | bestanden | alle vier geladen, Zahlen oben |
| Geometrie-Unit-Tests | bestanden | 402/402, darin `tests/unit/geometry/` |
| Bedienung Maus | bestanden | Klick-Zeichnen, Mausrad-Zoom |
| Bedienung Touch | bestanden | Tap-Zeichnen, Pinch-Zoom (CDP) |
| Bedienung Tastatur | bestanden mit Einschränkung | E2E Tastatur-Rechteck, Kalibrierung, 3D-Tasten; flaky unter Last (B1); Fokusverlust nach Kurzanleitung (B2) |
| Hinweis „Visualisierung, unverbindlich …" | bestanden | `[data-planer-hinweis]` = „Visualisierung, unverbindlich, Maße ohne Gewähr, kein Angebot." beide Viewports |
| Wording „Ansicht" statt Kamera | bestanden | sichtbarer Text und HTML des Planers ohne „kamera/camera"; Planer-Chunks ohne „Kamera"; `scan:wording` grün. „camera" nur als three-API-Bezeichner in `szene/Ansicht3D.tsx` |
| noscript-Fallback | bestanden | Screenshot `*-08-noscript.png` |
| No-WebGL-Fallback | bestanden | Screenshot `*-07-ohne-webgl.png` |
| 0 Konsolenfehler | bestanden | 0 `error`/`pageerror` in allen Läufen (nur Warnungen, s. o.) |
| 0 CSP-Verstöße | bestanden | Konsole und `securitypolicyviolation` leer, inkl. PDF und HEIC |
| 0 Fremd-Requests | bestanden | eigene Läufe + E2E |
| Planer-Chunk nur auf `/raumplaner/` | bestanden | E2E „Planer-Chunk wird nur auf /raumplaner/ geladen" grün |
| Projektmodell in `CLAUDE.md` = Code | bestanden | `CLAUDE.md:49` gegen `src/lib/geometry/projekt.ts:19-89` (Felder, Enums, `version` literal 1, ID-Regex `^[a-z]+[0-9]+$`), Exporte `mitRaeumen` `raeume.ts:108`, `wandKoerper`/`bodenFlaechen` `extrusion.ts:57/:94`, `baueSzene` `szene/bauen.ts:32` mit `userData` `:77/:88/:100/:115`, Store `planerStore`/`usePlaner`/`aendere`/`hintergrund` in `store.ts` |
| Alle Tests grün | **nicht bestanden** (knapp) | E2E: 1 unerwarteter Fehlschlag (B1, flaky); 4 Mail-Tests nicht prüfbar ohne Mailpit (CI) |
| 60 fps auf echter Hardware | nicht prüfbar | nur SwiftShader im Container (Betreiber) |
| WASM-Decoder im pdf.js-Worker (JPX/JBIG2) | nicht prüfbar | kein Test-PDF mit JPX/JBIG2 (wie architect offen) |

## 4. Befunde

- **B1 (mittel, belegt: Fehlschlag + Trace; Ursache Vermutung) – planner-geometry.** `tests/e2e/raumplaner.spec.ts:102` scheitert im Gesamtlauf auf mobile (`:121` „Räume (0)"), einzeln 12/12 grün. Der Trace zeigt 4 Wände (5,4)→(9,4), (9,4)→(9,7), (9,7)→(8,7), (8,7)→(5,7): die dritte Länge „400" wurde nicht als eine Wand übernommen, `ArrowUp` vor „300" ging verloren, das Rechteck schließt nicht. Vermutete Ursache: `onKeyDown` liest `zeiger`, `start` und `eingabe` aus dem Render-Abschluss (`src/islands/planner/Editor2D.tsx:489`, `:536`, `:549`), schnelle Tastenfolgen vor dem Re-Render sehen veraltete Werte. Abhilfe: Werte über Refs lesen (wie `ansichtRef`) oder Eingabezustand in den Store. Danach Test unter Last wiederholen.
- **B2 (niedrig, belegt) – planner-geometry.** Nach „Verstanden" in der Kurzanleitung fällt der Fokus auf `<body>` (gemessen: `BODY`), Tastaturnutzer verlieren die Position. `src/islands/planner/Planer.tsx:267` (`setTour('zu')`) sollte den Fokus auf `[data-planer-editor]` setzen. Zusätzlich deckt die nicht-modale Kurzanleitung den Editor ab, Tipps in diesem Bereich gehen ins Leere (bewusstes Verhalten, nur Hinweis).
- **B3 (niedrig, belegt) – content-writer, bekannt aus Phase 3.** `src/content/pages/raumplaner.md:4` und `:9` versprechen Steckdosen/Schalter/Lichtpunkte und das Senden der Skizze; das kann der Planer erst ab Phase 5/6. Vor Launch abgleichen.
- **B4 (Hinweis) – planner-geometry.** Konsolen-Warnung `maxLeafSize` deprecated (32× je 3D-Aufbau, three-bvh-csg 0.0.18); `THREE.Clock` (R3F, bekannt). Keine Fehler.
- **B5 (Hinweis) – planner-geometry.** `npm run check` meldet 2 Deprecation-Hinweise `z.number().finite()` in `src/lib/geometry/projekt.ts:20-21` (zod 4: `finite` ist Standard).

## 5. Stichproben

- Wording: Planer-HTML und Planer-Chunks ohne Kamera/Meister/Fachbetrieb/Festpreis/Superlative; Hinweise nur als „Meister-Partnerbetrieb(e)".
- Gewerke-Kennzeichnung (`dist/client/leistungen/*/index.html`): alle Leistungen mit Partner-Gewerk zeigen den Hinweis (z. B. `wallbox` mit 2 Partner-Gewerken → Plural „Meister-Partnerbetriebe"); `pruefservice-ladesaeulen` (nur eigen) 0 Hinweise; bei `trockenbau`/`boden` (nur eigen) stammen die Hinweise ausschließlich aus Teaser-Karten anderer Leistungen (Überschriften davor: Komplettrenovierung, Wohnung bezugsfertig, Mieterwechsel, Wände und Decken, Bad und Fliesen) – korrekt.

## Fazit

Funktional ist die DoD Phase 4 erfüllt (Grundriss → 3D inkl. PDF/HEIC, Kalibrierung, Snapping, Räume, Öffnungen, Vorlagen, Fallbacks, CSP/Fremd-Requests sauber, Projektmodell dokumentiert). Nicht abnahmereif ist der Punkt „alle Tests grün" wegen des flaky Tastatur-Tests (B1), der auf ein echtes Zustandsproblem im Tastatur-Handler hindeutet. Empfehlung: B1 und B2 durch planner-geometry beheben, danach Nachprüfung nur der Raumplaner-E2E (mehrfach, im Gesamtlauf).
