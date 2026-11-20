# RAUMSTROM-Website · Projektwissen für Agenten (max. 80 Zeilen, Pflege: `architect`)

Astro 7.4 (statisch) + Node-Server nur für `/api/*`, React-Inseln, zod 4, Keystatic (nur dev). Node ≥ 22.23.4. Regeln: `docs/AGENTEN-REGELN.md`. Freigegebener Plan (Phasen, Agenten-Briefings, Entscheidungen): `docs/UMSETZUNGSPLAN.md`.
Cloud-Umgebung: Netz nur npm/PyPI/GitHub (lesen) plus 15 freigegebene Hosts (Plan Abschnitt 6, Frage 2): docs.astro.build, threejs.org, r3f.docs.pmnd.rs, drei.docs.pmnd.rs, keystatic.com, altcha.org, gsap.com, docs.mistral.ai, www.gesetze-im-internet.de, ambientcg.com, api.polyhaven.com, dl.polyhaven.org, rdap.denic.de, rdap.verisign.com, cloudflare-dns.com.

## Befehle
- `npm ci` · `npm run dev` (http://localhost:4321, Keystatic unter `/keystatic`)
- `npm run build:staging` (Platzhalter erlaubt, enthält `/styleguide/`; `npm run build` entfernt ihn) · `npm run build` (bricht ab, solange `check:launch` offen ist) · `npm start` (dist + Header; liest `.env` im Projektstamm, echte Umgebungsvariablen haben Vorrang, wie beim Launch-Check)
- `npm test` (Vitest + Hook-Test) · `npm run test:e2e` (Playwright gegen `dist`, vorher `build:staging`; startet Mailpit per Docker aus `compose.test.yml`, STARTTLS mit Wegwerf-Zertifikat; `E2E_MAILPIT=extern` nutzt ein laufendes Mailpit auf 127.0.0.1:1025/8025, Postfach http://127.0.0.1:8025; je Lauf freier Port, eigene Lauf-ID und Kopie von `dist`, `E2E_PORT`/`E2E_DIST` überschreiben; während E2E- und Prüfläufen nicht im selben Checkout bauen) · `npm run check` (Typen)
- `npm run check:launch` · `npm run platzhalter` (schreibt `PLATZHALTER.md`, nach Inhaltsänderungen ausführen, Test prüft Aktualität)
- `npm run scan:wording` · `npm run licenses [-- --check]` · `npm run trend-schema [-- --check]` · `npm run audit`

## Ordner (Besitzer)
- `src/lib/schemas/` zod je Inhaltstyp, `src/lib/content/` Lesezugriff, `src/content.config.ts`, `src/content/settings/`, `keystatic.config.ts`, `server/`, `scripts/`, Test-/CI-Konfiguration: architect
- `src/styles/`, `src/layouts/`, `src/components/base/`, `src/components/layout/` (Header, Footer, Skip-Link; page-builder darf erweitern), `src/assets/{brand,fonts}/`: design-system
- `src/pages/`, `src/components/sections/`: page-builder · `src/pages/api/`, `src/lib/{security,mail}/`: backend-api
- `src/content/*` (außer settings): content-writer / legal-compliance / trend-researcher · `src/islands/`: motion-3d, planner-*
- `tests/unit/*.test.ts`, `tests/e2e/*.spec.ts`: je Agent eigene Dateien

## Collections (`astro:content`, Schemas in `src/lib/schemas/<name>.ts`)
- `firma` · `src/content/settings/firma.yaml`: name, rechtsform, firmierung, claim, gesellschafter[name, vertretungsberechtigt], register{art, gericht, nummer} (leer = nicht eingetragen), adresse{strasse, plz, ort, land}, kontakt{telefon (+49…), telefon_anzeige, email, anfragen_empfaenger}, steuer{ust_idnr, w_idnr}, handwerk{kammer, kammer_anschrift, eintragung, berufsbezeichnung, staat_verleihung, berufsrecht_url}, versicherung{art, versicherer, anschrift, geltungsraum}, redaktion{name, anschrift}, einzugsgebiet{beschreibung, orte[name, slug, landkreis, bestaetigt]}, erreichbarkeit[tage, zeiten], social[plattform, url], domain
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
- `partnerHinweis(ids)` → bei genau einem Partner-Gewerk „Ausführung durch unseren Meister-Partnerbetrieb", bei mehreren „Ausführung durch unsere Meister-Partnerbetriebe", sonst null (Text nie fest verdrahten), `getPartnerGewerke(ids)` nennt die Gewerke; unbekannte IDs brechen den Build. Pflicht an jeder Leistung mit Partner-Gewerk.
- Rechtstexte: `renderRechtstext(entry)` (index.ts) bzw. rein `renderMitFirma(htmlOderMd, { firma, features })` aus `lib/content/rechtstext.ts`, Ausgabe per `set:html`. Syntax: `{{firma.<pfad>}}`, `{{firma.gesellschafter.*.name}}`, `{{firma.vertretungsberechtigte}}`, Block `<!-- wenn firma.x|features.y -->…<!-- /wenn -->` (keine Verschachtelung). Escaped, E-Mail/Telefon/`_url` als Link, Platzhalter bleiben sichtbar, übrige Kommentare entfallen, unbekannte Pfade brechen ab. Launch-Check prüft Marker und zählt Platzhalter in ausgeblendeten Blöcken nicht. Rechtstexte nicht über Keystatic speichern (formatiert Tabellen um).
- Schemas: `import { leistungSchema, … } from '<rel>/lib/schemas/index.ts'` (Client und Server gleich). Bilder: `teamSchema(image())`.
- API-Routen: `src/pages/api/*.ts` mit `export const prerender = false`. Secrets: `getServerEnv()` aus `server/env.mjs` (ALTCHA_HMAC_KEY, CSRF_SECRET, SMTP_*, MAIL_FROM; `.env.example`). Ohne Pflicht-Secrets startet der Server nicht.
- Kontakt-API (backend-api): `GET /api/csrf` → `{token}` (signiert, einmalig, 2 h, kein Cookie), `GET /api/altcha` (Challenge), `POST /api/contact` laut `kontakt-schnittstelle.ts`; ohne `Accept: application/json` 303 auf `/kontakt/danke/` bzw. `/kontakt/fehler/`. Widget: `src/components/forms/altcha-widget.ts` (lädt `kontakt-formular.ts`). Logik in `src/lib/{security,uploads,mail}/`, Empfänger `firma.kontakt.anfragen_empfaenger` (solange Platzhalter: `MAIL_TO_STAGING`).
- Website-Adresse: `server/site.mjs` aus `firma.domain` (Build-Variable `SITE_URL` überschreibt) → `site` und `security.allowedDomains` (nur Staging zusätzlich localhost). Sitemap lässt jede Seite mit `noindex` weg (`BaseLayout noindex`), keine Pfadlisten.
- Header/CSP: `server/headers.mjs`, `server/csp.mjs`. Astro schreibt die Seiten-CSP (Hashes) nach `dist/_headers.json`, der Server sendet sie als Header.
- Client-Adresse in API-Routen nur aus Header `x-raumstrom-client-ip` (setzt `server/proxy.mjs` immer, Client-Werte gelöscht: Socket bzw. bei `TRUST_PROXY=true` letzter X-Forwarded-For-Eintrag). Bei `TRUST_PROXY=false` entfernt der Server alle `X-Forwarded-*`/`Forwarded`. In `astro dev` fehlt der Header. `/api/*` nimmt nur GET/HEAD/POST/PUT/PATCH/DELETE/OPTIONS an, sonst 405.
- Kompression: Build-Nachschritt `scripts/lib/precompress.mjs` (letzte Integration) legt `.br`/`.gz` für html/css/js/mjs/json/svg/xml/txt ab 512 B an; `server/static.mjs` wählt per `Accept-Encoding` (Vary, eigenes ETag). API wird nicht komprimiert.
- `'wasm-unsafe-eval'` nur auf `/raumplaner/` und `/planer/ansehen`: dort `Astro.csp?.insertScriptResource("'wasm-unsafe-eval'")`. Worker/blob: ebenso nur seitenweise.
- Schriften: Astro-Fonts-API mit `fontProviders.local()` in `astro.config.mjs` (Block `fonts` ergänzt design-system).

- Kontaktformular: UI `src/components/forms/KontaktFormular.astro`, Vertrag in `src/components/forms/kontakt-schnittstelle.ts` (Feldnamen `FELD`, `LIMITS`, `KontaktAntwort`). `POST /api/contact` multipart/form-data: name, email, telefon?, ort?, anliegen?, nachricht, fotos* (≤5, je ≤10 MB, jpeg/png/webp/heic), skizze? (reserviert), einwilligung=ja, altcha, csrf (Token aus `GET /api/csrf` → `{token}`, Vorschlag), website (Honeypot, muss leer sein). Antwort JSON: 200 `{ok:true}`; sonst 4xx/5xx `{ok:false, fehler?:{<feld>:"Meldung"}, nachricht?}`. Entwürfe: Seiten-Helfer `src/components/sections/seiten.ts` (`STAGING`, `sichtbar`).

## Konventionen
- Keine CDN-/Fremd-Hosts, nirgends (Test: 0 Fremd-Requests). Draco-/Basis-/KTX2-Decoder, meshopt, pdf.js-Worker, Schriften (auch für drei `<Text font>`) und HDRs (`<Environment files="/hdr/…">` statt `preset`) liegen lokal unter `public/`.
- CSS-Dateien ≤ 20 KB bettet der Build als `<style>` mit CSP-Hash ein (`inlineNurCss` in `astro.config.mjs`), Bilder/Schriften/Skripte nie.
- CSP ohne `'unsafe-inline'`: keine `style`-Attribute, keine `on*`-Handler, kein Inline-`<script>` außer von Astro gebündelt; dynamische Werte über Klassen, CSS-Variablen per Stylesheet oder `element.style` aus gebündeltem JS.
- Seitenübergänge: native View Transitions (`@view-transition { navigation: auto; }`), kein `<ClientRouter />`.
- Astro 7: Rust-Compiler verlangt gültiges HTML; `compressHTML: 'jsx'` entfernt Leerraum zwischen Elementen, nötige Leerzeichen als `{" "}`.
- URLs mit Schrägstrich am Ende (`/leistungen/trockenbau/`), der Server leitet um. Keine Daten-URIs (CSP `img-src 'self'`).
- Inhalte unter `src/content/` ohne GFM-Tabellen (Keystatic schreibt sie in Markdoc um), stattdessen Listen.
- Platzhalter: `[[PLATZHALTER: Beschreibung]]`. Wording: nur „Meister-Partnerbetrieb", kein Meister/Innung/Fachbetrieb/Sicherheitstechnik/Alarm/Kamera (im Planer „Ansicht")/Superlative („beste", Nr. 1, Top)/Festpreis- oder Preisgarantie (`scan:wording` bricht den Build ab; Regeln `scripts/lib/wording.mjs`).
- Strom-Grün `#C5F01E` nie als Text auf hellem Grund; grüne Schrift = Kabelgrün `#3D6300`.
- Abhängigkeiten exakt pinnen (`.npmrc` save-exact, ignore-scripts), nur MIT/Apache/BSD/ISC. Ausnahmen (`scripts/licenses.mjs` → `THIRD-PARTY-LICENSES.md`): freigegeben GSAP, libheif/heic-to (LGPL), sharp/libvips (LGPL), axe-core (MPL, nur Tests), lightningcss (MPL, Vite-Build), y-provider (ohne Lizenz, Keystatic dev). Weitere nur nach Freigabe. Audit-Ausnahmen mit Ablaufdatum in `scripts/audit-allowlist.json`.

## Agenten-Setup
- 17 Agenten in `.claude/agents/`, geprüfte Skill-Kopien in `.claude/skills/` (frontend-design, 12× threejs-*, je `QUELLE.md`), Audit: `docs/SKILL-AUDIT.md`.
- Hook `.claude/hooks/agent-guard.mjs` (kein Push durch Subagenten, Prüf-Agenten schreiben nur `docs/`); Test `node --test .claude/hooks/agent-guard.test.mjs` (in `npm test` und CI).
- Offen: SEO-Skills aus `AgriciDaniel/claude-seo` @ `468ed5b` (seo-local, seo-schema, seo-technical) erst zu Beginn von Phase 7 vollständig lesen, angepasst kopieren, in `seo-specialist.md` eintragen (Anpassungen: `docs/agent-reports/0-skill-auditor-c-security-seo.md`).
- CI: `.github/workflows/ci.yml` (Wording, Lizenzen, Typen, Unit, Audit, Build-Abbruch, Staging-Build, E2E), Dependabot wöchentlich.
