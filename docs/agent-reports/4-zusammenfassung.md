# Phase 4 · Zusammenfassung

Stand 20.11.2026, `main` @ 22ef5e7 (plus dieser Abschluss-Commit). Ergebnis: **bestanden** (Nachprüfung `4-qa-nachpruefung.md`), zwei niedrige Hinweise gehen in Phase 5.

## Gebaut
- **Kleinauftrag LCP `/kontakt/`:**
  - motion-3d (`4-motion-3d-lcp.md`): GSAP lädt erst, wenn eine Leitung bzw. ein Prozess in Sichtweite kommt, nie auf `/kontakt/…`, `/raumplaner/` und `/planer/…`. Nebenfix: Knoten gingen am Seitenende wieder aus.
  - design-system (`4-design-system-lcp.md`): ein einziger Font-Preload (Archivo Latin), U+2010 aus dem Plex-Pi-Bereich, `content-visibility: auto` im Footer. `font-display: swap` bleibt.
  - Ergebnis (a11y-perf-tester, Lighthouse Mobil, Median aus 5 Läufen): `/kontakt/` 1735 ms (vorher 2101), Wallbox 1653 ms, Startseite 2027 ms, CLS überall 0.
- **planner-geometry** (`4-planner-geometry.md`, Fixes `4-planner-geometry-fixes.md`): Raumplaner Teil 1 auf `/raumplaner/`:
  - Upload: Bild, PDF über selbst gehosteten pdf.js-Worker, HEIC; max. 20 MB, Metadaten entfernt durch Neu-Kodierung.
  - Zeichnen und Erkennen: Maßstab kalibrieren, Wand-Editor Modus A mit Snapping 90°/45°, Raumerkennung mit lichter Fläche, Türen/Fenster.
  - Ansicht und Bedienung: 3D-Ansicht mit CSG-Öffnungen, 4 Vorlagen, Rückgängig/Wiederholen. Bedienung per Maus, Touch und Tastatur.
  - Fallbacks: noscript und No-WebGL mit Verweis aufs Kontaktformular.
  - Geometrie rein in `src/lib/geometry/` mit Unit-Tests.
  - Neue Abhängigkeiten: pdfjs-dist, zustand, three-bvh-csg, three-mesh-bvh (heic-to war freigegeben). pdf.js-Schriften (GPL) bewusst weggelassen.
- **architect** (`4-architect.md`):
  - Projektmodell des Planers als Vertrag in `CLAUDE.md`.
  - `server/static.mjs` liefert .br/.gz ohne Zeitstempel-Vergleich.
  - `'wasm-unsafe-eval'` nur für `/pdfjs/pdf.worker.min.mjs`.
  - zod global `jitless`, `public/` aus tsconfig ausgeschlossen.
- **content-writer** (`4-content-writer.md`): Texte zu `/raumplaner/` und Start versprechen nur noch, was der Planer heute kann.

## Abnahmen
- **a11y-perf-tester** (`4-a11y-perf-tester.md`):
  - LCP-Ziel erreicht.
  - Planer-Chunk nur auf `/raumplaner/` (378 KB roh, 102 KB br; three und pdf/heic erst bei Bedarf).
  - `/raumplaner/` Lighthouse Perf 95 / A11y 100, axe 0 WCAG-Verstöße, Tastatur vollständig.
- **qa-verifier** (`4-qa-verifier.md`): DoD erfüllt, ein flakiger Tastatur-Test (B1).
- **Fixes:**
  - B1, Ursache belegt: Nach „Verstanden" scrollte die Seite, der Tastatur-Zeiger wurde durch `pointerleave` gelöscht. Behoben mit Refs, Fokus mit `preventScroll` und Regressionstest.
  - Fokus, Überschriftenfolge, Tippziele, Kontraste, Deprecations.
  - GSAP auf `/raumplaner/`.
  - Texte.
- **Nachprüfung** (`4-qa-nachpruefung.md`):
  - Alles bestanden: `raumplaner.spec.ts` 200/200 bei `--repeat-each=10`, Gesamtsuite 213 bestanden. Rot sind nur die 4 Mail-Tests ohne SMTP; sie laufen in der CI.
  - Unit-Tests 404/404, `check` 0 Hinweise, 0 Konsolenfehler, 0 CSP-Verstöße, 0 Fremd-Requests.

## Offen
- **Raumfüllung des gewählten Raums** hat nur 1,09:1 Kontrast, die Kennzeichnung steht nur im Seitenpanel. Kennzeichnung im Plan selbst nötig (`src/islands/planner/planer.css:484`, Phase 5).
- **H1:** Bei 390 px verdeckt die Kurzanleitung ca. 8,5 px des Zoomknopfs „Vergrößern" (`Planer.tsx:167`, `planer.css:669`, Phase 5).
- **Ecken:** Nicht rechtwinklige Wandecken in 3D nur überlappt, ohne Gehrung (planner-geometry, bei Bedarf).
- **Startseite LCP** 2027 ms, knapp über 2,0 s: GSAP und 3 Schriften laufen vor dem LCP (motion-3d: Journey später laden; page-builder: Mono-Labels).
- **ALTCHA-Widget** auf `/kontakt/` lädt weiter sofort (89 KB roh). Optional, das Ziel ist erreicht (backend-api).
- **Nicht prüfbar hier:** WASM-Decoder für JPX/JBIG2 im PDF-Worker (kein Test-PDF), 60 fps auf echter Hardware, Mail-E2E (nur CI).
- **Branch:** Der Remote-Branch `wip/phase4-planner` (Sicherung, Inhalt ist in `main`) ließ sich aus dem Container nicht löschen und kann auf GitHub entfernt werden.
