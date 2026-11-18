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
