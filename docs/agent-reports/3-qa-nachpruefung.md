# Phase 3 · Nachprüfung der Fixes (qa-verifier, auch a11y/Perf)

Stand: main @ f540df3, `dist/` aus `build:staging` (vom Orchestrator gebaut, nicht neu gebaut). `npm test`, vitest 331/331, `check`, `scan:wording` hat der Orchestrator gemeldet. Selbst nachgeprüft habe ich nur `scan:wording` ("keine verbotenen Begriffe gefunden").
Umgebung: kein Docker, kein Mailpit. Für `E2E_MAILPIT=extern` lief ein Stub auf 127.0.0.1:8025, der nur `/api/v1/info` und `/api/v1/search` (leer) beantwortet. Er hat kein SMTP. Für die Browser- und Lighthouse-Prüfung lief `node server/server.mjs` mit Test-Secrets auf Port 8093, direkt aus `dist/` (Zeitstempel unverändert, `/kontakt/` geht mit `Content-Encoding: br` raus). Chromium 1243 headless (SwiftShader), Lighthouse 12.8.2 Mobil mit Standard-Drosselung. Die Skripte liegen unter `/tmp/qa3n/`, Server und Stub sind am Ende beendet.

## Ergebnis je Punkt

| Nr. | Punkt | Ergebnis |
|---|---|---|
| 1 | B1 E2E-Stabilität | **bestanden** |
| 2 | axe Startseite 1440/390 | **bestanden** |
| 3 | Lighthouse Mobil | **teilweise**: Startseite und Wallbox bestanden, **/kontakt/ nicht bestanden** (LCP-Median 2101 ms) |
| 4 | Software-Renderer, Erzwingen, Reduced Motion, No-WebGL, Pause | **bestanden** |
| 5 | CSP-Hashes, CSP-Konsole, Fremd-Requests | **bestanden** |
| 6 | Screenshots | **erledigt** |

## 1. B1: E2E (belegt)
- Lauf 1: `4 failed, 5 skipped, 187 passed (2.5m)`
- Lauf 2: `4 failed, 5 skipped, 187 passed (2.5m)`
- Zwei Läufe gleichzeitig: p1 `4 failed, 5 skipped, 187 passed (2.9m)`, p2 `4 failed, 5 skipped, 187 passed (2.8m)`. Kein ENOENT, kein EADDRINUSE, kein Lauf hat den Server des anderen benutzt.
- In allen vier Läufen schlagen nur dieselben Tests fehl: `kontakt-api.spec.ts:96` ("Erfolg mit Foto im Browser", `#kontakt-erfolg` bekommt keinen Fokus) und `kontakt-api.spec.ts:206` (Location ist nicht `/kontakt/danke/`), jeweils chromium und mobile. Ursache ist das fehlende SMTP, also wie erwartet.
- Die `dist`-Kopien unter `node_modules/.cache/raumstrom-e2e/` waren nach den Läufen aufgeräumt.
- Hinweis (niedrig, architect): `test-results/lauf-<id>/` bleibt nach jedem Lauf liegen (4 Ordner nach diesem Test). Der Ordner ist gitignored und kein Befund.

## 2. axe WCAG 2.2 AA, Startseite (belegt)
Tags: wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa. Geprüft jeweils am Seitenanfang und an 5 Scrollpositionen in der Journey (gepinnt, aktive Panels 0, 1 und 2, inaktive Panels im Bild):
- Desktop 1440, Standard (Poster): 0 Verstöße an allen 6 Messpunkten.
- Desktop 1440, `?3d=erzwingen` (Journey-Zustand `3d`): 0 Verstöße an allen 6 Messpunkten.
- Mobil 390, Standard und erzwungen: 0 Verstöße (die Journey ist dort `statisch`).
- Lighthouse-A11y: 100 auf allen drei gemessenen Seiten.

## 3. Lighthouse Mobil (belegt)
Format je Lauf: Perf / LCP ms / TBT ms / CLS

| Seite | Lauf 1 | Lauf 2 | Lauf 3 | Median |
|---|---|---|---|---|
| `/` | 99 / 2108 / 23 / 0 | 99 / 2101 / 21 / 0 | 98 / 2232 / 34 / 0 | Perf 99, TBT 23 ms, LCP 2108 |
| `/kontakt/` | 99 / 1953 / 7 / 0 | 98 / 2160 / 15 / 0 | 98 / 2101 / 27 / 0 | **LCP 2101 ms** |
| `/leistungen/wallbox/` | 99 / 1965 / 10 / 0 | 99 / 1981 / 9 / 0 | 99 / 1953 / 1 / 0 | LCP 1965 ms |

- Startseite: Perf 99 (vorher 70), TBT 23 ms (vorher 2710). Bestanden. Der LCP liegt mit 2,1 s weiter über 2,0 s, war hier aber nicht Prüfziel.
- Wallbox: Median 1965 ms, unter 2,0 s. Bestanden.
- **Kontakt: Median 2101 ms, nicht bestanden.** Zwei Zusatzläufe ergaben 2104 und 1956, der Median aus 5 Läufen bleibt 2101 ms. Damit bestätigt sich die "knapp"-Warnung aus `3-architect-fixes.md`, das Ergebnis liegt in der Streuung.
- Ursachenaufschlüsselung `/kontakt/` (Lauf 2): Das LCP-Element ist ein `<p>`. TTFB 450 ms, Render Delay 1710 ms (79 %). Render-blockierend ist nur noch `BaseLayout.CvrtzPcA.css` (180 ms). Vor dem LCP werden außerdem angefordert: 4 Schriftdateien (62 + 19 + 19 + 15 KB übertragen), `scroll.CCwkWMxx.js` (GSAP, 41,5 KB), `altcha-widget` (29,6 KB) und `Motion` (5,8 KB).

