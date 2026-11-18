# Phase 2c · page-builder

Stand: 18.11.2026 auf 1930404, Hauptcheckout, nichts committet.

## Gebaut
- Seiten: `/`, `/fuer-zuhause/`, `/fuer-unternehmen/`, `/leistungen/`, `/leistungen/<id>/` (11), `/raumplaner/` (nur Einleitung plus Hinweis "folgt"), `/referenzen/`, `/ueber-uns/`, `/partner/`, `/kontakt/`, 6 Rechtsseiten, `404`. `/ratgeber/[...seite]` erzeugt nur bei `ratgeber_anzeigen: true` Pfade (derzeit keine Seite). `/region/[ort]/` nur für `entwurf:false` mit Inhalt (derzeit keine).
- Komponenten `src/components/sections/`: Seitenkopf, Breadcrumbs, Abschnitte, Markdown (+ `markdown.ts`, eigener sicherer Mini-Renderer, kein Roh-HTML), FaqListe (native details), AblaufListe, GewerkeListe, CtaBand, LeistungsRaster, Eingangsseite, LegalSeite, Entwurfsbanner, WandSchnitt (statische Wand-Grafik, Poster fuer den 3D-Hero, `[data-hero-visual]`), `seiten.ts` (Helfer, `STAGING`, `sichtbar`).
- Formular `src/components/forms/`: KontaktFormular.astro, `kontakt-formular.ts` (Progressive Enhancement: Fehlerliste mit Fokus, aria-invalid/describedby, fetch), `kontakt-schnittstelle.ts`.
- Fix `GewerkeHinweis.astro`: nutzt `partnerHinweis()` (Plural). Startseite: Hinweis nennt alle Partner-Gewerke aus der Matrix.
- Alle Texte aus Collections; Footer/Navigation (design-system) unveraendert, Rechtslinks erscheinen jetzt, da die Routen existieren.

## Formular-Schnittstelle (`POST /api/contact`, multipart/form-data)
Felder: `name`, `email`, `telefon?`, `ort?`, `anliegen?` (Leistungs-ID oder `sonstiges`), `nachricht` (10-4000), `fotos` (mehrfach, max 5, je 10 MB, gesamt 20 MB, jpeg/png/webp/heic/heif), `skizze?` (reserviert), `einwilligung`=`ja`, `altcha` (Widget-Payload, Mount `[data-altcha-platz]`), `csrf` (Token via `GET /api/csrf` -> `{token}`; Vorschlag, backend-api bestaetigt), `website` (Honeypot, leer).
Antwort immer JSON: 200 `{ok:true}`; 400/422 `{ok:false, fehler:{<feldname>:"Meldung"}}`; 413/429/5xx `{ok:false, nachricht:"..."}`. `?anliegen=<id>` waehlt das Thema vor. Ohne JS: nativer POST (Antwort waere JSON, offen).

## Entwuerfe
Dev/Staging (`RAUMSTROM_STAGING=1`): Entwuerfe sichtbar mit Banner, Rechtsseiten `noindex`. Produktions-Build: Leistungen/Ratgeber/Referenzen mit `entwurf:true` werden nicht erzeugt; Rechtsseiten (statische Dateien, muessen existieren) zeigen nur "Text wird erstellt" statt Entwurfstext. `production-build.test.ts` baut ohne Launch-Check, daher kein Abbruch im Seitencode; der Launch-Check blockiert weiterhin.

## Tests
`npm test` 181 + Hook 7 ok · `npm run check` 0/0/0 · `scan:wording` 0 Funde · `build:staging` ok · `test:e2e` neue `tests/e2e/seiten.spec.ts` (jede Route 200, genau eine H1, 0 Fremd-Requests, axe 0 Verstoesse auf 26 Seiten, Partner-Hinweis je Leistung Singular/Plural, Formular inkl. gemocktem Server) plus Anpassung von `design-system.spec.ts` (Plural erlaubt). Screenshots: `docs/agent-reports/screenshots/2/` (start, leistung-wallbox, kontakt, impressum, je 390/1440).

## Offen
- Ratgeber/Region haben derzeit keine Seite (404, getestet); Nav-Eintrag "Ratgeber" erst bei Flag.
- backend-api: `/api/contact`, `/api/csrf`, ALTCHA-Widget; Datenschutztext muss Feldliste decken.
- Placeholder-Texte (`[[PLATZHALTER…]]`) erscheinen in Staging sichtbar im Fliesstext (z. B. Startseite "Region").
- Screenshots 390 px nur erzeugt, nicht einzeln durchgesehen (1440 Startseite geprueft).
- Kein JSON-LD (SEO-Phase).
