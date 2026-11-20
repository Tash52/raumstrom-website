# Phase 4 · a11y-perf-tester (main @ c586b90)

Umgebung: `dist/` (frischer `build:staging`) per `cp -a` kopiert, `server/server.mjs` auf 127.0.0.1:4601 mit Wegwerf-Env. Lighthouse 12.8.2 Mobil (Standard-Drosselung, Chromium 1243, headless, ohne GPU), je 5 Läufe, Median. axe-core mit Tags wcag2a/2aa/21a/21aa/22aa plus best-practice. Playwright 1243 (Desktop 1280x800, Pixel 7 Touch). Skripte unter `/tmp/.../scratchpad` (lh.sh, sum.mjs, pl.mjs, graph2.mjs).

## 1. LCP-Kleinauftrag (Lighthouse Mobil, 5 Läufe)

| Seite | LCP je Lauf (ms) | Median | Perf je Lauf | A11y/BP/SEO | TBT med | CLS max | GSAP | Schriften vor LCP | Fremd-Req |
|---|---|---|---|---|---|---|---|---|---|
| `/kontakt/` | 1742 / 1502 / 1735 / 1700 / 1746 | **1735 ms (Ziel < 2000 erreicht)** | 100 x5 | 100/100/100 | 12 | 0 | nein (kein Request) | 1 (Archivo Latin) | 0 |
| `/` | 2270 / 2224 / 2027 / 2025 / 1503 | **2027 ms** (Streuung groß) | 98-100 | 100/100/100 | 34 | 0 | ja, sofort (Journey) | 3 | 0 |
| `/leistungen/wallbox/` | 1653 / 1652 / 1658 / 1653 / 1652 | 1653 ms | 100 x5 | 100/100/100 | 0 | 0 | nein | 3 (Trace-Zählung) | 0 |

- `/kontakt/`: Ziel erreicht, alle 5 Läufe < 2,0 s. GSAP lädt nicht mehr (motion-3d-Änderung wirkt, belegt). Nur 1 Schrift vor dem LCP (design-system-Änderung wirkt, belegt). Das ALTCHA-Widget (`altcha-widget.By9yfRhl.js`, 89 KB roh) wird weiter in jedem Lauf angefordert. Der Befund für backend-api (Widget erst bei Fokus laden) ist daher kein Muss mehr, nur Optimierung (niedrig, belegt: Request vorhanden, LCP-Anteil nicht isoliert gemessen).
- `/`: Median 2027 ms, knapp über 2,0 s (kein Prüfziel dieses Auftrags). GSAP und 3 Schriften laufen vor dem LCP, wie in `4-motion-3d-lcp.md` und `4-design-system-lcp.md` beschrieben. Zuständig falls gewünscht: motion-3d (GSAP per Observer an `[data-journey]`), page-builder (`content-visibility` unterhalb des Falzes). Belegt (Messwert), Ursachenanteil Vermutung.
- CLS 0 auf allen drei Seiten.

## 2. Planer-Chunk und JS-Budget

- Kein Seiten-HTML außer `/raumplaner/` verweist auf einen Planer-, three-, pdf- oder heic-Chunk (30 HTML-Dateien geprüft, belegt). Der Chunk hängt nur am Seitenskript `index.astro_astro_type_script_index_0_lang.DmptA4ag.js`, das nur `/raumplaner/` einbindet.
- Übertragenes JS (Lighthouse, gz/br wie ausgeliefert): `/kontakt/` 41,9 KB, `/` 52,9 KB, `/leistungen/wallbox/` 9,5 KB. Alle < 150 KB. Gemeinsames `Motion`-Bündel unverändert 10,7 KB roh / 4,2 KB gz (+ umgebung, preload-helper = 15,4 KB roh / 6,5 KB gz).
- Größe Planer-Chunk (Datei roh / gz / br):
  - Sofort beim Aufruf von `/raumplaner/` (Entry, `start.BoySIV3m.js` 152,1 KB / 45,4 / 40,6, `client.CY6QLjXo.js` React 219,0 KB / 67,4 / 58,1, kleine Helfer): **378,7 KB roh / 116,7 KB gz / 102,3 KB br**. Dazu Motion 6,5 KB gz und GSAP (siehe Befund 3).
  - Erst bei Wechsel in 3D (lazy): `Ansicht3D.GqZo8UdL.js` 126,9 KB / 36,4 gz plus `react-three-fiber.esm.B4WfL95k.js` 918,3 KB / 239,8 gz = 1045 KB roh / 276 KB gz.
  - Erst beim Upload: `pdf.YwugTw7Y.js` 444,2 KB roh, `heic-to._Lb7lx0w.js` 3,22 MB roh, `verarbeiten.DgLuqYpX.js` 3,5 KB.
  - Gesamt aller von `/raumplaner/` erreichbaren Chunks ohne pdf/heic: 1427 KB roh / 395 KB gz.
- `/raumplaner/` Lighthouse-Transfer beim Laden (ohne 3D): 154,3 KB JS (inkl. GSAP 41,6 KB), 254 KB gesamt.

## 3. `/raumplaner/`

Lighthouse Mobil (5 Läufe): Perf 95 / 90 / 96 / 94 / 95 (Median 95, Ziel >= 70), A11y 100 (Ziel >= 95), BP 100, SEO 100. LCP Median 2537 ms (`p.planer-klein`, Render-Delay 226 ms, TTFB 10 ms), TBT 160 ms, CLS 0. Fremd-Requests 0.

