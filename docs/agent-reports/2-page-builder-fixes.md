# page-builder: Phase-2-Fixes

- B2: `/partner/` im Footer unter „Seiten" als „Partner werden" verlinkt (`FUSS_ZUSATZ` in `src/components/layout/navigation.ts`, genutzt in `Footer.astro`). Header bleibt bei 6 Einträgen.
- H4: `AblaufListe.astro` ohne Browser-Ziffer (`list-style: none`, kein Einzug). Nummerierung nur noch über den sichtbaren Zähler „Schritt N:"; für Screenreader als leerer Alternativtext (`content: … / ''`), die `ol` liefert die Zählung. Kein doppeltes Vorlesen.
- H5: `Breadcrumbs.astro`: `list-style: none; margin: 0; padding: 0`, bündig mit dem Seitenkopf (Screenshot geprüft).
- Neuer E2E-Test in `tests/e2e/seiten.spec.ts`: liest alle HTML-Dateien aus `dist/client`, ohne `noindex`-Seiten, und verlangt für jede (außer `/`) einen internen Link von einer anderen Seite.
- Geprüft: `npm test` (230 Unit grün, Hook-Test grün), `npm run check` 0 Fehler, `build:staging` ok, `seiten.spec.ts` chromium 49/49 (Mailpit per Stub, kein Docker verfügbar). Screenshots Trockenbau-Ablauf und Kopf.

- Gewerke-Liste: `GewerkeListe.astro` ohne Browser-Einzug (`list-style: none; margin: 0; padding: 0` im Stylesheet, kein style-Attribut). Gemessen auf /leistungen/trockenbau/: linke Kante der Liste = linke Kante des Gewerke-Blocks (45,6 px beide), Screenshot geprüft, `build:staging` ok.
