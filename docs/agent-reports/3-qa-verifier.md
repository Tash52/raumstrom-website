# Phase 3 · qa-verifier (Abnahme Motion/3D)

Stand: main @ `5d86890`, 20.11.2026. Geprüft gegen den vorhandenen `dist/` (build:staging, laut Orchestrator grün). Ich habe nichts neu gebaut und keinen Projektcode geändert.

## Rahmen und Abweichungen vom Standardvorgehen
- `npm ci`: **nicht ausgeführt**. Der Checkout wird gerade auch von a11y-perf-tester benutzt, und `npm ci` würde `node_modules` löschen. npm test (317/317), check, licenses und build:staging hat der Orchestrator schon geprüft. Ich habe sie nicht wiederholt.
- Eigener Server für Browserprüfungen auf Port **4398** (`node server/server.mjs`, Test-Secrets), danach beendet. E2E nutzt Port 4399 (`playwright.config.ts:6`). Kein Konflikt mit 8091.
- Mailpit: Docker-Daemon nicht verfügbar. Ein Stub für die API (`/tmp/qa3/mailpit-stub.mjs`, nur `/api/v1/info`) lief auf 8025, SMTP gab es nicht. Mail-Tests schlagen deshalb erwartungsgemäß fehl.
- Browser: Chromium (Playwright 1.63), SwiftShader (keine GPU). 60 fps sind hier **nicht prüfbar**.

## 1. Definition of Done Phase 3 (Plan Abschnitt 3, Briefing 5)

| # | Punkt | Ergebnis | Beleg |
|---|---|---|---|
| 1 | 3D-Hero „Hinter der Wand“, öffnet sich beim Scrollen schichtweise | **bestanden** | `data-hero-zustand=3d` auf Desktop (ohne Testschalter) und Pixel 7. Legende 01–05 schaltet weiter. Screenshots `desktop-01/02`, `mobil-01` |
| 2 | Poster vor dem 3D-Laden, 3D erst bei Sichtweite | **bestanden** (Funktion) | Poster-`<picture>` mit AVIF/WebP. E2E `motion-3d.spec.ts` „Seiten ohne 3D laden keinen 3D-Chunk“ und „3D erst nahe der Sichtweite“ sind grün |
| 3 | Leitungs-Linie durch die Seite (ScrollTrigger) | **bestanden** | 8× `data-leitung` auf `/`. Linie und Knoten in `desktop-02`, `mobil-05` sichtbar |
| 4 | Säulen-Journey, gepinnt und horizontal, 3D-Objekte Raum/Wallbox/Prüfgerät | **bestanden** | Desktop `data-journey-zustand=3d`, Panel 03/03 nach dem Scrollen (`desktop-04-journey-b`). Mobil `statisch` mit 3 Karten und Standbild (`mobil-04-journey-a`). Briefing „auf Mobile reduziert, aber vorhanden“: der Hero ist mobil 3D, die Journey zeigt Standbilder |
| 5 | 3-Zustands-Slider Vorher / Hinter der Wand / Nachher | **bestanden** | 3 Radios, alle drei Zustände fotografiert (`*-03-slider-*`). E2E Tastatur und ohne JS grün. Gekennzeichnet als „Schematische Darstellung.“ |
| 6 | Tilt-Karten mit Tiefe | **bestanden** | `/leistungen/` hat 11 Karten. Bei Hover ändert sich `transform` von neutral auf `matrix3d(0.996…, …)` |
| 7 | Magnetische Buttons | **bestanden** | 2× `[data-magnet]`, beim Hover `translate: 10px -7.9px` |
| 8 | Eigener Cursor nur Desktop, nicht Touch | **bestanden** | Desktop: `.cursor-ring ist-sichtbar`. Pixel 7 (Touch): 0 sichtbare Ring-Elemente |
| 9 | Prozess-Leitung „So läuft's ab“, 4 Schritte, Startseite + Leistungsseiten | **bestanden** | `#ablauf` mit 4× `data-prozess-schritt`, Knoten schalten beim Scrollen (`mobil-05-ablauf`). E2E „Prozess-Leitung“ grün |
| 10 | Seitenübergänge per View Transitions mit Leitungs-Animation, kein ClientRouter | **bestanden** (CSS geprüft, Animation nicht visuell aufgezeichnet) | Stylesheets enthalten `@view-transition { navigation: auto; }`, `::view-transition-group(vt-leitung)` und bei Reduced Motion `navigation: none` |
| 11 | Fallback Reduced Motion | **bestanden** | `poster`, 0 Canvas, Journey `statisch`. Pause-Knopf ausgeblendet (`desktop-10-*`) |
| 12 | Fallback ohne WebGL | **bestanden** | getContext(webgl*) → null: Hero `poster`, Journey `gepinnt` mit Standbildern, 0 Fehler (`desktop-11-*`) |
| 13 | Fallback schwaches Gerät / FPS | **bestanden** (E2E) / FPS-Abbruch **nicht prüfbar** | E2E „Schwaches Gerät (2 Kerne)“ grün. Die FPS-Messung lässt sich ohne echte GPU nicht sinnvoll auslösen |
| 14 | Ohne JS voll nutzbar | **bestanden** | `mobil-12-ohne-js-start`, Slider ohne JS per E2E |
| 15 | Animationen pausierbar (WCAG 2.2.2) | **bestanden** | „Animation anhalten“ sichtbar, Klick setzt `aria-pressed=true` und `localStorage raumstrom:bewegung-pausiert=1` |
| 16 | 60 fps / LCP / CLS / INP auf Mittelklasse-Gerät | **nicht prüfbar** | Keine GPU. Messwerte von motion-3d (SwiftShader) liegen vor. Test auf echtem Gerät durch den Betreiber ist laut Plan Risiko 2 nötig. Lighthouse und axe übernimmt a11y-perf-tester |

