# Phase 3 · Zusammenfassung

Stand 20.11.2026, `main` @ f540df3 (plus dieser Abschluss-Commit). Ergebnis: **bestanden mit einem Restpunkt** (LCP `/kontakt/` im Lab knapp über Ziel).

## Gebaut
- **motion-3d:** 3D-Hero „Hinter der Wand", Säulen-Journey (Desktop gepinnt in 3D, mobil statisch), 3-Zustands-Slider, Leitungs- und Prozess-Leitung, Tilt-Karten, Cursor, magnetische Buttons, native View Transitions, Pause-Schalter, Fallbacks für Reduced Motion, ohne WebGL und ohne JS.
- **content-writer/page-builder:** Startseiten-Abschnitt „So läuft's ab" (`start.md` id `ablauf`, Parser `src/components/sections/ablauf.ts`).
- Neue Abhängigkeiten: three 0.187.0, @react-three/fiber 9.8.2, gsap 3.15.1 (Lizenzen geprüft).

## Fixes nach den Abnahmen
- **motion-3d** (`3-motion-3d-fixes.md`): Software-Renderer (SwiftShader, llvmpipe …) bekommen das Poster. Der 3D-Start erfolgt erst nach der ersten Interaktion oder 2 s nach `load`, in Teilen, mit `compileAsync`. Lighthouse Startseite: Perf 70 → 99, TBT 2710 → 23 ms. Neuer E2E-Test belegt, dass Pause keine Draw-Calls mehr erzeugt. Journey-Kontrast über Farbe statt Opacity (5,1:1).
- **architect** (`3-architect-fixes.md`): E2E-Läufe isoliert (freier Port, Lauf-ID über `/healthz?lauf=`, eigene dist-Kopie, eigener test-results-Ordner). CSS bis 20 KB wird inline eingebettet, jeder Block per CSP-Hash. LCP Wallbox 2,11 → 1,97 s.

## Abnahmen
- **a11y-perf-tester** (`3-a11y-perf-tester.md`): JS-Budget, getrennter 3D-Chunk, Reduced Motion, No-WebGL, Tastatur, 0 Fremd-Requests bestanden. Befunde (Kontrast, TBT) behoben.
- **qa-verifier** (`3-qa-verifier.md`): DoD Phase 3 und „Website ohne Planer startfähig" bestanden, 26 Seiten, 0 Konsolenfehler, Screenshots in `screenshots/3-qa/`.
- **Nachprüfung** (`3-qa-nachpruefung.md`): 5 von 6 Punkten bestanden. E2E stabil, auch bei zwei parallelen Läufen (187 bestanden, nur die 4 Mail-Tests ohne Mailpit rot). axe 0 Verstöße, CSP 114/114 Hashes.
- **Tests:** 331 Unit-Tests, Hook-Test, `check`, Wording-Scan und Staging-Build grün.

## Offen
- **LCP `/kontakt/` Mobil-Lab:** Median 2,10 s (Ziel < 2,0 s), real ungedrosselt deutlich darunter. Ursachen laut Nachprüfung (Vermutung): 4 Schriftdateien vor dem LCP (design-system, `BaseLayout.astro:27/:41`), GSAP 41 KB wegen `[data-leitung]` auch auf `/kontakt/` (motion-3d, `src/lib/motion/index.ts:23-25`), ALTCHA-Widget 30 KB (backend-api). Als erster Kleinauftrag in Phase 4 übernommen.
- 60 fps, LCP und INP auf echtem Gerät mit GPU sind nicht gemessen (Betreiber).
- „Raumplaner öffnen" führt bis Phase 6 auf die Platzhalterseite `/raumplaner/` (kein toter Link, bewusst so gelassen).
- `THREE.Clock`-Deprecation-Warnung aus R3F beobachten (motion-3d).
- Mail-E2E weiterhin nur in der CI.
