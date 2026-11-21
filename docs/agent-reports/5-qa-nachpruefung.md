# Phase 5 · qa-verifier · Nachprüfung der Fixes

Stand: 21.11.2026, `main` a84e80b (Merge der Fix-Runde 28f6c26). `dist/` nicht neu gebaut (Build 04:50:53, nach dem Merge-Commit 04:50:43): Kopie per `cp -a` nach `/tmp/qa5n/dist`, `server/server.mjs` auf 127.0.0.1:4660 (Wegwerf-Secrets), E2E auf Port 4610, Mailpit-Stub auf 127.0.0.1:8025 (`E2E_MAILPIT=extern`). Chromium headless (SwiftShader), 1440 × 900 und 390 × 844 (Touch, DPR 2). Skripte: `/tmp/qa5n/{lib,k-pruef,l-mobil,m-axe,n-leistung}.mjs`. Screenshots: `docs/agent-reports/screenshots/5-nachpruefung/`.

Grundlage: `5-qa-verifier.md` (Q1–Q4, H1, H2), `5-a11y-perf-tester.md` (B1–B4), `5-planner-design.md` Abschnitt „Fixes".

## 1. Regressionen (wörtlich)

| Befehl | Ergebnis |
| --- | --- |
| `npm test` | `Test Files  31 passed (31)` · `Tests  486 passed (486)`; Hook `# pass 7` `# fail 0`; Exit 0 |
| `npm run check` | `Result (242 files): - 0 errors - 0 warnings - 1 hint`, Exit 0 |
| `E2E_MAILPIT=extern E2E_PORT=4610 npx playwright test tests/e2e/raumplaner.spec.ts tests/e2e/planer-gestalten.spec.ts` | `30 passed (48.2s)`, Exit 0 |
| `npm run scan:wording` | `Wording-Scan: keine verbotenen Begriffe gefunden.` |
| Konsole/CSP/Fremd (alle 12 Browserläufe, 1440 und 390) | jeweils `fremd=0 csp=0 pageerror=0 console.error=0` |

## 2. Punkte

