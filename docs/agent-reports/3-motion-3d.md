# Phase 3 · motion-3d

Stand: 19.11.2026, Branch `worktree-agent-a29dd4c4f7474410c`.

## Umgesetzt

| Element | Dateien | Ohne 3D / ohne Bewegung |
|---|---|---|
| 3D-Hero „Hinter der Wand“ (R3F, Wand öffnet sich beim Scrollen: Farbe → Putz → Mauerwerk mit Schlitz → Leitung → Dose, Legende 01–05, leichte Zeiger-Parallaxe) | `src/islands/hero/*`, `src/components/sections/HeroVisual.astro` | Poster als AVIF/WebP (Standbild genau dieses Startzustands, `fetchpriority=high`, feste 4:3-Fläche). Bei `prefers-reduced-motion` über `<source media>` die vollständig geöffnete Wand, ganz ohne JS |
| Säulen-Journey (Desktop ≥ 64em: gepinnt, horizontal, Fortschritts-Leitung mit 3 Knoten; 3D-Objekte Raum = Logo als Grundriss, Wallbox, Prüfgerät + Prüfprotokoll) | `src/islands/journey/*`, `SaeulenJourney.astro` | Statische Liste mit drei Karten und Standbild je Säule (Mobil, Reduced Motion, ohne JS). Ohne WebGL bleibt die gepinnte Variante mit Standbildern |
| 3-Zustands-Slider Vorher / Hinter der Wand / Nachher | `WandSlider.astro`, `src/lib/motion/slider.ts` | Native Radio-Gruppe (Pfeiltasten), CSS `:has()`, funktioniert ohne JS; JS ergänzt Ziehen im Bild mit Einrasten |
| Leitungs-Linie durch die Seite (`[data-leitung]` je Sektion zeichnet sich per ScrollTrigger, Knoten schalten ein) | `src/lib/motion/scroll.ts`, `motion.css` | Linie vollständig gezeichnet (statisches Markup) |
| Prozess-Leitung (Ablauf auf Leistungsseiten, Strom läuft Schritt für Schritt) | `AblaufListe.astro` (Motion-Teil), `scroll.ts` | Vollständige Linie |
| Tilt-Karten mit Tiefe, magnetische Buttons, Cursor-Ring | `src/lib/motion/zeiger.ts`, `motion.css` | Nur `(hover: hover) and (pointer: fine)`, nie Touch, nie Reduced Motion / Forced Colors. Der System-Cursor bleibt sichtbar (Ring folgt ihm), damit vergrößerte OS-Cursor nicht verloren gehen |
| Seitenübergänge: native Cross-Document View Transitions, neue Seite wischt von links herein, Strom-Leitung läuft an der Kante mit | `motion.css` (`::view-transition-group(vt-leitung)`), Element in `Motion.astro` | Reine CSS-Lösung, kein ClientRouter, kein render-blockierendes Skript; bei Reduced Motion aus (base.css) |
| Pause-Schalter „Animation anhalten“ (WCAG 2.2.2), global, in localStorage gemerkt | `src/lib/motion/pause.ts`, `PauseKnopf.astro` | Erscheint erst, wenn eine Schleife läuft (Platz reserviert, kein CLS) |

Integration: `BaseLayout.astro` bindet `components/sections/Motion.astro` ein (eine Zeile, Motion-Skript + globale Motion-CSS). `src/pages/index.astro`: Hero nutzt `HeroVisual` statt `WandSchnitt`, Slider im Abschnitt „einstieg“, Journey im Abschnitt „saeulen“ (Inhalte weiter aus `pages/start.md` und der Leistungen-Collection), Hero-Raster `align-items: start` (CLS).

## Fallback-Logik (`src/lib/motion/umgebung.ts`)
- `darf3D()`: Reduced Motion (Media Query oder `html[data-motion=reduce]`) → Poster; < 4 Kerne, `deviceMemory` < 4, Datensparmodus, früherer FPS-Abbruch in der Sitzung → Poster; kein WebGL 2 oder nur mit „major performance caveat“ (Software-Rendering) → Poster.
- FPS-Messung nach Start (`fps.ts`): unter 40 fps wird die Auflösung auf DPR 1 gesenkt, danach unter 24 fps Abbruch, Poster bleibt, Merker in `sessionStorage`.
- Laden: 3D-Chunk (three + R3F + React) nur per `import()` nach `load` + `requestIdleCallback`, wenn der Bereich sichtbar ist (Journey: 60 % Vorlauf). Render-Schleife `frameloop="demand"`: Frames nur, solange sich etwas bewegt und die Szene sichtbar ist; Pause stoppt sie.
- Zustand als Attribut für Tests: `data-hero-zustand` / `data-journey-zustand` (+ `-grund`).
- Testschalter `?3d=erzwingen` (überspringt nur die Schwach-Geräte-Heuristik, nicht Reduced Motion) und `?poster=…` (Poster-Werkzeug). Harmlos in Produktion.

