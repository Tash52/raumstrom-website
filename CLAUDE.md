# RAUMSTROM-Website · Projektwissen für Agenten (max. 80 Zeilen, Pflege: `architect`)

Astro 7.4 (statisch) + Node-Server nur für `/api/*`, React-Inseln, zod 4, Keystatic (nur dev). Node ≥ 22.23.4. Regeln: `docs/AGENTEN-REGELN.md`.

## Befehle
- `npm ci` · `npm run dev` (http://localhost:4321, Keystatic unter `/keystatic`)
- `npm run build:staging` (Platzhalter erlaubt) · `npm run build` (bricht ab, solange `check:launch` offen ist) · `npm start` (dist + Header, braucht `.env`)
- `npm test` (Vitest + Hook-Test) · `npm run test:e2e` (Playwright gegen `dist`, vorher `build:staging`) · `npm run check` (Typen)
- `npm run check:launch` · `npm run platzhalter` (schreibt `PLATZHALTER.md`, nach Inhaltsänderungen ausführen, Test prüft Aktualität)
- `npm run scan:wording` · `npm run licenses [-- --check]` · `npm run trend-schema [-- --check]` · `npm run audit`

## Ordner (Besitzer)
- `src/lib/schemas/` zod je Inhaltstyp, `src/lib/content/` Lesezugriff, `src/content.config.ts`, `src/content/settings/`, `keystatic.config.ts`, `server/`, `scripts/`, Test-/CI-Konfiguration: architect
- `src/styles/`, `src/layouts/`, `src/components/base/`, `src/components/layout/` (Header, Footer, Skip-Link; page-builder darf erweitern), `src/assets/{brand,fonts}/`: design-system
- `src/pages/`, `src/components/sections/`: page-builder · `src/pages/api/`, `src/lib/{security,mail}/`: backend-api
- `src/content/*` (außer settings): content-writer / legal-compliance / trend-researcher · `src/islands/`: motion-3d, planner-*
- `tests/unit/*.test.ts`, `tests/e2e/*.spec.ts`: je Agent eigene Dateien

## Collections (`astro:content`, Schemas in `src/lib/schemas/<name>.ts`)
- `firma` · `src/content/settings/firma.yaml`: name, rechtsform, firmierung, claim, gesellschafter[name, vertretungsberechtigt], adresse{strasse, plz, ort, land}, kontakt{telefon (+49…), telefon_anzeige, email, anfragen_empfaenger}, steuer{ust_idnr, w_idnr}, handwerk{kammer, kammer_anschrift, eintragung, berufsbezeichnung, staat_verleihung, berufsrecht_url}, versicherung{art, versicherer, anschrift, geltungsraum}, redaktion{name, anschrift}, einzugsgebiet{beschreibung, orte[name, slug, landkreis, bestaetigt]}, erreichbarkeit[tage, zeiten], social[plattform, url], domain
- `features` · `features.yaml`: floorplan_ai, bewertungen_anzeigen, referenzen_anzeigen, ratgeber_anzeigen, consent_manager
- `gewerke` · `gewerke.yaml`: gewerke[id, name, ausfuehrung eigen|partner, hinweis_hwk_geprueft]
- `pages` `pages/*.md`: titel, meta_title ≤60, meta_description ≤155, abschnitte[id, label?, titel, text], entwurf
- `leistungen` `leistungen/*.md`: titel, meta_title, meta_description, kurzbeschreibung, saeule (modernisieren|elektrifizieren|sicher-betreiben), zielgruppen[zuhause|unternehmen], gewerke[ids], ablauf[titel, text], faq[ids], reihenfolge, entwurf
- `faq` `faq/*.yaml`: frage, antwort, leistungen[ids], reihenfolge
- `ratgeber` `ratgeber/*.md`: titel, meta_title, meta_description, autor (team-id), veroeffentlicht, aktualisiert, leistungen[ids], quellen[titel, url], entwurf
- `referenzen` `referenzen/*.md`: titel, ort, jahr, leistungen[ids], kurzbeschreibung, bilder[src (image), alt], illustrativ (sichtbar kennzeichnen), entwurf
- `regionen` `regionen/*.md`: ort, meta_title, meta_description, besonderheiten, anfahrt, referenzen[ids], entwurf; Seite nur bei entwurf:false und eigenem Inhalt
- `team` `team/*.yaml`: name, rolle, kurztext, foto? (`src/assets/team/`), foto_alt, reihenfolge
- `trends` `trends/*.json` (ohne `_schema.json`): name, beschreibung, gueltig_ab, saison, trend_quelle_notiz, aktiv, wandfarben[name, hex], putz_tapete, boden, fliesen?, deckenlicht, elektro_vorschlag
- `legal` `legal/<seite>.md`: titel, seite (impressum|datenschutz|agb|widerruf|cookie-einstellungen|barrierefreiheit), stand, entwurf (Standard true) + Kopfvermerk `<!-- ENTWURF – … -->`
- Defaults: `entwurf: true`. Entwürfe nie veröffentlichen. Neue Felder: Schema + Keystatic + CLAUDE.md (architect), `tests/unit/keystatic.test.ts` prüft Gleichlauf.

## Schnittstellen
- `import { getFirma, getFeatures, getGewerke, getGewerk, partnerHinweis, isPlaceholder } from '<rel>/lib/content/index.ts'`. Firmendaten (Impressum, Footer, Kontakt, Schema.org, Mails) nur hierüber.
- `partnerHinweis(ids)` → „Ausführung durch unseren Meister-Partnerbetrieb" oder null; unbekannte IDs brechen den Build.
- Schemas: `import { leistungSchema, … } from '<rel>/lib/schemas/index.ts'` (Client und Server gleich). Bilder: `teamSchema(image())`.
- API-Routen: `src/pages/api/*.ts` mit `export const prerender = false`. Secrets: `getServerEnv()` aus `server/env.mjs` (ALTCHA_HMAC_KEY, CSRF_SECRET, SMTP_*, MAIL_FROM; `.env.example`). Ohne Pflicht-Secrets startet der Server nicht.
- Header/CSP: `server/headers.mjs`, `server/csp.mjs`. Astro schreibt die Seiten-CSP (Hashes) nach `dist/_headers.json`, der Server sendet sie als Header.
- `'wasm-unsafe-eval'` nur auf `/raumplaner/` und `/planer/ansehen`: dort `Astro.csp?.insertScriptResource("'wasm-unsafe-eval'")`. Worker/blob: ebenso nur seitenweise.
- Schriften: Astro-Fonts-API mit `fontProviders.local()` in `astro.config.mjs` (Block `fonts` ergänzt design-system).

## Konventionen
- Keine CDN-/Fremd-Hosts, nirgends (Test: 0 Fremd-Requests). Draco-/Basis-/KTX2-Decoder, meshopt, pdf.js-Worker, Schriften (auch für drei `<Text font>`) und HDRs (`<Environment files="/hdr/…">` statt `preset`) liegen lokal unter `public/`.
- CSP ohne `'unsafe-inline'`: keine `style`-Attribute, keine `on*`-Handler, kein Inline-`<script>` außer von Astro gebündelt; dynamische Werte über Klassen, CSS-Variablen per Stylesheet oder `element.style` aus gebündeltem JS.
- Seitenübergänge: native View Transitions (`@view-transition { navigation: auto; }`), kein `<ClientRouter />`.
- Astro 7: Rust-Compiler verlangt gültiges HTML; `compressHTML: 'jsx'` entfernt Leerraum zwischen Elementen, nötige Leerzeichen als `{" "}`.
- URLs mit Schrägstrich am Ende (`/leistungen/trockenbau/`), der Server leitet um. Keine Daten-URIs (CSP `img-src 'self'`).
- Platzhalter: `[[PLATZHALTER: Beschreibung]]`. Wording: nur „Meister-Partnerbetrieb", kein Meister/Innung/Fachbetrieb/Sicherheitstechnik/Kameras/Superlative/Festpreis-Garantie (`scan:wording` bricht den Build ab).
- Strom-Grün `#C5F01E` nie als Text auf hellem Grund; grüne Schrift = Kabelgrün `#3D6300`.
- Abhängigkeiten exakt pinnen (`.npmrc` save-exact, ignore-scripts), nur MIT/Apache/BSD/ISC, Ausnahmen in `scripts/licenses.mjs` → `THIRD-PARTY-LICENSES.md`. Audit-Ausnahmen mit Ablaufdatum in `scripts/audit-allowlist.json`.

## Agenten-Setup
- 17 Agenten in `.claude/agents/`, geprüfte Skill-Kopien in `.claude/skills/` (frontend-design, 12× threejs-*, je `QUELLE.md`), Audit: `docs/SKILL-AUDIT.md`.
- Hook `.claude/hooks/agent-guard.mjs` (kein Push durch Subagenten, Prüf-Agenten schreiben nur `docs/`); Test `node --test .claude/hooks/agent-guard.test.mjs` (in `npm test` und CI).
- Offen: SEO-Skills aus `AgriciDaniel/claude-seo` @ `468ed5b` (seo-local, seo-schema, seo-technical) erst zu Beginn von Phase 7 vollständig lesen, angepasst kopieren, in `seo-specialist.md` eintragen (Anpassungen: `docs/agent-reports/0-skill-auditor-c-security-seo.md`).
- CI: `.github/workflows/ci.yml` (Wording, Lizenzen, Typen, Unit, Audit, Build-Abbruch, Staging-Build, E2E), Dependabot wöchentlich.
