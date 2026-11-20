# Phase 4 · planner-geometry · Raumplaner Teil 1

Stand: 20.11.2026. Branch `worktree-agent-a9e975360e478c00c`.

## Ergebnis

`/raumplaner/` ist kein Platzhalter mehr. Der Ablauf: Start (Upload, Vorlage oder leeres Raster), Maßstab, Wände (Modus A), Räume, Türen und Fenster, 3D-Ansicht.

- **Upload** (`src/islands/planner/upload/`): JPG, PNG, WebP, HEIC, PDF, höchstens 20 MB. Den Typ erkennt der Planer an der Dateisignatur, nicht an der Endung. Die Datei wird nur im Browser verarbeitet. Jede Quelle wird auf ein neues Canvas gezeichnet (Neu-Kodierung, längste Kante höchstens 4096 px). Dabei fallen EXIF, XMP und GPS weg. Die EXIF-Drehung wird einmal angewendet. PDF läuft über pdf.js. Der Worker und die WASM-Decoder liegen selbst gehostet unter `public/pdfjs/`, ein Unit-Test prüft per Hash, dass sie zur installierten Version passen. Bei mehrseitigen PDFs gibt es eine Seitenauswahl mit Vorschau. Für HEIC wird `heic-to/csp` nachgeladen. pdf.js und heic-to sind eigene Chunks und laden erst beim Upload.
- **Maßstab**: zwei Punkte setzen (Maus, Touch oder Tastatur), dann die Länge in cm eingeben. Wände, die vorher gezeichnet wurden, werden um den Bildursprung mitskaliert.
- **Wand-Editor Modus A** (`Editor2D.tsx`):
  - Einrasten bei 45° und 90°, magnetisches Andocken an Wandenden, T-Anschluss auf Wände, Raster 5 cm (abschaltbar).
  - Live-Längenanzeige. Länge per Ziffern und Eingabetaste.
  - Wandart und Wandstärke wählbar. Länge, Stärke und Art der gewählten Wand sind im Seitenpanel numerisch editierbar.
  - Eckpunkte ziehen (Andocken oder Teilen beim Loslassen). Rückgängig und Wiederholen (100 Schritte).
- **Raumerkennung**: geschlossene Flächen des planaren Wandgraphen. Lose Wände werden ignoriert, Kreuzungen geteilt. Die Fläche ist die lichte Fläche (Achspolygon um die halbe Wandstärke je Kante eingerückt). Neue Räume bekommen einen Namen nach Fläche, Namen sind editierbar und bleiben beim Bearbeiten erhalten.
- **Türen und Fenster**: per Werkzeug auf die Wand tippen oder klicken, alternativ „Tür einsetzen" im Panel (Tastatur). Ziehen bzw. Pfeiltasten verschieben. Breite, Höhe, Brüstung, Position, Anschlag und Aufschlag sind editierbar. Öffnungen überlappen nicht und halten 5 cm Abstand zum Wandende.
- **3D** (`szene/`, eigener Lazy-Chunk mit three, R3F und three-bvh-csg):
  - Wände als Quader, an Anschlüssen verlängert, damit die Ecken geschlossen sind.
  - Öffnungen per CSG ausgeschnitten.
  - Böden je Raum, Glasscheiben, offene Türblätter.
  - Rendert nur bei Bedarf (frameloop demand), auf Mobilgeräten mit geringerer Qualität.
  - Bedienung: Orbit, Pfeiltasten, Plus und Minus, D für Draufsicht, 0 zum Zurücksetzen, dazu Schaltflächen. Im Wording steht nur „Ansicht".
- **Vorlagen**: 1-Zimmer-, 2-Zimmer- und 3-Zimmer-Wohnung, Einfamilienhaus-Erdgeschoss. Sie werden mit denselben Graph-Operationen gebaut wie im Editor.
- **Bedienung**:
  - Maus, Touch (Tippen, Ziehen, Pinch) und Tastatur.
  - Werkzeug-Kürzel A, W, T, F, M. Pfeiltasten in drei Schrittweiten (10 cm, mit Umschalt 1 m, mit Alt 1 cm), Eingabetaste, Esc, Entf, Strg+Z und Strg+Y.
  - Statusmeldungen über eine Live-Region. Eine überspringbare Kurzanleitung beim ersten Start.
- **Hinweis** „Visualisierung, unverbindlich, Maße ohne Gewähr, kein Angebot." steht immer sichtbar unter dem Planer.
- **Fallbacks**:
  - `<noscript>` mit Link zum Kontaktformular.
  - Ohne WebGL 2 bleibt der 2D-Plan nutzbar. Die 3D-Ansicht zeigt dann einen Hinweis mit Link zum Kontaktformular, ebenso bei einem Fehler beim Aufbau (Fehlergrenze).
  - Kann der Planer-Chunk nicht geladen werden, erscheint eine Meldung mit Link zum Kontaktformular.
