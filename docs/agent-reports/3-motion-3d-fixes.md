# motion-3d, Fixes aus der Phase-3-Abnahme (Bericht 3-a11y-perf-tester.md, main @ ac24e78)

## 1. Software-Renderer → Standbild (Befund 1)
- `src/lib/motion/umgebung.ts`: `pruefeWebGL()` liest den Renderer über `WEBGL_debug_renderer_info` (`UNMASKED_RENDERER_WEBGL`) und zusätzlich `gl.RENDERER` (Fallback ohne Extension, z. B. Firefox). `istSoftwareRenderer()` erkennt SwiftShader, llvmpipe, softpipe, lavapipe, „Software", Microsoft Basic Render Driver. `darf3D()` liefert dann `software-renderer` (Hero/Journey bleiben beim Poster). `?3d=erzwingen` umgeht das weiterhin (E2E läuft auf SwiftShader).
- Beleg: Headless-Chromium meldet `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) …))` → `data-hero-grund="software-renderer"`, 0 Long Tasks.
- Lighthouse 12 Mobile, Startseite (gleiches Setup wie Abnahme, lokal): **Perf 99 (vorher 70), TBT 0 ms (vorher 2710), CLS 0**, A11y 100. LCP 2,1 s bleibt (render-blockierendes CSS, Befund 4, nicht motion-3d).

## 2. Startzeitpunkt und Long Task beim 3D-Start (Befund 2)
- Hero startet erst bei erster Interaktion (pointerdown/keydown/wheel/touchstart/scroll) oder 2 s nach `load`, jeweils danach im Idle (`nachInteraktionOderSpaeter`, `umgebung.ts`). Die Arbeit läuft nie im Handler der Interaktion selbst (kein INP-Anteil).
- Start in Teilen: Chunk laden → `abgeben()` (scheduler.yield/setTimeout) → Geometrie schrittweise (`baueHeroGeometrie`, `HeroSzene.tsx`, ein Teil pro Task) → React-Mount als Transition (`start.tsx`) → Canvas startet mit `frameloop="never"`, `Vorwaermen` (`takt.tsx`) kompiliert Shader Mesh für Mesh per `compileAsync` (KHR_parallel_shader_compile) mit Yields dazwischen, schaltet dann auf `demand`. Journey nutzt `Vorwaermen` und `abgeben` ebenso.
- Messung (Playwright, `?3d=erzwingen`, Trace): ungedrosselt kein JS-Task > 50 ms mehr (vorher 175-208 ms). Verbleibend ein `Commit` von ~175 ms im ersten Frame = Warten auf SwiftShader-GPU-Prozess (Software-Raster, auf echter GPU nicht vorhanden; in der Praxis greift dort ohnehin Punkt 1). 4x gedrosselt: größter JS-Task 124 ms (vorher 183 + 197 ms Frame).

## 3. Pause stoppt die Render-Schleife (belegt)
- Code: `Takt` (`takt.tsx`) fordert bei `frameloop="demand"` nur dann neue Frames an, wenn `laufen` (sichtbar, nicht pausiert) oder eine Scroll-/Zeiger-Dämpfung noch nicht eingeschwungen ist. Pausiert + eingeschwungen → kein `invalidate`, R3F beendet seine rAF-Schleife.
- Neuer E2E `Pause stoppt die Render-Schleife …` zählt WebGL-Draw-Calls (`drawElements/drawArrays[Instanced]`): laufend steigen sie, nach Pause (Tastatur) 2 s lang **0 neue Draw-Calls**, nach Fortsetzen steigen sie wieder. 3x wiederholt grün (Desktop und Mobil). Kein Fix nötig.

## 4. axe color-contrast `.journey-nr` (Befund 3)
- `SaeulenJourney.astro`: inaktive Panels nicht mehr `opacity: 0.3`, sondern Farb-Dimmung über Tokens am Textblock: `--journey-gedimmt: color-mix(in srgb, var(--text) 66%, var(--surface))` für `--text`, `--text-muted`, `--accent-text` (Nummer, Titel, Links, Gewerke-Hinweis inkl. Icon). Kontrast 5,1:1 auf Kalk-tief (5,4:1 Kalk, 7,5:1 Graphit). Übergang per `transition: color 360ms`, aktives Panel und `:focus-within` unverändert voll.
- axe (wcag2a/2aa/21aa/22aa, 1440 px, Journey gepinnt, inaktives Panel im Bild): **0 Verstöße**.

## Tests
- `npm test` (330 Unit + 7 Hook) grün, `npx vitest run` grün, `npm run check` 0 Fehler, `npm run build:staging` ok, `scan:wording` ok.
- `tests/e2e/motion-3d.spec.ts` mit `E2E_MAILPIT=extern`: 22 bestanden, 2 übersprungen (projektabhängig). Neu: Software-Renderer-Test (llvmpipe gestubbt), Pause/Draw-Call-Test. Unit: 13 Fälle Renderer-Erkennung.
- Hinweis: Das externe Mailpit war zwischenzeitlich nicht erreichbar; für die Messläufe lief kurz ein Stub nur für `/api/v1/info` auf 8025 (die Motion-Specs senden keine Mails). Auch der finale Motion-E2E-Lauf lief gegen diesen Stub; Kontaktformular-E2E wurden nicht ausgeführt.

## Offen / Risiken
- Bewusste Folge: Geräte ohne GPU (VMs, manche Thin Clients) sehen immer das Poster.
- Start bis zu 2 s nach `load` später als bisher (Poster steht vorher, kein CLS).
- 4x gedrosselt bleibt ein React-Commit von ~120 ms (R3F-Reconciler rendert synchron); weiteres Splitten nur mit spürbarem Umbau.