### Befunde zu Punkt 3
- **N1, mittel (belegt: Messwert; Ursachenanteile sind Vermutung, Lantern zählt diese Bytes vor dem LCP mit).** LCP `/kontakt/` liegt im Median bei 2,10 s, Ziel unter 2,0 s. Mögliche Hebel:
  - design-system: Preload für Plex Mono prüfen und Schriftdateien verringern (`src/layouts/BaseLayout.astro:27`, `:41`; zwei Preloads, dazu zwei weitere Woff2-Dateien mit Priorität VeryHigh).
  - motion-3d: GSAP lädt auf `/kontakt/`, weil `Section` mit `leitung` dort `[data-leitung]` setzt (`src/components/base/Section.astro:39`). Die Bedingung sitzt in `src/lib/motion/index.ts:23-25`. GSAP könnte erst laden, wenn ein `[data-leitung]` in die Nähe des Viewports kommt (z. B. per IntersectionObserver).
  - backend-api: Das Altcha-Widget (29,6 KB) könnte erst bei Fokus auf das Formular oder bei Sichtbarkeit laden.

## 4. Renderer-Entscheidung und Pause (belegt)
- Standard auf SwiftShader: `data-hero-zustand="poster"`, `data-hero-grund="software-renderer"`, auf Desktop und Mobil.
- `?3d=erzwingen`: Hero `3d` auf Desktop und Mobil, Journey auf Desktop `3d`.
- Reduced Motion, mit und ohne `?3d=erzwingen`: Hero `poster/reduzierte-bewegung`, Journey `statisch`, 0 Canvas. Unverändert.
- Ohne WebGL (`getContext('webgl*')` liefert null), mit und ohne `?3d=erzwingen`: Hero `poster/kein-webgl`, Journey `gepinnt` ohne 3D, 0 Canvas. Unverändert.
- Pause (eigene Messung, Draw-Call-Zähler auf WebGL/WebGL2, Bedienung per Tastatur): laufend 400 Draw-Calls/s. Nach der Pause (`aria-pressed="true"`) 0 Draw-Calls in 3 s. Nach dem Fortsetzen 424 Draw-Calls/s.
- Konsole bei erzwungenem 3D: nur Warnungen (THREE.Clock veraltet, KHR_parallel_shader_compile fehlt, SwiftShader "GPU stall due to ReadPixels"). Keine Fehler, keine pageerror. Die Clock-Warnung ist ein Hinweis für motion-3d, niedrig.
- Beobachtung, kein Befund: Programmatische Sprünge durch die Journey liefern die aktiven Panels in der Folge 0, 2, 0, 2. Das ist der richtungsabhängige Snap von ScrollTrigger (`src/islands/journey/steuerung.ts:64`, `snapTo: 1/(n-1)`) zusammen mit absoluten `scrollTo`-Sprüngen des Messskripts, also ein Messartefakt.

## 5. CSP und Fremd-Requests (belegt)
- Statische Prüfung aller 30 HTML-Dateien in `dist/client` gegen `dist/_headers.json`:
  - 30/30 Seiten haben eine CSP.
  - 114 `<style>`-Blöcke, alle mit SHA-256 in `style-src`, keiner fehlt.
  - Kein `style=`-Attribut, kein `'unsafe-inline'`.
  - Alle ausführbaren Inline-Skripte stehen per Hash in `script-src`.
- Im Browser (Startseite, 4 Varianten inklusive 3D und Scroll durch die Journey): 0 `securitypolicyviolation`-Ereignisse, 0 CSP-Meldungen in der Konsole, 0 Requests an andere Hosts als 127.0.0.1:8093.
- Die Lighthouse-Netzwerkliste für `/kontakt/` enthält nur Requests an den eigenen Host.

## 6. Screenshots
`docs/agent-reports/screenshots/3-qa/`:
- `nach-desktop.png`, `nach-mobil.png`: Viewport. Der Hero zeigt das Poster, die Gewerke-Kennzeichnung "Ausführung durch unsere Meister-Partnerbetriebe: …" ist sichtbar.
- `nach-desktop-ganz.png`, `nach-mobil-ganz.png`: ganze Seite.
- `nach-desktop-journey.png`, `nach-mobil-journey.png`: Journey. Desktop gepinnt, Panel 01 aktiv, mit Partner-Hinweis.

## Wording und Gewerke-Kennzeichnung (Stichprobe)
- `npm run scan:wording`: "Wording-Scan: keine verbotenen Begriffe gefunden."
- In den Screenshots stehen am Hero und am Journey-Panel "Modernisieren" die Partner-Hinweise im Plural mit den genannten Gewerken. In Ordnung.

## Offen
- N1 (LCP `/kontakt/`) siehe Punkt 3. Zuständig: design-system, motion-3d, backend-api, Koordination architect.
- Mail-E2E (`kontakt-api.spec.ts:96`, `:206`) sind in dieser Umgebung weiter nicht prüfbar, weil Docker und Mailpit fehlen.
- Echte GPU, Screenreader und INP auf echten Geräten sind hier nicht prüfbar.
