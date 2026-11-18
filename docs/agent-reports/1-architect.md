# Phase 1a · architect · Bericht

Stand: 18.11.2026 · Hauptcheckout, nichts committet.

## Ergebnis
Lauffähiges Astro-7-Gerüst mit Schemas, Settings, Keystatic (nur dev), Header-Server mit Hash-CSP, Launch-Check, Wording-Scan, Lizenz-/Audit-/Trend-Skripten, Vitest, Playwright, CI und Dependabot. `CLAUDE.md` (57 Zeilen) ist der Vertrag für die folgenden Agenten.

## Versionen (exakt gepinnt, `package-lock.json`)
astro 7.4.12, @astrojs/node 11.1.13, @astrojs/react 7.1.9, @astrojs/sitemap 3.7.5, react/react-dom 19.3.1, zod 4.6.7 (identisch mit Astros zod, dedupliziert), yaml 2.9.1. Dev: @keystatic/astro 6.0.0, @keystatic/core 0.6.10, typescript 6.0.3, @astrojs/check 0.9.12, vitest 5.1.1, @playwright/test 1.63.0, @types/node 22.20.5, @types/react(-dom) 19.3.0.
- typescript 6 statt 7.0.2: `@astrojs/check` verlangt `^5 || ^6`.
- @playwright/test 1.63.0 statt 1.65.1: passt zu den vorinstallierten Browsern (`/opt/pw-browsers`, chromium-1243); CI installiert passend per `npx playwright install`.
- `.npmrc`: save-exact, engine-strict, ignore-scripts (einziges Paket mit Install-Skript ist `fsevents`, macOS, optional).

## Geprüfte APIs (gegen Doku bzw. Typdefinitionen in node_modules)
- Content Collections (`glob()`-Loader, `astro/zod` = zod 4), `security.csp` (directives, Hashes, `Astro.csp.insert*`), Node-Adapter (`mode: 'middleware'`, `staticHeaders`), Keystatic-Astro-Integration (injiziert `/keystatic/[...params]`, `/api/keystatic/[...params]`), Keystatic-Felder (`fields.markdoc({ extension: 'md' })`), zod 4 (`z.toJSONSchema`, `z.email`, `z.iso.date`).
- Quellen: withastro/docs (raw GitHub), keystatic.com/docs, `node_modules/astro/dist/types/public/config.d.ts`, `@astrojs/node/dist/*`, `@keystatic/astro/dist/*`.

## Dateien
- Konfiguration: `package.json`, `package-lock.json`, `.npmrc`, `astro.config.mjs`, `tsconfig.json`, `.gitignore`, `.env.example`, `vitest.config.ts`, `playwright.config.ts`
- Schemas: `src/lib/schemas/{shared,firma,features,gewerke,team,leistung,faq,ratgeber,referenz,region,trend,legal,seite,index}.ts` (Node-Type-Stripping-fähig, Importe mit `.ts`)
- `src/content.config.ts` (12 Collections), `src/lib/content/index.ts` (`getFirma`, `getFeatures`, `getGewerke`, `getGewerk`, `partnerHinweis`, `isPlaceholder`)
- `src/content/settings/{firma,features,gewerke}.yaml`, `src/content/trends/_schema.json` (generiert), `.gitkeep` in den leeren Content-Ordnern
- `keystatic.config.ts` (3 Singletons, 9 Collections, lokaler Modus)
- `server/{server,env,headers,csp,static}.mjs`
- `scripts/{astro,check-launch,wording-scan,licenses,trend-schema,audit}.mjs`, `scripts/lib/{files,wording,launch-check}.mjs`, `scripts/audit-allowlist.json`
- Tests: `tests/unit/{schemas,wording,launch-check,server,keystatic,licenses}.test.ts`, `tests/e2e/security.spec.ts`
- `.github/workflows/ci.yml` (Actions per Commit-SHA gepinnt), `.github/dependabot.yml`
- `CLAUDE.md`, `PLATZHALTER.md` (generiert), `THIRD-PARTY-LICENSES.md` (generiert)
- Stubs für design-system/page-builder: `src/styles/{tokens,base}.css`, `src/layouts/BaseLayout.astro`, `src/components/base/.gitkeep`, `src/pages/{index,404}.astro`

