# Phase 1 Abnahme · qa-verifier · 18.11.2026

Stand: `bfb65a7` (main). Frischer Klon unter `/tmp/qa1`. Node 22.23.5, npm 10.9.9. Server lokal mit Test-Secrets per `node --env-file=.env server/server.mjs` (Port 4420). Lighthouse 13.6.0 lag isoliert in `/tmp/qa1-tools`, Chrome `/usr/bin/google-chrome`.

## Gesamturteil

**Bestanden mit Auflagen.** Alle in Phase 1a/1b geforderten Befehle und Tests sind grün, die Header sind vollständig, die CSP enthält kein `unsafe-inline`, es gibt 0 Fremd-Requests, `/keystatic` liefert 404, Lighthouse Mobile auf `/` erreicht 100 und axe meldet 0 Verstöße. Es gibt keine Blocker. Vor Phase 2 sind zu beheben: B1 (Desktop-Navigation mit Browser-Standardrahmen) und B2 (`npm start` liest `.env` nicht, obwohl `CLAUDE.md` das zusagt). Dazu kommen sechs kleinere Befunde (B3 bis B8).

## 1. Befehle (wörtliche Kernausgaben)

| Befehl | Exit | Ausgabe (Auszug) | Urteil |
|---|---|---|---|
| `npm ci` | 0 | `added 491 packages, and audited 492 packages in 10s` · `17 high severity vulnerabilities` | bestanden (siehe Audit) |
| `npm run build:staging` | 0 | `Wording-Scan: keine verbotenen Begriffe gefunden.` · `Launch-Check: 56 offene(r) Punkt(e), 0 Fehler.` · `Staging: offene Punkte erlaubt (--allow-placeholders). Nicht veröffentlichen.` · Routen `/404.html`, `/styleguide/index.html`, `/index.html` · `[build] Complete!` | bestanden |
| `npm run build` | **1** (soll) | `Launch-Check: 56 offene(r) Punkt(e), 0 Fehler.` · `Produktions-Build abgebrochen. Für Staging: npm run build:staging (--allow-placeholders).` · Gruppen: Rechtliches (30), Kontaktdaten (18), Texte (1), Technik (7), darunter 11× `[HWK-Prüfung] …` | bestanden |
| `npm test` | 0 | Vitest: `Test Files  7 passed (7)` · `Tests  115 passed (115)` · Hook-Test: `# tests 7` `# pass 7` `# fail 0` | bestanden |
| `npm run test:e2e` | 0 | `Running 46 tests using 2 workers` … `2 skipped` · `44 passed (9.2s)`. Übersprungen wird jeweils das projektfremde Gegenstück (`test.skip(!isMobile, 'nur mobil')` bzw. `'nur Desktop'`, `tests/e2e/design-system.spec.ts:83,97`), das ist gewollt. | bestanden |
| `npm run check` | 0 | `Result (70 files): - 0 errors - 0 warnings - 0 hints` | bestanden |
| `npm run audit` | 0 | `akzeptiert bis 2026-12-31: GHSA-fc5q-39xc-vjpf picomatch (high) – …` · `npm audit: critical 0, high 17, moderate 0, low 0.` · `Audit ok (keine High/Critical außer dokumentierten Ausnahmen).` | bestanden mit Ausnahme (Abschnitt 4) |
| `npm run licenses -- --check` | 0 | `Hinweis: Ausnahme lightningcss* (MPL-2.0) wartet auf Freigabe.` · `Hinweis: Ausnahme y-provider (keine Angabe) wartet auf Freigabe.` · `Lizenzen ok (560 Pakete).` | bestanden, Freigabe offen (B6) |
| `npm run scan:wording` | 0 | `Wording-Scan: keine verbotenen Begriffe gefunden.` | bestanden (Lücken: B4) |
| `npm run trend-schema -- --check` | 0 | `Trend-Schema aktuell.` | bestanden |
| Start ohne Secrets | 1 | `Start abgebrochen (fail-secure). … SMTP_PASS: mindestens 8 Zeichen` | bestanden (fail-secure) |

Rohlogs lagen unter `/tmp/qa1-logs/` (flüchtig).

## 2. Abnahmepunkte Phase 1a (architect)