| Punkt | Ergebnis | Beleg |
| --- | --- | --- |
| **Q1** Warntext ≥ 4,5:1 | **bestanden** | Echter Zustand (Steckdose auf 160 cm, `data-gestalt-zone=nein`): beide `.gestalt-warnung` („Liegt außerhalb …" und „· 1 außerhalb …" in der Stückliste) `rgb(180,35,24)` auf `rgb(244,241,235)` = **5,83:1**, 1440 (14 px) und 390 (13 px). `q1-warnung-*.png` |
| **B2** Zonen-Overlay/Legende ≥ 3:1 gegen #FBFAF7 | **bestanden** | 2D waagerecht `rgba(61,99,0,0.9)`, gestrichelt, Komposit **5,34:1** (74 Linien); senkrecht Schraffur-Grund `rgb(140,92,0)` **5,52:1**, helle Schraffurlinie ca. 1/3 der Musterbreite (78 Linien). Legende: grün 6,24:1 (Panel) / 6,74:1 (#FBFAF7), braun 5,11:1 / 5,52:1 plus 2-px-Rand; Muster im Text erklärt. Farbe nicht allein Träger (Strich vs. Schraffur). 3D-Bänder sichtbar gemustert, Kontrast nicht messbar (Vermutung: ausreichend, Bild `b2-zonen-3d-*.png`). `b2-zonen-2d-*.png`, `b2-legende-*.png` |
| **B1** doppelte Landmark Decke | **bestanden** | axe ohne `landmark-unique` in allen Zuständen (siehe axe) |
| axe alle 9 Modi, 1440/390 | **bestanden** | Tags wcag2a/2aa/21a/21aa/22aa + best-practice, alle `<details>` offen: 9 Modi in 3D bzw. Editor plus 2D-Variante für 7 Modi = 16 Zustände je Breite, **0 Verstöße**. Incomplete nur `color-contrast` (Canvas) und `label-content-name-mismatch` (Zoomknöpfe, bekannt B5) |
| **Q2** Pipette Fliesen/Wände | **bestanden** | Paket Hotelbad auf Wohnung, Modus Fliesen „Wände", ganzer Raum Bad → `Marmoroptik, Kreuzfuge, 120 × 120 cm, #E6E3DD, Fuge 3 mm, raumhoch` = Ergebnis auf Wandseite 1; „Boden" → `… Halbverband …, #B8B0A3 …` (Bodenfliese). Modus Wände, Raum Wohnzimmer → `Wandfarbe matt, Kalkweiß`. 1440 und 390 |
| **Q3** beschreibeRef mit Richtung | **bestanden** | Boden Parkett, Richtung 90° → Meldung `…, Eiche hell, Verlegerichtung 90°.`, Pipette liest `… Verlegerichtung 90°` zurück; 0° ohne Zusatz. Unit-Tests `tests/unit/materials/fixes-phase5.test.ts:12-22` grün |
| **B3** Tageszeit-Regler-Höhe | **bestanden** | `#gestalt-tageszeit` 295 × 44 (1440) und 366 × 44 px (390). Bedienbar in der ganzen Box: Treffer bei y+3, y+22, y+41 ändern den Wert (390 per Touch-Tap, 1440 per Maus). `b3-regler-*.png`. Raum-Knöpfe (planner-geometry) wie angekündigt unverändert |
| **B4** Schwelle „leicht" plausibel | **bestanden** | `src/islands/planner/leistung.ts:19-25`: leicht bei ohne WebGL/Software-Renderer, ≤ 40rem oder nur Touch, `deviceMemory` ≤ 4, ≤ 2 Kerne. Im Browser (Messskript-Spoof, Code unverändert): 4 Kerne + 8 GB + Hardware-Renderer → Antialias an (voll); 4 GB → aus; 2 Kerne → aus; SwiftShader mit 8 Kernen → aus. Bündel `index.astro_…uKsB2VO2.js` enthält die neue Logik. Plausibel; echte Hardware nicht geprüft |
| **H1** Fenster-Meldung im Modus Elektro | **bestanden** | 3D, Steckdose gewählt, Rasterklicks: „Hier ist ein Fenster. Bitte daneben auf die Wandfläche tippen, um dort einen Punkt zu setzen." (1440 Maus, 390 Touch), ebenso „Hier ist eine Tür …" und „Das ist die Wandkante …". `h1-fenster-elektro-*.png` |
| **H2** Maß-/Raumlabels in 3D | **bestanden** (Rest siehe N1) | Überdeckung Länge/Raum: 0 in Orbit und Draufsicht, 1440 und 390. Ausgeblendet: 3 bzw. 1 (1440), 10 bzw. 3 von 17 (390). `h2-masse-*.png` |
| **Q4** KTX2-Kommentar | **bestanden** | `src/lib/materials/katalog.ts:11-14` nennt jetzt `<datei>-<px>.webp` und den CSP-Grund |

## 3. Neue bzw. verbleibende Hinweise (keine Abnahmehindernisse)

- **N1 (kosmetisch, belegt): Labels überdecken sich bei 390 px untereinander.** Orbit: „Flur · 2,8 m²" verdeckt den Anfang von „Wohnzimmer · 24,5 m²", und 2 Längenlabels überlappen sich („2,40 m" unter „2,20 m"). `entflechteLabels` prüft nur Länge gegen Raum (`src/islands/planner/szene/Ansicht3D.tsx:310-327`). Bei 1440 keine Überdeckung. Bild `h2-masse-orbit-390.png`. Verantwortlich: **planner-design**.
- **N2 (Hinweis, belegt): Pipette auf Bodenfliese im Modus Fliesen meldet „halbhoch".** `nimmPipette` normalisiert den Bodenwert als Kategorie `fliesen` und ergänzt damit den Standard `fliesenhoehe: 'halbhoch'` (`src/islands/planner/gestalten/aktionen.ts:179`, `src/lib/materials/katalog.ts:445`). Nur Meldungstext, die Bodenfliese hat keine Höhe. Verantwortlich: **planner-design**.
- **N3 (Hinweis, belegt):** Gleiche Kern-Schwelle wie im alten B4 noch im Hero: `src/islands/hero/steuerung.ts:71` (`hardwareConcurrency ≤ 4` → klein). Nicht Teil dieser Nachprüfung; Entscheidung **motion-3d**.
- Offen laut Fix-Bericht: `#8c5c00` ist kein Token (**design-system**).

## 4. Fazit

Alle nachgeprüften Punkte Q1, Q2, Q3, Q4, B1, B2, B3, B4, H1 und H2 sind **behoben**. Keine Regressionen (486/486 Unit, Typen 0 Fehler, Planer-E2E 30/30, 0 Konsolen-, CSP- und Fremd-Fehler). Nicht prüfbar bleiben die Lesbarkeit der 3D-Bänder und die Leistungsstufe auf echter GPU-Hardware.
