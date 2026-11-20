# Phase 4 · architect · Nacharbeit

Der Orchestrator hat während der Arbeit schon einen Zwischenstand committet (`a5e68cb`). Darin sind alle Code-Änderungen enthalten. Neu ist nur dieser Bericht.

## Geändert
1. `CLAUDE.md` (68 Zeilen)
   - Neuer Schnittstellen-Eintrag „Planer-Projektmodell" mit Import aus `lib/geometry/index.ts`, Version 1 und Migrationen, Einheiten und Achsen, Kernfeldern, ID-Format, Store (`planerStore`, `usePlaner`, `aendere`), `baueSzene`-userData und dem Ausblick auf Version 2. Alle genannten Exporte sind im Code vorhanden.
   - Bei den Schemas steht jetzt: zod läuft `jitless`.
   - Bei der CSP steht jetzt: `'self'` muss neu gesetzt werden, weil `insertScriptResource` die Liste ersetzt. Außerdem ist die Worker-CSP für pdf.js eingetragen.
   - Bei `npm run check` steht der Hinweis, dass `public/` ausgeschlossen ist.
2. `tsconfig.json`: Die Änderung von planner-geometry (`public` in `exclude`) bleibt so. In `public/` liegt kein Quellcode, nur ausgelieferte Dateien (pdf.js, Decoder). Typprüfung an Minified-Bundles bringt nichts und führte zum Speicherüberlauf. Kein Import aus `src/` zeigt nach `public/`.
3. `server/static.mjs` `pickVariant`
   - Der mtime-Vergleich ist entfallen. Bei dist-Kopien ohne Zeitstempel ging JS deshalb unkomprimiert raus.
   - Veraltete Varianten verhindert der Build-Nachschritt: `precompress.mjs` löscht bei jedem Build alle Varianten und schreibt sie neu.
   - Als einfache Plausibilitätsprüfung bleibt: Die Variante muss kleiner als das Original sein. Der Build schreibt Varianten nur dann. Ist sie es nicht, wird sie als fremd behandelt.
   - Tests in `tests/unit/server-http.test.ts`: (a) Ist das Original neuer als die Variante, wird trotzdem br geliefert. (b) Eine Variante, die nicht kleiner als das Original ist, wird ignoriert.
4. Worker-CSP für pdf.js
   - In `server/csp.mjs` gibt es neu `WASM_WORKERS` (exakt `/pdfjs/pdf.worker.min.mjs`) und `WASM_WORKER_CSP`. Das ist `FALLBACK_CSP` mit `script-src 'self' 'wasm-unsafe-eval'`.
   - `server/server.mjs` setzt diese CSP nur für diesen Pfad. Kodierte Varianten des Pfads behalten `FALLBACK_CSP`.
   - Test: Der Worker bekommt die neue CSP, ein anderes `.mjs` und der kodierte Pfad die Fallback-CSP. `'unsafe-inline'` und `'unsafe-eval'` kommen nicht vor.
5. Zusätzlich gesetzt: `z.config({ jitless: true })` in `src/lib/schemas/shared.ts`. Damit gilt der Schalter auch für Bundles, die Schemas nutzen, aber `geometry/projekt.ts` nicht laden. Doppelt gesetzt schadet nicht.

## Geprüft
- `node_modules` passte nicht zum Lockfile (es fehlten pdfjs-dist und three-bvh-csg). `npm ci` hat das behoben, 0 vulnerabilities.
- `npm test`: 402 von 402 Tests grün, Hook-Test 7 von 7 grün.
- `npm run check`: 0 Fehler.
- `npm run build:staging`: grün, 140 vorkomprimierte Dateien.
- E2E `tests/e2e/raumplaner.spec.ts`: 18 von 18 grün (mit `E2E_MAILPIT=extern` und einem Stub auf 8025). Dazu gehört der PDF-Upload über den selbst gehosteten Worker ohne CSP-Verstöße.

## Offen
- Ob der Worker die WASM-Decoder jetzt wirklich kompiliert, ist nicht im Browser belegt. Das Test-PDF enthält kein JPX/JBIG2. Ein E2E-Fall mit einem JPX-Bild (planner-geometry) würde das zeigen.
- `/planer/ansehen` gibt es noch nicht. Dort gilt dieselbe Regel (`'self'` und `'wasm-unsafe-eval'`).