| Punkt | Urteil | Beleg |
|---|---|---|
| `build:staging` läuft durch | bestanden | Exit 0, siehe oben |
| `build` bricht mit Liste offener Punkte ab | bestanden | Exit 1, 56 Punkte nach Gruppen, Datei:Zeile je Platzhalter |
| Vitest: Schemas, Launch-Check, Wording (Positiv/Negativ, „Meister-Partnerbetrieb" erlaubt, „Meisterbetrieb" verboten) | bestanden | `tests/unit/wording.test.ts:9-11` (erlaubt), `:20` (`'RAUMSTROM ist Ihr Meisterbetrieb in Schweinfurt'` wird erkannt) |
| E2E: Startseite 200 und alle Security-Header | bestanden | E2E grün. curl selbst geprüft: HSTS `max-age=63072000; includeSubDomains`, nosniff, `X-Frame-Options: DENY`, Referrer-Policy, restriktive Permissions-Policy, COOP/CORP same-origin |
| CSP ohne `'unsafe-inline'` | bestanden | curl `/` und `/styleguide/`: `script-src 'self' 'sha256-…'`, `style-src 'self' 'sha256-…'`, `frame-ancestors 'none'`, `object-src 'none'`, `upgrade-insecure-requests`, kein `unsafe-inline`, kein `wasm-unsafe-eval` |
| 0 Fremd-Requests | bestanden | E2E-Crawl grün. Eigene Messung mit Playwright: `/` 7 Requests, `/styleguide/` 8–9 Requests (390 und 1440 px), 0 davon fremd, 0 Konsolenfehler |
| `/keystatic`, `/api/keystatic` liefern 404 | bestanden | curl: `/keystatic` 404, `/keystatic/` 404, `/api/keystatic` 404, jeweils mit vollständigen Headern |
| `npm audit` ohne High/Critical | bestanden mit dokumentierter Ausnahme | alle 17 High gehen auf ein Advisory zurück (GHSA-fc5q-39xc-vjpf, picomatch), Abschnitt 4 |
| Schemas, settings-YAMLs, `getFirma/getFeatures/getGewerke`, Keystatic nur dev | bestanden | `npm run check` 0 Fehler, `tests/unit/keystatic.test.ts` grün, E2E „Produktions-Build enthält Keystatic nicht" grün |
| CI, Dependabot | bestanden | `.github/workflows/ci.yml:32-56` (ci, wording, licenses, trend-schema, check, test, audit, Build-Abbruch, staging, e2e). Den Lauf auf GitHub selbst habe ich nicht gesehen. |
| `CLAUDE.md` ≤ 80 Zeilen | bestanden | `wc -l` = 57 |
| `CLAUDE.md` enthält Inhalte aus `UEBERGABE.md` | weitgehend bestanden | vorhanden: 17 Agenten, Skill-Kopien + `SKILL-AUDIT.md`, Hook + Test, SEO-Skills offen mit `468ed5b`, **Projektregel lokal** (`CLAUDE.md:44`: Draco/Basis/KTX2, meshopt, pdf.js-Worker, Schriften auch für drei `<Text font>`, HDRs statt `preset`). Domain, GbR und 9 Orte stehen als Daten in `firma.yaml:5,44 ff.,85`. Es fehlen die Punkte unter B7. |
| `PLATZHALTER.md`, `THIRD-PARTY-LICENSES.md` vorhanden und aktuell | bestanden | Unit-Test zur Aktualität grün, `licenses --check` grün |

## 3. Abnahmepunkte Phase 1b (design-system)