- **Chunk und CSP**: Den Planer-Chunk importiert nur das Skript von `/raumplaner/`. Ein E2E-Test lädt `/`, `/kontakt/` und `/leistungen/` und findet dort keinen Planer-Code. Nur auf `/raumplaner/` gelten `script-src 'self' 'wasm-unsafe-eval'` und `worker-src 'self' blob:` (blob für den heic-to-Worker). Alle anderen Seiten bleiben unverändert (geprüft in `dist/_headers.json`).

## Projektmodell (Vertrag)

Datei `src/lib/geometry/projekt.ts`. Öffentlicher Einstieg: `import { … } from '<rel>/lib/geometry/index.ts'`. Reines TypeScript, ohne three.js und ohne DOM. Geprüft mit dem zod-Schema `projektSchema` und `parseProjekt(json|obj)` (Schema plus Verweisprüfung). Serialisieren mit `serialisiere(p)`.

- `version: 1` (`PROJEKT_VERSION`). Neuere Versionen lehnt der Planer ab. Migrationen kommen in `parseProjekt`.
- Einheiten: Meter. Planachsen: x nach rechts, y nach unten (wie im Bild). 3D-Abbildung: Plan (x, y) wird zu three (x, 0, y), die Höhe ist +y.
- Felder:
  - `name`
  - `vorlage` (ID oder null)
  - `standardHoehe` (2,50 m)
  - `knoten[{id, x, y}]`
  - `waende[{id, von, bis, dicke, art: aussen|innen}]`
  - `oeffnungen[{id, wandId, art: tuer|fenster, abstand (Mitte ab „von"), breite, hoehe, bruestung, anschlag: links|rechts, aufschlag: links|rechts}]`
  - `raeume[{id, name, knoten[] (Achspolygon, positiv orientiert), hoehe|null, flaeche (abgeleitet, lichte m²)}]`
  - `grundriss|null{quelle, breitePx, hoehePx, meterProPixel, ursprung, deckkraft, kalibriert, kalibrierung{a, b (px), laenge}|null, seite|null}`
- IDs haben das Format Präfix plus Zahl (`k`, `w`, `o`, `r`), vergeben über `neueId`.
- Das Grundrissbild selbst ist nicht Teil des JSON (Datenschutz, Größe). Es liegt nur im Store (`hintergrund`).
- Abgeleitete Werte berechnet `mitRaeumen(p, vorher)` neu. Jede Änderung läuft im Store über `aendere(fn)`, mit Verlauf und Raumerkennung.
- Store: `src/islands/planner/store.ts` (zustand vanilla, `planerStore`, `usePlaner`). `projekt` ist der Vertrag, alles andere ist UI-Zustand.
- Für Phase 5 und 6:
  - `wandKoerper(p)` und `bodenFlaechen(p)` liefern die 3D-Daten ohne three.js.
  - `baueSzene(p)` setzt `userData {art: wand|boden|fenster|tuer, id}` an jedes Mesh. Daran kann planner-design Materialien zuordnen.
  - Materialfelder (Wand je Seite, Boden, Decke) und die Elektro-Objekte sind noch nicht im Modell. Phase 5 ergänzt sie als Version 2 mit Migration.

Den Eintrag in `CLAUDE.md` macht architect (Kurzfassung dieses Abschnitts).

## Tests

- Unit (`tests/unit/geometry/`, 6 Dateien):
  - Snapping 45° und 90°, Andocken, T-Anschluss, Längeneingabe.
  - Wandgraph: Teilen, Kreuzen, Überlappen, Verschmelzen, Wandlänge, Skalieren.
  - Raumerkennung: Rechteck, L-Form, Trennwand, Kreuz, lose Wände, Namen bleiben erhalten, unterschiedliche Wanddicken.
  - Flächen, Einrücken, Beschriftungspunkt.
  - Öffnungen und Extrusion.
  - Projekt-JSON hin und zurück, Ablehnung fehlerhafter Projekte.
  - Alle Vorlagen.
  - Kalibrierung und Format.
  - Upload-Signaturen, 20-MB-Grenze, Abgleich `public/pdfjs` mit `node_modules`.
  - `npm test`: 400 Tests grün, Hook-Test grün.
