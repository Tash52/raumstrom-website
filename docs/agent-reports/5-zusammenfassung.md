# Phase 5 · Zusammenfassung

Stand 21.11.2026, `main` @ a84e80b (plus dieser Abschluss-Commit). Ergebnis: **bestanden** (Nachprüfung `5-qa-nachpruefung.md`), drei kleine Hinweise gehen in Phase 6.

## Gebaut
- **planner-geometry, Vorab-Auftrag** (`5-planner-geometry.md`):
  - Gewählter Raum im 2D-Plan selbst gekennzeichnet (Kabelgrün, 6,7:1). Die Kurzanleitung steht bei 390 px über der Zeichenfläche statt auf Zoom/Status.
  - **Projektmodell v2** mit Migration von v1: Raumgestaltung (Wand, Boden, Decke, Fliesen, Sockelleiste), Wandseiten-Overrides, Gestaltung je Öffnung, `elektro[]` (Wand/Decke/Boden), `einrichtung[]`. Kataloge kennt die Geometrie nicht, nur IDs.
  - Helfer in `src/lib/geometry/ausstattung.ts`. Picking liefert Wandseite und Raum, Decken je Raum.
- **trend-researcher** (`5-trend-researcher.md`): 8 Stilpakete 2026/27 unter `src/content/trends/` (Japandi, Modern Warm Minimal, Skandinavisch hell, Industrial Loft, Landhaus modern, Dark & Moody, Hotelbad, Mid-Century), feste Begriffe für den Planer, neue `docs/TREND-UPDATE.md`.
- **planner-design** (`5-planner-design.md`, Abschnitt „Fixes"):
  - Werkzeugleiste mit 9 Modi (Tasten 1–9), Kacheln mit Vorschau, Anwenden auf Fläche, Raum oder Wohnung, Pipette, Rückgängig/Wiederholen.
  - Kataloge `src/lib/materials/` (Materialien, prozedurale Muster, Farben ohne geschützte Namen, Möbel, Stilpaket-Mapping) und `src/lib/electro/` (31 Typen, editierbare Höhen, Installationszonen nach DIN 18015-3 in 2D und 3D, Stückliste je Raum für das PDF in Phase 6).
  - 3D: Sockelleisten, Zargen, Fensterbänke, Low-Poly-Möbel („nur zur Visualisierung"), Tageszeit, Wände ausblenden, Maße, Rundgang (WASD, Touch-Joystick), Screenshot. Reduzierte Qualität auf schwachen Geräten (`src/islands/planner/leistung.ts`).
  - **Texturen als WebP statt KTX2:** Der Basis-Transcoder verlangt `'unsafe-eval'`, das blockiert die CSP. 4 CC0-Texturen von Poly Haven, Herkunft in `public/textures/QUELLEN.md`, je Kategorie nachgeladen. Keine neuen Abhängigkeiten.
- **architect:** `CLAUDE.md` auf Modell v2, materials/electro und Texturen.

## Abnahmen
- **a11y-perf-tester** (`5-a11y-perf-tester.md`): axe 0 Verstöße in allen Modi, Tastatur vollständig, Reduced-Motion und No-WebGL ok, 0 Fremd-Requests. Lighthouse Mobil `/raumplaner/` Perf 97 (LCP 2359 ms), Start 99 (LCP 2029 ms). Chunks br: start 63,7 KiB, Ansicht3D 39,4 KiB, R3F 193,1 KiB, nur auf `/raumplaner/`.
- **qa-verifier** (`5-qa-verifier.md`): DoD erfüllt, alle 9 Modi und alle 8 Pakete im Browser bedient, Stückliste stimmt, v1-Migration ok. E2E 223 grün, rot nur die 4 bekannten Mail-Tests ohne SMTP.
- **Fixes** (planner-design): Kontrast Warntext und Zonen-Overlay (≥ 5:1, Muster gestrichelt/schraffiert), Pipette bei Wandfliesen, Verlegerichtung in `beschreibeRef`, doppelte Landmark, Tageszeit-Regler 44 px, neue Schwelle für reduzierte Qualität, klarere Meldungen.
- **Nachprüfung** (`5-qa-nachpruefung.md`): alles behoben, keine Regressionen (486 Unit-Tests, Planer-E2E 30/30).

## Offen (in die Übergabe übernommen)
- N1: Maßlabels überdecken sich bei 390 px untereinander (planner-design). N2: Pipette meldet bei Bodenfliesen „halbhoch" (planner-design). N3: Hero nutzt noch die alte Kern-Schwelle ≤ 4 (motion-3d).
- Farbe `#8c5c00` (senkrechte Zonen) ist kein Token (design-system übernehmen oder vorgeben).
- Raum-Knöpfe in der Seitenleiste unter 44 px (planner-geometry, niedrig). `Editor2D.tsx` hat die optionale Prop `erweiterung` bekommen (planner-geometry gegenlesen).
- Elektro-Vorschlag eines Stilpakets setzt keine Punkte automatisch; Möbel lassen sich in 3D nicht ziehen; keine Deckenzonen.
- 60 fps auf echter GPU nicht gemessen (Betreiber).
- Sicherungs-Branch `wip/phase5-planner-design` kann gelöscht werden (Inhalt in `main`).
