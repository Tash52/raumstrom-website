# Phase 3 · architect · Fixes aus der Abnahme (B1, LCP)

Basis: main @ f99604d. Befunde: `3-qa-verifier.md` B1, `3-a11y-perf-tester.md` Nr. 4 (LCP).

## 1. B1 E2E-Stabilität (behoben)
- `tests/e2e/lauf.ts` (neu): je Playwright-Lauf freier Port (`tests/freier-port.ts`), eigene Lauf-ID und Kopie von `dist/` unter `node_modules/.cache/raumstrom-e2e/<id>/dist` (mit Zeitstempeln, sonst liefert `server/static.mjs` kein .br/.gz). Prüft die Kopie auf `client/index.html`, `client/404.html`, `_headers.json` und bricht mit klarer Meldung ab, wenn gerade gebaut wird. Aufräumen beim Prozessende, Reste > 6 h beim nächsten Lauf. Werte gehen per `process.env` an Worker und Webserver. Überschreibbar: `E2E_PORT`, `E2E_DIST` (ohne Kopie).
- `playwright.config.ts`: `webServer.url` = `/healthz?lauf=<id>`, `RAUMSTROM_DIST`/`RAUMSTROM_LAUF_ID` an den Server, `reuseExistingServer: false` bleibt. `outputDir` je Lauf (`test-results/lauf-<id>/`), denn Playwright leert sein `outputDir` beim Start; mit geteiltem Ordner brach im Parallel-Test ein Trace des anderen Laufs (belegt, ENOENT).
- `server/server.mjs`: `/healthz?lauf=X` antwortet 409, wenn X nicht `RAUMSTROM_LAUF_ID` ist (Playwright wertet ≥ 404 als „nicht bereit"). Ohne Parameter unverändert 200. In Produktion ohne Wirkung.
- `tests/unit/production-build.test.ts`: fester Port 4398 durch freien Port ersetzt (gleiche Kollisionsgefahr), neuer Test für die Lauf-ID-Prüfung.
- `tests/e2e/kontakt-api.spec.ts:13` (backend-api): festes `BASE` 4399 durch `BASE_URL` aus `lauf.ts` ersetzt, sonst nichts geändert.
- `tests/e2e/security.spec.ts`: Keystatic-Prüfung liest den ausgelieferten Build (`DIST`).
- CLAUDE.md, Befehle: freier Port, Lauf-ID, `dist`-Kopie, „während E2E- und Prüfläufen nicht im selben Checkout bauen".

Nachweis: zwei gleichzeitige Läufe (security + design-system, chromium) beide 28 passed. Ein fremder Server auf `E2E_PORT` wird nicht wiederverwendet, der Lauf bricht sofort mit EADDRINUSE ab statt gegen den fremden Server zu testen.

## 2. LCP Mobil (behoben, knapp)
Ursache (Lighthouse 12.8.2, wie beim Tester, simuliert Mobil): LCP-Element ist Text (`p.t-lead` bzw. `<p>`), Phasen TTFB + Render-Delay. Jede der 7 bis 10 CSS-Dateien blockiert, und jede trägt etwa 1,3 KB Security-Header (z. B. Section.css: 1,1 KB Inhalt, 1,7 KB übertragen).

Fix in `astro.config.mjs`: `vite.build.assetsInlineLimit` von `0` auf die Funktion `inlineNurCss`. CSS bis 20 KB wird als `<style>` eingebettet (Astros `inlineStylesheets: 'auto'` liest denselben Wert), Bilder, Schriften und Skripte nie (weiter keine Data-URIs). Astro schreibt für jeden `<style>` den SHA-256-Hash in `style-src`, kein `'unsafe-inline'`. Extern bleibt nur `BaseLayout.css` (25 KB, auf allen Seiten, cachebar). Reihenfolge der Stylesheets bleibt erhalten (geprüft an `/kontakt/`).
Prüfung: alle 114 `<style>`-Blöcke auf 30 Seiten mit Hash in `_headers.json`. Neuer E2E-Test `security.spec.ts` „Inline-<style> sind per Hash in der Seiten-CSP erlaubt" (5 Seiten, beide Projekte grün), Crawl ohne CSP-Konsolenfehler.

Lighthouse Mobil, LCP in ms, je 5 Läufe (Median):
- vorher: /kontakt/ 1959, 2105, 2259, 2252, 2257 (2252) · /leistungen/wallbox/ 2256, 1954, 2112, 2112, 2117 (2112)
- CSS ≤ 8 KB eingebettet: 2103 · 1950
- CSS ≤ 20 KB eingebettet (gewählt): 2165, 1803, 1803, 2102, 1953 (1953) · 1965, 1803, 1953, 1959, 1951 (1953)
- alles eingebettet: 1807 · 2061 (Wallbox schlechter, HTML größer)

Bewertung: Median jetzt unter 2,0 s, aber die Streuung reicht bis 2,17 s. Die übrige Zeit zwischen FCP und LCP (etwa 0,5 s) kommt von den Bytes, die vor dem LCP angefordert werden (Lantern zählt sie mit): Schriften etwa 115 KB (Archivo variabel latin 61 KB plus 17,5 KB Plex Mono als Preload, zwei weitere Plex-Mono-Dateien aus CSS) und `scroll.js` (GSAP, 41 KB gz) auch auf /kontakt/. Das betrifft andere Agenten und ist nur gemeldet:
- design-system: Preload nur für Archivo latin, Plex Mono ohne Preload bzw. kleiner schneiden, Archivo-Achsen prüfen (`src/layouts/BaseLayout.astro:27`).
- motion-3d / page-builder: GSAP/ScrollTrigger erst laden, wenn Elemente mit Scroll-Effekt vorhanden sind (Kontakt).
- Hinweis: Security-Header auf statischen Assets (etwa 1,3 KB je Antwort) bleiben bewusst. Mit dem Einbetten fällt das nur noch bei Schriften, Skripten und BaseLayout.css an.

Mess-Artefakt: Wer `dist` mit `cp -r` kopiert, bekommt neue mtimes, und dann kann `.br` älter als das Original sein. Der Server liefert dann unkomprimiert. Für E2E ist das in `lauf.ts` berücksichtigt; bei eigenen Messkopien `cp -a` verwenden.

## Tests
- `npm test`: 318 Unit + 7 Hook grün · `npx vitest run`: 318 grün · `npm run check`: 0 Fehler · `npm run build:staging`: ok · `npm run audit`: 0 · `scan:wording`: ok
- `E2E_MAILPIT=extern npm run test:e2e` (Mailpit-API-Stub, kein SMTP): 183 passed, 5 skipped, 4 failed. Die 4 Fehlschläge sind die erwarteten Mail-Tests `kontakt-api.spec.ts:96` und `:206`, je chromium/mobile, ohne SMTP.

## Offen
- Kein echtes Mailpit in dieser Umgebung, deshalb Mail-E2E nicht grün geprüft.
- LCP-Puffer gering. Weitere Gewinne nur über Schriften und GSAP (andere Agenten, siehe oben).