- `npm run check`: 0 Fehler. `npm run build:staging`, `npm run scan:wording`, `npm run licenses -- --check` (599 Pakete ok) und `npm run platzhalter` (keine Änderung): alle grün. `THIRD-PARTY-LICENSES.md` ist neu erzeugt.
- E2E `tests/e2e/raumplaner.spec.ts`: 18 von 18 grün (chromium und mobile, `E2E_MAILPIT=extern`, Mailpit-Info-Stub auf 8025).
  - Vorlage, Wände und Räume, Umbenennen, 3D bereit, Tastatur in 3D.
  - Rechteck per Tastatur mit Längeneingabe, Raum 10,0 m², Rückgängig und Wiederholen, Tür über das Panel.
  - Wand und Fenster per Klick bzw. Touch.
  - PNG mit EXIF hochladen und kalibrieren.
  - Zweiseitiges PDF mit Seitenauswahl, Worker kommt von `/pdfjs/`.
  - Falsches Format und mehr als 20 MB werden abgelehnt.
  - Ohne WebGL, noscript.
  - Planer-Chunk nur auf `/raumplaner/`.
  - Jeweils 0 Fremd-Requests, 0 CSP-Verstöße, 0 Skriptfehler.
- Bestehende Suiten `seiten`, `security` und `motion-3d`: 150 von 150 grün, darunter axe auf `/raumplaner/`.
- Screenshots Desktop (1440 px) und Mobil (Pixel 7): `docs/agent-reports/screenshots/4-planner/` (Start, Kurzanleitung, 2D-Editor, 3D).

## Neue Abhängigkeiten (exakt gepinnt)

pdfjs-dist 6.5.438 (Apache-2.0), zustand 5.1.0 (MIT), three-bvh-csg 0.0.18 (MIT), three-mesh-bvh 0.9.18 (MIT), heic-to 1.6.7 (LGPL-3.0, bereits freigegeben, eigener Chunk). Optional @napi-rs/canvas (MIT, nur Node, aus pdfjs-dist).

pdf.js-Schriften `standard_fonts` werden nicht ausgeliefert, weil die Liberation-Schriften unter GPL stehen und nicht freigegeben sind. Stattdessen gilt `disableFontFace`, und Glyphen werden als Pfade gezeichnet. Nicht eingebettete Standardschriften in PDFs können dadurch abweichen. Für Grundrisse ist das unkritisch.

## Änderungen außerhalb meiner Ordner (bitte prüfen)

- `tsconfig.json` (architect): `public` steht jetzt in `exclude`. Grund: `astro check` lief mit `allowJs` über `public/pdfjs/*.mjs` (1,3 MB) und brach mit OOM ab.
- `src/pages/raumplaner/index.astro` (page-builder): wie im Auftrag ersetzt. Seitenkopf und Abschnitte aus `pages/raumplaner.md` bleiben.

## Offen / Risiken

- `insertScriptResource` ersetzt Astros Standardliste. Deshalb setzt die Seite `'self'` ausdrücklich wieder. Falls `/planer/ansehen` (Phase 6) dasselbe braucht, muss es dort genauso gemacht werden.
- Der pdf.js-Worker bekommt die Fallback-CSP des Servers (ohne `'wasm-unsafe-eval'`). JPX- und JBIG2-Bilder in PDFs decodiert er deshalb über die mitgelieferten JS-Fallbacks: funktioniert, ist aber langsamer. Abhilfe wäre, dass der Server für `/pdfjs/` `'wasm-unsafe-eval'` sendet (architect, optional).
- zod läuft global mit `z.config({ jitless: true })`, gesetzt in `projekt.ts`. Ohne diese Einstellung löst die Eval-Probe von zod einen CSP-Bericht aus. Gilt für alle zod-Schemas im selben Bundle.
- Konsolenwarnungen:
  - three-bvh-csg 0.0.18 nutzt die veraltete Option `maxLeafSize` von three-mesh-bvh. Nur eine Warnung, keine Funktionsänderung.
  - R3F meldet `THREE.Clock` (wie in Phase 3).
- 60 fps bei einer 4-Zimmer-Wohnung auf echter Hardware sind nicht gemessen (Container mit SwiftShader). Die Szene rendert nur bei Änderungen, CSG läuft nur bei Wänden mit Öffnungen.
- Ecken nicht rechtwinkliger Wände in 3D sind überlappende Quader statt Gehrungen. Optisch geschlossen, aber nicht exakt. Inseln (Wand frei in einem Raum) werden nicht vom Raum abgezogen.
- Noch nicht umgesetzt (laut Briefing später):
  - Entwurf speichern, Export und Import (Phase 6).
  - Sockelleisten und Decken (Phase 5).
  - Höhe des Dachgeschosses.
  - Modus B (KI, Feature-Flag).
- Die Kurzanleitung erscheint bei jedem Seitenaufruf einmal. Ohne Einwilligung wird nichts gespeichert, gemäß 7.4.