axe (WCAG 2.2 AA, Desktop und Pixel 7, Zustände Start, Editor mit Kurzanleitung, Editor mit Auswahl, 3D, No-WebGL-3D): **0 Verstöße gegen WCAG-Tags**. 1 Verstoß aus der Best-Practice-Gruppe in jedem Zustand nach dem Start (`heading-order`, moderat), siehe B1. `color-contrast` ist in axe in allen Zuständen "incomplete" (nicht automatisch entscheidbar, Vermutung: Hintergrund Canvas/Verlauf), manuelle Kontrastprüfung offen.

| Prüfpunkt | Ergebnis |
|---|---|
| Tastatur Start | Tab durchläuft Upload, Vorlagen, "Ohne Grundriss starten", Footer, endet außerhalb der Seite. Keine Falle. Vorlage per Enter startbar. |
| Fokus sichtbar | Alle Tab-Stopps (Start 30, Editor 24, 3D) mit Outline oder Box-Shadow, keiner ohne Indikator. |
| Kurzanleitung | Fokus landet im Dialog (Verstanden, `autoFocus`), Enter schließt. |
| Editor | `role=application` (`Editor2D.tsx:600-603`): Tab verlässt ihn nach 3 Tab-Schritten zum nächsten Feld, keine Falle. Wand per Tastatur (W, Pfeil, Enter, Ziffern, Enter): 10 -> 11 Wände. |
| 3D | Canvas wird erzeugt (`data-planer-3d=bereit`, in Chromium via Software-GL), Bedienknöpfe fokussierbar mit Indikator. Rendering-Leistung nicht messbar (keine GPU). |
| Reduced Motion | 0 laufende Animationen/Transitions im Planer (Start, Editor, 3D), 0 GSAP-Requests. |
| No-WebGL (`--disable-3d-apis`, `getContext` webgl/webgl2 = null) | `data-planer-webgl=nein`, 2D-Editor voll nutzbar (Vorlage, Tabs per Tastatur), 3D-Tab zeigt "nicht verfügbar" mit Link `/kontakt/`, kein Canvas, keine Skriptfehler. |
| Touch-Ziele (Pixel 7) | Tabs, Werkzeuge, Zoomknöpfe, Raum-Knöpfe >= 36 px. Unter 44 px: Wandliste `.planer-link` 171-183 x 21 px, Summary "Wände" 362 x 21 px, Labels "Art" und "Wandstärke" 21 px, Schalter 36 px (Checkbox 18 px, Label 36 px). Siehe B2. |
| Fremd-Requests / Konsole | 0 / 0 Fehler (Desktop, Reduced, No-WebGL, Mobil). Kein horizontaler Overflow bei 412 px. |

## Befunde

- **B1 (niedrig, belegt): Überschriftenebenen springen.** Auf `/raumplaner/` folgt auf `<h1>` direkt `<h3>` (Planer-Inseln), die Seite hat danach `h2#hinweis-titel`. axe `heading-order` (best-practice, nicht WCAG-AA-relevant). Stellen: `src/islands/planner/Planer.tsx:79,168`, `Seitenleiste.tsx:329`, `Startbildschirm.tsx:109,189,205`. Fix: Planer-Überschriften auf `h2` oder einen sichtbaren/versteckten `h2` vor dem Planer. Zuständig: planner-geometry (Inseln), ggf. page-builder (`src/pages/raumplaner/index.astro`). Auf dem Startbildschirm meldet axe es nicht, da dort kein Sprung entsteht, sobald die Seite "Einleitung h2" hat.
- **B2 (niedrig, Vermutung zu WCAG 2.5.8): kleine Touch-Ziele in der Wandliste.** `.planer-link` (`src/islands/planner/planer.css:97`) und `summary` in der Wandliste sind 21 px hoch (< 24 px, Empfehlung 44 px). axe `target-size` meldet keinen Verstoß (Abstandsausnahme wahrscheinlich), auf Touch trotzdem eng. Fix: `min-height: 44px` bzw. `padding-block` auf Touch (`@media (pointer: coarse)`). Zuständig: planner-geometry.
- **B3 (niedrig, belegt): GSAP lädt auf `/raumplaner/`.** `scroll.C_V-jUN0.js` (41,6 KB) wird dort in allen 5 Läufen geladen (Seite enthält `data-leitung`/`data-prozess`, 1 Treffer in `dist/client/raumplaner/index.html`). Kein Nutzen im Planer, kostet TBT/Transfer (Planer-JS 154 KB statt ca. 113 KB). Fix: Leitung auf dieser Seite weglassen oder wie `/kontakt/` in `src/lib/motion/index.ts` (Regex `^\/kontakt`) ausnehmen. Zuständig: motion-3d bzw. page-builder (`src/pages/raumplaner/index.astro`).
- **B4 (niedrig, offen): Kontrast nicht automatisch belegt.** axe `color-contrast` incomplete auf allen Planer-Zuständen. Manuelle Prüfung der Plan-/Canvas-Beschriftungen, Statusmeldungen und der Overlay-Texte steht aus. Zuständig: planner-geometry / design-system.
- **B5 (Hinweis, belegt): Startseite LCP-Median 2027 ms** knapp über 2,0 s, Streuung 1503-2270 ms. Siehe Abschnitt 1.
- **B6 (Hinweis, belegt): `/kontakt/` lädt `altcha-widget` weiter sofort.** Kein Blocker (LCP 1735 ms), Optimierung: bei Fokus/Sichtbarkeit nachladen. Zuständig: backend-api.
- Hinweis `server/static.mjs` (architect, aus `4-design-system-lcp.md`): bei `cp -a` bleiben die `.br`/`.gz` gültig, Messung daher mit komprimierten Bytes.

## Nicht geprüft
- WebGL-Leistung (keine GPU), Screenreader (NVDA/VoiceOver), echte Touch-Geräte, Kontrast der Canvas-Inhalte, Upload-Pfad (PDF/HEIC) auf A11y.