## 2. „Website ohne Planer startfähig“ — **bestanden**
- Crawl ab `/` über alle internen Links, Desktop 1440 und Pixel 7: **26 Seiten, alle HTTP 200**, 0 Antworten ≥ 400, **0 Konsolenfehler, 0 pageerror, 0 Fremd-Requests** (nach Scrollen über die ganze Seite).
- Es gibt 1 externen Link (gesetze-im-internet.de/hwo im Impressum) und keine weiteren.
- `/raumplaner/` ist von allen 26 Seiten verlinkt und liefert 200 mit „Der Raumplaner folgt in Kürze“ plus Button „Anfrage stellen“ (`desktop-09-raumplaner`). Damit gibt es keinen toten Link.
- Konsolenwarnungen, keine Fehler: `THREE.Clock … deprecated` (R3F intern, schon von motion-3d gemeldet) und auf Desktop `GPU stall due to ReadPixels` (SwiftShader).
- Nicht verlinkt und erwartungsgemäß erreichbar: `/styleguide/` (nur Staging), `/kontakt/danke/`, `/kontakt/fehler/`.

## 3. E2E (`E2E_MAILPIT=extern npm run test:e2e`, vorhandener dist)
- Lauf 1: **181 passed, 4 failed, 5 skipped** (2,4 min)
- Lauf 2: **181 passed, 4 failed, 5 skipped** (2,3 min)
- In beiden Läufen schlagen nur Tests fehl, die Mailpit-SMTP brauchen: `kontakt-api.spec.ts:95` und `:205`, je chromium und mobile. Ursache ist das fehlende SMTP (z. B. `/kontakt/fehler/` statt `/kontakt/danke/`). Das ist erwartet und kein Befund.
- Gezielte Wiederholung: `design-system.spec.ts:96`, `:125` und `motion-3d.spec.ts` mit `--repeat-each=8 --workers=4`: **88/88 grün**. Den Flake konnte ich nicht nachstellen.

### Flake-Analyse (`design-system.spec.ts:108`, `:130`, „Testserver nicht erreichbar“)
- **Belegt:** Während dieser Prüfung lief ein fremder E2E-Lauf (vermutlich a11y-perf-tester) auf demselben Port 4399. Mein dritter Lauf brach sofort ab mit `Error: http://127.0.0.1:4399/healthz is already used … set reuseExistingServer:true` (`/tmp/qa3/e2e-kill.log`). Der Port ist fest verdrahtet (`playwright.config.ts:6`), parallele Läufe mehrerer Agenten (auch aus Worktrees) kollidieren also.
- **Vermutung, Ursache A (Server nicht erreichbar, viele Fehlschläge mit ~40 ms):** Zwei Läufe starten fast gleichzeitig, beide sehen 4399 als frei. Der zweite Server stirbt an EADDRINUSE, aber sein Playwright findet `/healthz` beim fremden Server und läuft los. Wenn der fremde Lauf endet, beendet er seinen Server, und alle übrigen Tests scheitern sofort mit ECONNREFUSED.
- **Vermutung, Ursache B (`/styleguide/` ohne Hauptnavigation):** Der Server liest Dateien bei jeder Anfrage von der Platte (`server/server.mjs:90`). Wird `dist/` während des Laufs neu gebaut (build:staging eines anderen Agenten), fehlen kurz `styleguide/index.html` und `404.html`. Dann antwortet der Server mit dem Text „Nicht gefunden“ ohne Header (`server/server.mjs:44-47`). Das passt genau zur Meldung „kein navigation/#hauptmenue“. `404.html` selbst enthält die Navigation, ein normales 404 würde den Test also bestehen lassen. Gegen einen Fehler in Header-CSS spricht: :108 und :130 laufen unter Last 88/88 grün.
- **Fix-Vorschlag (architect, Test-/CI-Konfiguration):**
  1. `PORT = Number(process.env.E2E_PORT ?? 4399)` und in CLAUDE.md eine Regel „pro Agent eigener E2E_PORT“.
  2. Der Server meldet über `/healthz` eine Lauf-ID (env `E2E_LAUF_ID`), und `webServer.url` bzw. global-setup prüft sie. Damit benutzt kein Lauf den Server eines anderen.
  3. Optional: E2E gegen eine Kopie des Builds (`RAUMSTROM_DIST`), damit ein paralleler Build den Lauf nicht stört.
  4. Ablaufregel für den Orchestrator: während E2E- oder Prüfläufen nicht im selben Checkout bauen.