## Wichtige Entscheidungen
- **CSP als echter Header:** `staticHeaders: true` → Astro schreibt die Seiten-CSP mit Hashes nach `dist/_headers.json` (kein `<meta>`). `server/server.mjs` sendet sie pro Seite, ergänzt Pflicht-Direktiven und verweigert den Start bei `'unsafe-inline'`/`'unsafe-eval'` (`finalizePolicy`). Alles ohne Seiten-Policy (Assets, API, Fehler) bekommt `default-src 'none'`-Fallback. Folge: Ohne `server/server.mjs` gibt es keine CSP; Deployment muss über diesen Server laufen.
- **Header:** HSTS (2 Jahre, includeSubDomains, ohne preload), nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy (nur von Chromium erkannte Features, sonst Konsolenfehler), COOP/CORP same-origin, Origin-Agent-Cluster, X-Permitted-Cross-Domain-Policies.
- **Statische Auslieferung selbst gebaut** (Middleware-Modus liefert keine Dateien): kein Verlassen von `dist/client`, keine Dotfiles außer `/.well-known/`, 308 auf Schrägstrich, ETag/304, `_astro/` immutable, HTML no-cache, nur GET/HEAD; `/api/*` → Astro-Handler; `/keystatic*` und `/api/keystatic*` immer 404; `/healthz` für Docker.
- **Fail-secure:** `server/env.mjs` (zod) verlangt ALTCHA_HMAC_KEY (≥32), CSRF_SECRET (≥32), SMTP_HOST/PORT/USER/PASS, MAIL_FROM; Platzhalter-Werte (PLATZHALTER, change-me, example …) zählen als fehlend. Werte werden nie ausgegeben (getestet).
- **Keystatic nur dev:** eigene Integration prüft Astros `command === 'dev'` (argv ist unzuverlässig, der Dev-Server läuft ohne TTY als Daemon). In dev wird CSP abgeschaltet, weil die Keystatic-Oberfläche Inline-Styles/Skripte braucht; laut Astro-Doku wirkt CSP in dev ohnehin nicht. Im Browser geprüft: Dashboard, Firmendaten, Gewerke-Matrix, Stilpakete laden ohne Konsolenfehler.
- **`trailingSlash: 'ignore'`** statt `'always'`: Mit `'always'` liefern die Keystatic-Routen 404. Kanonische URLs mit Schrägstrich erzwingt der Server (308).
- **gewerke.yaml** hat einen Schlüssel `gewerke:` um die Liste (Keystatic-Singletons speichern Objekte, keine Top-Level-Liste). Felder wie im Briefing.
- **Rechtstexte:** Entwurf = Frontmatter `entwurf: true` (Default) **oder** Kommentar `<!-- ENTWURF`. Beides wird geprüft, weil Keystatic HTML-Kommentare beim Speichern verlieren kann.
- **Neun Orte** in `firma.yaml` mit `bestaetigt: false` (Entwurf); Launch-Check listet jeden. Regionalseiten entstehen erst mit eigenem Inhalt in `regionen/*.md` und `entwurf: false`.
- **Gesellschafter-Namen** als Platzhalter mit Namenshinweis, weil das Impressum die exakten Namen laut Gesellschaftsvertrag braucht.
- **Wording-Scan** (`scripts/lib/wording.mjs`): scannt `src/` und `public/`. Erlaubt: „Meister-Partnerbetrieb…", „meisterpflichtig…". Verboten: jedes andere „meister…", „innung…", „…fachbetrieb…", „zertifizierte(r) … Betrieb/Elektriker…", Sicherheitstechnik, Alarmanlagen, Überwachungs-/Video-Kameras, Superlative (günstigste, „der/die beste", Nr. 1, Marktführer, führende), Festpreis-Garantie. Bewusst nicht verboten: „am besten", „Kamera" allein (3D-Planer-Bedienung). Keine Ausnahme-Kommentare im Text möglich.
- **Launch-Check:** Schemafehler sind immer fatal; offene Punkte (Platzhalter, fehlende/Entwurfs-Rechtstexte, HWK-Prüfung je Gewerk, unbestätigte Orte, fehlende Secrets aus Umgebung oder `.env`, MISTRAL_API_KEY bei aktivem floorplan_ai) brechen `npm run build` ab, `--allow-placeholders` nur Warnung. `PLATZHALTER.md` wird daraus generiert (ohne Umgebungsvariablen, die je Rechner verschieden sind); ein Unit-Test prüft, dass sie aktuell ist.
- **Telemetrie aus:** `scripts/astro.mjs` startet die Astro-CLI mit `ASTRO_TELEMETRY_DISABLED=1` (plattformunabhängig).
- `assetsInlineLimit: 0` (keine Daten-URIs), `markdown.syntaxHighlight: false` (Shiki = Inline-Styles), `session: false`, `security.checkOrigin: true`, Node-Adapter `bodySizeLimit` 25 MB.

## Tests (selbst ausgeführt, nach `rm -rf node_modules && npm ci`)
| Befehl | Ergebnis |
|---|---|
| `npm run build:staging` | ok (Wording-Scan, Launch-Check mit 55 offenen Punkten als Warnung, Astro-Build) |
| `npm run build` | bricht wie gefordert mit Exit 1 und der Liste ab |
| `npm test` | Vitest 75/75 grün (6 Dateien), Hook-Test 7/7 grün |
| `npm run test:e2e` | Playwright 24/24 grün (Desktop Chrome + Pixel 7): Startseite 200, alle Header, CSP nur `'self'` + Hashes, kein `unsafe-inline`, kein style-/on*-Attribut, Crawl mit 0 Fremd-Requests und 0 Konsolenfehlern, `/keystatic`, `/keystatic/`, `/keystatic/singleton/firma`, `/api/keystatic`, `/api/keystatic/tree` → 404 (GET und POST), Build enthält kein Keystatic, Pfad-Tricks → 404, POST auf Seite → 405 |
| `npm run check` | 0 Fehler, 0 Warnungen |
| `npm run licenses -- --check` | ok, 557 Pakete |
| `npm run trend-schema -- --check` | aktuell |
| `npm run audit` | ok mit 1 dokumentierter Ausnahme (siehe Risiken); reines `npm audit`: 17 × high, 0 critical |
| Manuell | Server ohne Secrets → Exit 1; Keystatic in dev im Browser; ungültiges Trend-JSON bricht den Build ab; `_schema.json` wird nicht als Trend geladen; zur Laufzeit lädt der Server kein picomatch (Modul-Trace) |
| Drift-Test | `tests/unit/keystatic.test.ts` schlägt bei umbenanntem Keystatic-Feld fehl (geprüft) |

## Offen
1. **npm audit:** `GHSA-fc5q-39xc-vjpf` (picomatch ≤ 4.0.7, ReDoS, high) steckt in astro, vite, tinyglobby, @astrojs/*. Es gibt **keine gepatchte Version**. Damit ist „`npm audit` ohne High" mit Astro derzeit nicht erreichbar. Lösung: `npm run audit` akzeptiert nur Einträge aus `scripts/audit-allowlist.json` mit Begründung und Ablaufdatum (2026-12-31). Braucht Bestätigung durch Orchestrator/Betreiber.
2. **Neue Lizenz-Ausnahmen, Freigabe offen:** `lightningcss*` (MPL-2.0, von Vite 8, nur Build, nicht ausgeliefert) und `y-provider` (ohne Lizenzangabe, Abhängigkeit von Keystatic, nur lokal in dev).
3. **Keystatic zeigt `_schema.json`** in „Stilpakete" als Eintrag „_schema" an (Pfad laut Briefing). Speichern würde die Datei überschreiben; `npm run trend-schema -- --check` in CI würde das melden. Alternative: Schema nach `src/content/trends.schema.json` verlegen (Briefing-Änderung, braucht Freigabe).
4. `public/.well-known/security.txt` (Briefing 8) nicht angelegt, `public/` liegt nicht in meinem Auftrag.
5. design-system ergänzt in `astro.config.mjs` den Block `fonts` (Fonts-API, `fontProviders.local()`); das ist in `CLAUDE.md` als Schnittstelle vermerkt.
6. `docs/UEBERGABE.md` ist in `CLAUDE.md` übernommen und kann gelöscht werden (macht der Orchestrator).

## Risiken
- Der Launch-Check verlangt die Server-Secrets schon beim Produktions-Build (Briefing 11.6). Ein Produktions-Build ist damit nur auf einer Maschine mit gefüllter `.env` möglich; CI baut Staging und prüft, dass `npm run build` abbricht.
- E2E läuft gegen die Ausgabe von `build:staging`. Der Astro-Build ist identisch mit `build`, nur der Launch-Check ist gelockert.
- `npm run dev` ohne Terminal (Agenten, CI) startet Astro 7 als Hintergrund-Daemon; stoppen mit `node node_modules/astro/bin/astro.mjs dev stop`.
- Keystatic-Formulare validieren weniger streng als zod (z. B. Hex-Farben, Pflichttexte in verschachtelten Objekten). Fehler fallen beim Build mit klarer Meldung auf, nicht beim Speichern.

---

## Nacharbeit aus der QA-Abnahme (`docs/agent-reports/1-qa-verifier.md`), Stand bfb65a7

| Befund | Änderung | Test |
|---|---|---|
| **B2** `npm start` liest `.env` nicht | `server/env.mjs`: `readDotEnv()` (Nodes eigener Parser `util.parseEnv`, gleiche Regeln wie `node --env-file`) und `loadDotEnv()`. Der Server lädt `.env` aus dem Projektstamm bzw. `RAUMSTROM_ENV_FILE`, echte Umgebungsvariablen haben Vorrang. Der Launch-Check nutzt jetzt dieselbe Funktion (eigener Parser entfernt). `CLAUDE.md` angepasst. | `tests/unit/env-file.test.ts` (Parser, Vorrang, Launch-Check sieht dieselben Werte); `tests/unit/production-build.test.ts` startet den Server nur mit Secrets aus einer `.env` |
| **B4** Lücken im Wording-Scan | `scripts/lib/wording.mjs`: jedes „…kamera…" (auch im Planer; dort „Ansicht"), Videoüberwachung, CCTV, Alarm…, Sicherheitssystem…, Einbruch…; Superlative auch ohne Artikel („Bester", „beste Qualität", „bestes"), ausgenommen „am/aufs/zum besten", dazu erstklassig, unschlagbar, konkurrenzlos, unübertroffen, einzigartig, „höchste Qualität", „Top 1/Top-Anbieter"; Festpreis: Preisgarantie, „garantierter Festpreis", „Festpreis (mit/inkl.) Garantie", „Festpreis garantiert". „Meister-Partnerbetrieb" und „meisterpflichtig" bleiben erlaubt. | `tests/unit/wording.test.ts`: 13 erlaubte und 31 verbotene Beispiele (u. a. alle QA-Beispiele außer „Top 1 Anbieter" jetzt ebenfalls erkannt), Repo-Scan sauber |
| **B5** Paketliste picomatch-Ausnahme | `scripts/audit-allowlist.json`: picomatch@4.0.7 über astro, vite, vitest, tinyglobby, fdir, @astrojs/internal-helpers (→ @astrojs/node, @astrojs/react) und picomatch@2.3.2 über astro → unstorage → anymatch; Begründung um den Laufzeit-Trace ergänzt. | `npm run audit` ok |
| **B3** (architect-Teil) Test `partnerHinweis` | Reine Funktionen in `src/lib/content/gewerke.ts` (`findGewerk`, `partnerGewerke`, `kennzeichnung`); `partnerHinweis()` nutzt sie, neu `getPartnerGewerke()` für die Nennung der Gewerke. | `tests/unit/gewerke.test.ts` (Wortlaut, Partner/eigen, Umstellen in der Matrix, unbekannte IDs brechen ab) |
| **B3** Styleguide im Produktions-Build | `scripts/astro.mjs` kennt `--staging` (setzt `RAUMSTROM_STAGING=1`), `build:staging` nutzt es. Integration `stagingOnlyPages()` in `astro.config.mjs` löscht `/styleguide/` nach jedem Build ohne `--staging`. Dev und Staging (und damit die E2E-Tests von design-system) behalten ihn. `src/pages/styleguide/` unverändert. | `tests/unit/production-build.test.ts`: echter Build ohne `--staging` nach `.astro/prod-build-test`, Datei fehlt, Server liefert `/styleguide/` 404 und `/` 200 |
| **B7** `CLAUDE.md` | Verweis auf `docs/UMSETZUNGSPLAN.md`, Netz der Cloud-Umgebung mit den 15 freigegebenen Hosts, Kurzliste der Lizenz-Ausnahmen (freigegeben: GSAP, libheif/heic-to, sharp/libvips, axe-core; vorläufig: lightningcss, y-provider). Einen Satz zu `UEBERGABE.md` enthielt `CLAUDE.md` nicht (er stand nur in diesem Bericht, Punkt „Offen 6"; erledigt durch den Orchestrator). 58 Zeilen. | `wc -l` |

Ergebnisse: `npm test` 148/148 (10 Dateien) + Hook 7/7 · `npm run build:staging` ok (mit `/styleguide/`) · `npm run build` Exit 1 (Launch-Check) · `npm run test:e2e` 44 passed, 2 skipped (gewollt, design-system) · `npm run check` 0/0/0 · `npm run audit` ok · `npm run licenses -- --check` ok.

Hinweis: Der Produktions-Build-Test baut einmal vollständig (etwa 3 s) und belegt Port 4398. Den Wortlaut „Kamera" dürfen auch Planer-Oberflächen nicht verwenden (Code-Bezeichner wie `camera` sind englisch und nicht betroffen).