## Budgets (gemessen, Playwright, 4× CPU-Drosselung, 1,6 Mbit/s, 150 ms Latenz, SwiftShader ohne GPU)
| | LCP | CLS | Interaktion (Event-Timing, Klick/Tasten) |
|---|---|---|---|
| Desktop mit 3D | 0,91 s | 0,018 | 40 ms |
| Mobil (Pixel 7) mit 3D | 0,95 s | 0 | 32 ms |
| Mobil ohne 3D | 0,91 s | 0 | 56 ms |

Restlicher CLS 0,018 auf Desktop stammt vom Schriftwechsel Arial → Archivo im Hero-Text (design-system, war vorher größer: 0,035 durch zentrierte Ausrichtung, jetzt behoben). Längste Long Task beim 3D-Start ≈ 300 ms (Parsen/Shader auf Software-Rendering, 4× gedrosselt), nach dem Laden im Leerlauf. Echte Mittelklasse-Hardware mit GPU konnte ich hier nicht messen.

JS (gzip): Seiten-Bundle Motion 4,5 kB + GSAP/ScrollTrigger 44,5 kB (nur ohne Reduced Motion). 3D-Chunk three + R3F 240 kB + react-dom 68 kB, nur auf der Startseite und nur bei erlaubtem 3D. Leistungsseiten laden keinen 3D-Chunk (E2E geprüft).

## Abhängigkeiten (exakt gepinnt)
`three@0.187.0`, `@react-three/fiber@9.8.2` (MIT), `gsap@3.15.1` (freigegebene Ausnahme), dev `@types/three@0.187.0`. Kein drei (`@react-three/drei`): keine HDRs, Schriften, Decoder oder Modelle nötig, alles prozedural. `THIRD-PARTY-LICENSES.md` neu erzeugt, `npm run licenses -- --check` grün.

## Poster-Standbilder
PNG-Quellen in `src/islands/hero/poster/` und `src/islands/journey/poster/`, Astro erzeugt AVIF/WebP. Neu rendern nach Szenenänderungen: Server auf dem Build starten, dann `node src/islands/hero/poster/erzeugen.mjs http://127.0.0.1:<port>` (Playwright, SwiftShader). Unit-Test prüft Format/Größe.

## Geprüft
- `npm test` grün (Vitest 294 inkl. neuer `tests/unit/motion-3d.test.ts`: Wandmodell, FPS-Urteile, keine Fremd-URLs/Daten-URIs/eval/`setAttribute('style')` im Motion-Code, Poster vorhanden; Hook-Test 7/7).
- `npm run check` 0 Fehler, `npm run build:staging` ok, Wording-Scan ok (Bezeichner „Kamera…“ in Code umbenannt in „Ansicht…“).
- E2E `E2E_MAILPIT=extern` ohne Mail-Tests (`--grep-invert Mailpit`, Mailpit-API-Stub auf 8025, da Docker fehlt): 169 bestanden, 5 übersprungen. Neue `tests/e2e/motion-3d.spec.ts` (chromium + mobile): Reduced Motion (Poster „komplett“, kein Canvas, Linien statisch), ohne WebGL, schwaches Gerät, 3D lädt + 0 Fremd-Requests + keine CSP-Verstöße + Pause gespeichert, Leistungsseite ohne 3D-Chunk, Slider per Tastatur und ohne JS, Journey gepinnt/3D erst nahe Sichtweite/Fokus holt Panel, Mobil statisch, Prozess-Knoten. Ein erster Gesamtlauf hatte einmalig viele 40-ms-Fehlschläge (Testserver nicht erreichbar), zwei Wiederholungen danach komplett grün, Motion-Spec 2× wiederholt grün.
- Screenshots angesehen: `docs/agent-reports/screenshots/3-motion-3d/` (Desktop 01–12, Mobil 01–05), dazu Seitenübergang mit verlangsamter Animation.

## Offen / Hinweise
1. Briefing nennt den Prozess „So läuft’s ab“ in 4 Schritten auf der Startseite. Dafür gibt es in `pages/start.md` keinen Abschnitt; animiert ist der Ablauf der Leistungsseiten (`AblaufListe`). Abschnitt `ablauf` in `pages/start.md` bräuchte content-writer + page-builder (Komponente ist fertig).
2. Slider-Bildunterschriften und Alt-Texte stehen in `WandSlider.astro`/`SaeulenJourney.astro` (UI-Texte). Falls sie über Keystatic pflegbar sein sollen: Felder im Schema (architect).
3. `WandSchnitt.astro` (design-system) wird nicht mehr verwendet; löschen oder für den Styleguide behalten.
4. Der Nutzer-Schalter „Animation anhalten“ wirkt auf Schleifen, nicht auf Seitenübergänge (dafür wäre ein render-blockierendes Skript nötig); System-Einstellung Reduced Motion schaltet sie ab.
5. R3F 9.8 erzeugt intern `THREE.Clock` → eine Deprecation-Warnung in der Konsole (bekannt, nicht von uns).
6. Lenis (Smooth Scroll) bewusst nicht eingebaut: native Scroll-Physik, bessere Barrierefreiheit, weniger JS.
7. 60-fps-Ziel auf echter GPU nicht messbar (Container ohne GPU); a11y-perf-tester sollte auf echtem Gerät nachmessen.