## 4. Wording, Platzhalter, Gewerke (Stichprobe)
- `npm run scan:wording`: „keine verbotenen Begriffe gefunden“, exit 0. Der Scan deckt `src/` und `public/` ab, also auch `src/islands`, `src/lib/motion` und die Sektionskomponenten.
- Zusätzlich habe ich den sichtbaren Text aller 29 gebauten HTML-Seiten nach Kamera/Alarm/Sicherheitstechnik/Festpreis/Preisgarantie/beste/Nr. 1/Top/Innung/Fachbetrieb/Meister* durchsucht, mit Ausnahme von Meister-Partnerbetrieb und meisterpflichtig: **0 Treffer**.
- Neue UI-Texte in Slider/Journey/Hero (`WandSlider.astro`, `SaeulenJourney.astro:26-30`, `HeroVisual.astro`, `PauseKnopf.astro`): ohne verbotene Begriffe und **ohne Platzhalter**.
- Platzhalter in neuen Texten gibt es nur im neuen Ablauf-Abschnitt: `src/content/pages/start.md:33` „[[PLATZHALTER: Frist für die Angebotserstellung …]]“. Er ist auf der Startseite sichtbar und in Ordnung, weil Staging (Betreiber/content-writer).
- Gewerke-Kennzeichnung: Der Hero zeigt „Ausführung durch unsere Meister-Partnerbetriebe: …“. `data-gewerke-hinweis` ist auf allen Leistungsseiten mit Partner-Gewerk vorhanden. `/leistungen/pruefservice-ladesaeulen/` hat 0 Hinweise, und das ist korrekt, denn `pruefservice-dguv-v3` steht auf `ausfuehrung: eigen` (`src/content/settings/gewerke.yaml:46-48`).

## Befunde

| Nr. | Art | Befund | Ort | Zuständig |
|---|---|---|---|---|
| B1 | Test-Infrastruktur (belegt: Port-Kollision; Ursache des Flakes: Vermutung) | Fester E2E-Port 4399, kein Schutz gegen fremden Server oder parallelen Build, siehe Abschnitt 3 | `playwright.config.ts:6`, `:26`; `server/server.mjs:44-47`, `:90` | architect |
| H1 | Hinweis (Inhalt) | Mehrere Buttons heißen „Raumplaner öffnen“, und Schritt 1 nennt eine „Skizze aus dem Raumplaner“, obwohl der Planer erst „in Kürze folgt“. Kein toter Link, aber eine geweckte Erwartung, die die Seite noch nicht einlöst. Vorschlag: bis Phase 6 „Zum Raumplaner“ bzw. „Skizze“ ohne Planerbezug, oder bewusst so lassen | `src/pages/index.astro:47`, `:90`; `src/components/sections/CtaBand.astro:23`; `src/content/pages/start.md:31` | content-writer / page-builder (Entscheidung Orchestrator) |
| H2 | Hinweis | `THREE.Clock`-Deprecation-Warnung in der Konsole (R3F intern) | 3D-Chunk | motion-3d (beobachten, bei R3F-Update prüfen) |
| H3 | offen, nicht prüfbar | 60 fps sowie LCP/INP auf echter Mittelklasse-Hardware | — | Betreiber (Gerätetest), a11y-perf-tester |

## Screenshots
`docs/agent-reports/screenshots/3-qa/` (29 Dateien, deviceScaleFactor 2): `desktop-*` mit 1440×900 und `mobil-*` mit 390×844. Inhalt: Hero, Hero geöffnet, Slider in 3 Zuständen, Journey a/b, Ablauf, Raumplaner-Teaser, Leistungen, Leistung Bad/Fliesen (ganze Seite), Raumplaner, Reduced Motion, ohne WebGL, ohne JS.

Skripte: `/tmp/qa3/crawl.mjs`, `/tmp/qa3/shots.mjs`, `/tmp/qa3/probe.mjs`, `/tmp/qa3/magnet.mjs`. Logs: `/tmp/qa3/e2e-1.log`, `/tmp/qa3/e2e-2.log`, `/tmp/qa3/e2e-flaky.log`, `/tmp/qa3/e2e-kill.log`.

## Gesamturteil
Phase 3 ist aus QA-Sicht **bestanden**. Alle prüfbaren DoD-Punkte sind erfüllt, und die Website ist ohne Planer startfähig. Offen bleiben B1 (architect, Test-Infrastruktur) und der Gerätetest auf echter Hardware (H3).