| Punkt | Urteil | Beleg |
|---|---|---|
| Build | bestanden | s. o. |
| Unit-Test Kontrastpaare WCAG AA | bestanden | `tests/unit/contrast.test.ts` grün. Die Tabelle im Styleguide zeigt alle Paare ≥ Mindestwert |
| axe 0 Verstöße auf `/` und `/styleguide/` | bestanden | E2E (Desktop und Pixel 7). Eigener Lauf mit wcag2a/aa, 21aa, 22aa und best-practice bei 390 und 1440 px: 0 Verstöße. „Incomplete": nur `color-contrast` wegen Bild-Hintergrund (Blueprint-SVGs) und bei 390 px wegen der horizontal scrollenden Kontrasttabelle (Zellen außerhalb des Sichtbereichs). Beides ist kein Verstoß. |
| Lighthouse Mobile `/` ≥ 95 | bestanden | Performance 100, Accessibility 100, Best Practices 100, SEO 100. LCP 1,2 s, CLS 0, TBT 0 ms |
| Lighthouse `/styleguide/` (Info) | bestanden | 99 / 100 / 100 / SEO 63. Der einzige SEO-Fehler ist `is-crawlable`, gewollt durch `noindex` |
| Screenshots 390 und 1440 px | bestanden | `docs/agent-reports/screenshots/1-qa/qa-{start,styleguide}-{390,1440}.png`, dazu `qa-menue-390.png`, `qa-skiplink-390.png`, `qa-fokus-*.png` |
| Schriften lokal, WOFF2, Subsets, `swap`, Preload von 2 Schnitten, OFL beigelegt | bestanden | 8 WOFF2 unter `dist/client/_astro/fonts/`, genau 2 `<link rel="preload" … as="font">` in `index.html`, OFL in `src/assets/fonts/*/OFL.txt` und `public/fonts/*-OFL.txt`, `display: 'swap'` in `astro.config.mjs:54,67` |
| 5 Logo-Varianten als SVG | bestanden | `src/assets/brand/` (quer, quer-negativ, gestapelt, zeichen, zeichen-negativ), Schrift als Pfade, keine externen Referenzen |
| Keine `style`-Attribute / Inline-Handler | bestanden | E2E grün. `grep -c 'style="'` im gebauten Styleguide = 0. Hinweis: Playwright-Vollseiten-Screenshots setzen selbst leere `style=""` auf Inputs (Cursor ausblenden), das ist ein Messartefakt und kein Befund. |
| Strom-Grün nie als Text auf Hell | bestanden | Laufzeit-Scan aller Textknoten (beide Seiten, beide Breiten): Strom-Grün nur auf `rgb(21,25,30)` („Säule 1–3", „22 kW", Link „zu den Farben"). Im CSS wird Strom nur über `--accent-text` im Dunkel-Scope gesetzt (`src/styles/tokens.css:132`), hell gilt Kabelgrün (`tokens.css:36`) |
| Fokus sichtbar | bestanden | per Tastatur geprüft: Buttons und Links `outline 2px` Graphit plus Strom-Glow (`0 0 0 6px`), Karten über `:focus-within` (Outline + `10px`-Glow, auf Dunkel in Strom), Felder `outline 2px`. Der Skip-Link ist erstes Fokusziel und nach ≤ 100 ms ganz sichtbar (top 12 px), auch mit `reduce` |
| Reduced Motion | bestanden | E2E „Reduzierte Bewegung setzt die Bewegungs-Tokens auf 0" grün, `base.css:291` `scroll-behavior: auto !important` |
| Mobiles Menü | bestanden | E2E grün, selbst angesehen (`qa-menue-390.png`): Vollfläche Graphit, Leitung mit Knoten je Eintrag, CTA auf Strom-Fläche |
| Kein horizontales Scrollen | bestanden | `scrollWidth - clientWidth` = 0 bei 390 und 1440 px (eigene Messung) |
| Design eigenständig, keine Template-Optik | bestanden mit Befund B1 | eigenes Urteil unten |

### Design-Urteil (eigene Sichtung)

- **Eigenständig:** Die durchlaufende Leitung links mit Knoten an jeder Abschnittsüberschrift und dem leuchtenden Endpunkt am Footer-Claim trägt das Motiv „Strom kommt in den Raum" konsequent. Die breite Archivo-Display-Schrift, Plex Mono für Maße und Prüfdaten, die Bemaßungslinie „3,40 m" und die Blueprint-Platzhalter mit Raster und Leitungsführung wirken nach Marke, nicht nach Baukasten. Die Karten haben statt Schatten und Radius eine Leitung mit Punkt als Oberkante. Die Farbverteilung Kalk, Graphit und Strom als Akzent stimmt mit dem Briefing überein.
- **Schwächen:** (1) B1. (2) Auf 390 px sitzen die Leitungsknoten sehr dicht an der Überschrift: etwa 3 px zwischen Knoten und dem „R" von „Renoviert" (`qa-start-390.png`, Ausschnitt geprüft). Das ist Feinschliff (B8). (3) Der Start-Stub wiederholt den Claim in Hero und Footer und ist naturgemäß karg. Das ist für Phase 1 in Ordnung, die eigentliche Startseite folgt in Phase 2/3.

## 4. picomatch-Ausnahme (`scripts/audit-allowlist.json`)

**Urteil: Die Begründung ist tragfähig (belegt). Die Paketangabe ist unvollständig (B5).**

- „Keine gepatchte Version": belegt. Das Advisory gilt für `<=4.0.7`, `npm view picomatch versions` endet bei `4.0.7` (veröffentlicht 24.08.2026).
- „Läuft nur in Build und Dev": belegt. In `dist/server` gibt es keine Fundstelle für `picomatch` oder `extglob`. Zusätzlich habe ich einen Resolve-Hook beim Serverstart mitlaufen lassen (`node --import trace.mjs server/server.mjs`) und `/`, `/nichtda/` und `POST /api/x` aufgerufen. Ergebnis: `NONE`, es wurde also weder picomatch noch anymatch, tinyglobby oder unstorage geladen. `server/*.mjs` enthält kein `glob`.
- Mechanik: `scripts/audit.mjs` lässt nur die exakte GHSA-ID durch, und nur bis zum `bis`-Datum (2026-12-31). Danach schlägt der Audit wieder fehl. Ein neues picomatch-Advisory würde sofort auffallen. Das ist sauber gelöst.
- Alle 17 High-Pakete (astro, vite, vitest, @astrojs/*, tinyglobby, fdir, anymatch, unstorage) haben als einzige Quelle dieses Advisory (`npm audit --json`, Feld `via`).

## 5. Wording- und Gewerke-Stichprobe

- Eigener Scan des gerenderten Texts von `index.html`, `styleguide/index.html` und `404.html` mit den Projektregeln: 0 Treffer. Kein „Meister" außer im Test, keine Kameras, keine Sicherheitstechnik, kein Festpreis, keine Arbeitgeber.
- Gewerke-Matrix `src/content/settings/gewerke.yaml` entspricht den Startwerten aus Briefing 2 (eigen: Koordination, Demontage, Trockenbau, Bodenbelag, Prüfservice DGUV V3. partner: Elektro, Wallbox, Zählerschrank, Fliesen/Bad, Putz/Stuck, Maler). Alle 11 Einträge haben `hinweis_hwk_geprueft: false`, der Launch-Check warnt bei allen 11. Unit-Test `tests/unit/schemas.test.ts:29` prüft die Partner-Werte. **Bestanden.**
- Kennzeichnung an der Leistung: Für Phase 1 nicht verlangt (Seiten folgen in Phase 2), aber siehe B3.

## 6. Befunde

| Nr. | Schwere | Befund (belegt) | Ort | Zuständig |
|---|---|---|---|---|
| **B1** | mittel | Die Desktop-Navigation zeigt den Browser-Standardrahmen von `[popover]` (3 px, Graphit). Gemessen bei 1152 und 1440 px: `border: 3px solid rgb(21, 25, 30)`, `padding: 0`. „Für Zuhause" stößt links direkt an den Rahmen. Der Mobil-Zweig setzt `border: 0` (`Header.astro:144`), der Desktop-Zweig nicht. Der Fehler ist auch im eigenen Screenshot `screenshots/1/design-system-styleguide-1440.png` sichtbar, wurde dort aber nicht bemerkt. Fix: `border: 0` (und ggf. `margin: 0; inset: auto`) im Desktop-Block. | `src/components/layout/Header.astro:251-268` | design-system |
| **B2** | mittel | `npm start` lädt `.env` nicht. Laut `CLAUDE.md:7` braucht `npm start` eine `.env`, aber `package.json` (`"start": "node server/server.mjs"`) und `server/server.mjs:16` (`parseEnv()` aus `process.env`) lesen die Datei nie ein. Mit vollständiger `.env` bricht der Server mit „ALTCHA_HMAC_KEY: fehlt …" ab. Der Launch-Check dagegen liest `.env` (`scripts/lib/launch-check.mjs:102`). Damit kann der Launch-Check grün sein, während der Server nicht startet. Fix: z. B. `"start": "node --env-file-if-exists=.env server/server.mjs"` oder `process.loadEnvFile` in `server/env.mjs`, dazu ein Test. | `package.json` (Script `start`), `server/server.mjs:16`, `CLAUDE.md:7` | architect |
| B3 | mittel (vor Launch hoch) | Partner-Gewerke werden ohne „Ausführung durch unseren Meister-Partnerbetrieb" beworben. Start-Stub: „Modernisierung aus einer Hand" mit „Elektrik … Fliesen und Bad, Malerarbeiten" sowie „Wallbox-Installation, … Zählerschrank". Styleguide: „Elektrik, Trockenbau, Boden und Wände aus einer Hand." und „einen Ansprechpartner für alle Gewerke". Keine Komponente ruft `partnerHinweis()` auf. Die Funktion hat keinen Unit-Test (`grep partnerHinweis tests` = 0). Der Styleguide wird auch im Produktions-Build ausgeliefert (nur `noindex`, `astro.config.mjs:86-87`). | `src/pages/index.astro:13,19,23`, `src/pages/styleguide/index.astro:40,41,169,173`, `src/lib/content/index.ts:25` | page-builder (Stub ersetzen, Hinweis rendern), design-system (Styleguide-Texte), architect (Test für `partnerHinweis`, Styleguide aus Produktions-Build nehmen oder in `check:launch` aufnehmen) |
| B4 | niedrig | Wording-Scan hat Lücken. Selbst geprüft mit `scanText()`, ohne Treffer bleiben: „Kamera-Installation", „Bester Service in Schweinfurt", „beste Qualität zum fairen Preis", „Garantierter Festpreis", „Einbruchschutz und Sicherheitssysteme", „Top 1 Anbieter". Die Kamera-Regel greift nur bei Komposita (Überwachungs-, Video- usw.). Die Superlativ-Regel greift nur nach Artikel oder „unser". | `scripts/lib/wording.mjs:17-27` | architect |
| B5 | niedrig | Die Paketangabe der Audit-Ausnahme ist unvollständig: „über astro, vite, tinyglobby, @astrojs/*". Es fehlen `vitest` und der Pfad `unstorage → anymatch → picomatch@2.3.2`. Die Begründung bleibt richtig, unstorage wird zur Laufzeit nicht geladen (`session: false`, Trace oben). | `scripts/audit-allowlist.json:4` | architect |
| B6 | niedrig | Zwei Lizenzausnahmen ohne Betreiber-Freigabe: `lightningcss*` (MPL-2.0, Build-Werkzeug von Vite 8) und `y-provider` (ohne Lizenzangabe, Keystatic dev). Sie gehören nicht zu den vier freigegebenen (Plan Frage 4). Der Check läuft trotzdem grün durch und gibt nur einen Hinweis aus. | `scripts/licenses.mjs:29-30`, `THIRD-PARTY-LICENSES.md:18-19` | Orchestrator → Betreiber (Freigabe), architect |
| B7 | niedrig | In `CLAUDE.md` fehlen gegenüber `UEBERGABE.md`: (a) Verweis auf den freigegebenen Plan `docs/UMSETZUNGSPLAN.md` (Phasen, Agenten-Briefings), (b) die Cloud-Umgebung mit den 15 freigegebenen Hosts (für Agenten wichtig: welche Doku-Hosts erreichbar sind), (c) die freigegebenen Lizenz-Ausnahmen GSAP, libheif, sharp und axe-core in Kurzform (bisher nur „Ausnahmen in `scripts/licenses.mjs`"). `UEBERGABE.md` existiert noch und ist laut eigenem Text nach Phase 1 zu löschen. | `CLAUDE.md`, `docs/UEBERGABE.md:3` | architect, Orchestrator (Löschen) |
| B8 | Hinweis | Bei 390 px liegen zwischen Leitungsknoten und Überschrift etwa 3 px Abstand („Renoviert", „Drei Säulen"). Das wirkt gedrängt. | Layout/Section, `qa-start-390.png` | design-system |

Vermutungen (nicht als Befund gewertet): keine.

## 7. Nicht prüfbar

| Punkt | Grund |
|---|---|
| Live-Header vom öffentlichen Produktionsserver | Es gibt kein Deployment. `raumstrom.de` ist laut Übergabe nicht registriert. `curl -I https://raumstrom.de/` → `CONNECT tunnel failed, response 403` (Host nicht freigegeben). Geprüft habe ich stattdessen den lokalen Produktionsserver (`dist` + `server/server.mjs`) per curl, siehe Abschnitt 2. Observatory A+ erst nach Deployment (Plan Risiko 5). |
| CI-Lauf auf GitHub | Nur die Workflow-Datei ist geprüft, kein Actions-Lauf eingesehen. |
| Lighthouse über HTTPS | Lokal nur über HTTP gemessen. Best Practices ist trotzdem 100. |
| Briefing 12: ZAP, Kontaktformular-/Planer-E2E, WebGL-Fallback, alle Inhaltsseiten, Docs vollständig | Gehören zu späteren Phasen. |

## Screenshots (eigene)

`docs/agent-reports/screenshots/1-qa/`: `qa-start-390.png`, `qa-start-1440.png`, `qa-styleguide-390.png`, `qa-styleguide-1440.png`, `qa-menue-390.png`, `qa-skiplink-390.png`, `qa-fokus-1-1440.png`, `qa-fokus-3-1440.png`, `qa-fokus-7-1440.png`, `qa-fokus-Modernisieren-1440.png`, `qa-fokus-Unterverteilung-1440.png`, `qa-fokus-Leistungen-ansehen-1440.png`, `qa-fokus-feld-name-1440.png`.
