# Phase 5 · planner-design · Gestaltungsmodi, Kataloge, Elektro, Stilpakete

Stand: 21.11.2026. Branch `worktree-agent-ab6d415b1ea8ebd76` (Commits b10f0ed … HEAD).

## Ergebnis

- **Werkzeugleiste** (`src/islands/planner/gestalten/Werkzeugleiste.tsx`): Neun Modi (Bauen · Elektro · Wände · Boden · Fliesen · Decke · Türen & Fenster · Einrichtung · Ansicht) mit Symbol, Tasten 1–9 und `aria-pressed`. „Bauen" ist der bisherige Editor aus Phase 4. Die Flächenmodi schalten auf 3D um, wenn WebGL verfügbar ist. Jeder Modus lässt sich auch im 2D-Plan bedienen.
- **Kachel-Auswahl mit Vorschau** (`gestalten/Panel.tsx`, `ui.tsx`, `zeichnen.ts`): Die Vorschau zeichnet dasselbe prozedurale Bild wie die 3D-Textur, bei Materialien mit Detailtextur zusätzlich das 96-px-WebP. Optionen je Material: Paletten mit eigenen Namen und Farbrad (`input type=color` plus „Übernehmen"), Holztöne, Tapetendesign, Format, Verlegemuster, Richtung, Fugenfarbe und -breite, Fliesenhöhe sowie Sockelleiste.
- **Anwenden** auf Wandseite/Fläche, ganzen Raum oder alle Räume (`gestalten/aktionen.ts`):
  - Ein Tippen auf eine Fläche (3D-Raycast mit `teilVon`, im 2D-Plan über `treffer2D`) wählt das Ziel und wendet die aktive Kachel an.
  - Zieländerungen per Tastatur: Raumliste und Auswahl „Wandseite im Raum".
  - Die Pipette übernimmt das Material einer Fläche.
  - Jede Änderung ist genau ein `planerStore.aendere`-Schritt. Rückgängig/Wiederholen per Knopf, Strg+Z/Strg+Y (auch Strg+Umschalt+Z), global im Planer.
  - Wird ein ganzer Raum gestaltet, verwirft das die Wandseiten-Overrides der zugehörigen Seiten.
- **Material-Katalog** `src/lib/materials/` (reines TS):
  - `katalog.ts`: 43 Materialien. Dazu gehören Wandfarbe, Akzentwand, fünf Tapeten, sieben Putze, Akustik- und Wandpaneele, Holzverkleidung, Vorsatzschale, Nische, Vinyl, Laminat, Parkett, Teppich, Mikrozement, sieben Fliesenoberflächen, vier Deckenvarianten, Sockelleisten und Fensterbänke.
  - Außerdem in `katalog.ts`: Tür- und Fensterstile, Zargen, Glasausschnitte, `normalisiereRef` (tolerant) und `beschreibeRef`.
  - `muster.ts`: elf Formate und acht Verlegemuster als Gitter mit Motiv und einer nahtlosen rechteckigen Wiederholzelle (auch Fischgrät, Chevron und Hexagon). Ein Test prüft, dass jede Zelle lückenlos und ohne Überlappung bedeckt ist.
  - `farben.ts`: fünf Paletten, keine Farbsystem- oder Markennamen.
  - `moebel.ts`: zehn Low-Poly-Möbel, außerdem `NUR_VISUALISIERUNG`.
  - `uebersicht.ts`: `raumMaterialien(p)` liefert die Materialien je Raum als Text, für das PDF in Phase 6.
- **Elektro** `src/lib/electro/`:
  - Alle 31 Typen aus 7.2. Die Klingel heißt „nur Audio".
  - Standardhöhen sind editierbar (Panel „Standardhöhen"), dazu kommt die Option „über Arbeitsplatte 1,15 m".
  - Wandpunkte rasten an der Wandoberfläche ein. Schalter rasten an senkrechten Zonen ein (8 cm Fangradius).
  - **Installationszonen DIN 18015-3** (`zonen.ts`):
    - Waagerecht ZW-o, ZW-u und ZW-m (ZW-m in Küche, Bad oder bei Möbeln mit Arbeitsfläche).
    - Senkrecht ZS-t, ZS-f und ZS-e.
    - Öffnungen unterbrechen die Zonen.
    - Anzeige im 2D-Plan als Linien und in 3D als halbtransparente Bänder.
    - `inZone` meldet Punkte außerhalb der Zonen.
  - **Stückliste** `elektroStueckliste(p)` / `elektroGesamt` liefert je Raum Funktion, Anzahl und die Zahl der Punkte außerhalb der Zonen. Die Seitenleiste zeigt sie als Tabelle, planner-export nutzt dieselbe Funktion in Phase 6.
- **Stilpakete**:
  - Die Seite übergibt die aktiven Pakete aus `astro:content` (`aktiv` und `gueltig_ab` ≤ Build-Datum, ohne `trend_quelle_notiz`) als `data-planer-stilpakete`, ohne Inline-Skript.
  - `paketGestaltung`/`wendePaketAn` (`stilpakete.ts`) übersetzen die festen Begriffe aus TREND-UPDATE.md tolerant mit Fallback. Raumtypen werden am Namen erkannt:
    - Bad und WC bekommen Fliesenboden und Wandfliesen, keine Papiertapete.
    - Küche bekommt einen Spritzschutz.
    - Voute oder Stuck kommen aus dem Deckenlicht, die Sockelleiste passt zum Holzboden.
  - Anwendbar „Auf Raum" oder „Auf Wohnung", danach ist alles einzeln änderbar. Der Elektro-Vorschlag erscheint als Text.
- **3D** (`szene/`):
  - Die CSG-Geometrie entsteht nur noch bei Änderungen an Wänden, Öffnungen oder Räumen neu (`geometrieSchluessel`). Gestaltungsänderungen tauschen nur Materialien (`gestaltung3d.ts`, `MaterialCache` in `materialien.ts`).
  - Wandfliesen sind eine eigene, auf die Fliesenhöhe zugeschnittene Ebene (`schneideHoehe`).
  - Türblätter: Stil, Farbe, Glasausschnitt und Schiebetür.
  - Ausstattungsebene (`ausstattung3d.ts`): Sockelleisten (mit Türaussparung), Zargen, Fensterrahmen, Fensterbänke, Nische, Lichtvoute, Stuck, Elektrosymbole, Möbel und Zonen.
  - Hover- und Auswahlmarkierung.
- **Ansicht**:
  - Orbit, Draufsicht und Rundgang. Der Rundgang läuft mit WASD bzw. Pfeiltasten, Ziehen zum Umsehen und einem Touch-Joystick (nur bei Touch). Wände blockieren, Türen sind passierbar (`rundgang.ts`).
  - Tageszeit 6–22 Uhr steuert Sonne, Farbe und Himmel, nachts gibt es warmes Raumlicht.
  - Wände: ganz, niedrig oder aus.
  - Maße als `CSS2DRenderer`-Overlay.
  - Screenshot als lokaler PNG-Download (`toBlob`).
- **Einrichtung**: Möbel per Tippen auf den Boden. In Wandnähe richtet sich das Möbel an der Wand aus, der Rücken liegt an. Drehen mit Knopf oder R, Verschieben mit Knopf oder Alt+Pfeil. Der Hinweis „nur zur Visualisierung, nicht Teil des Angebots" steht im Panel und in der 3D-Ansicht.
- **Mobil**: Pixelratio höchstens 1,25, keine Schatten, kein Antialias, prozedurale Texturen mit 128 px/m statt 256, Detailtexturen in 256 px, kein Bump-Mapping. Auf dem Desktop gibt es Schatten (PCF, 2048²). Decken werfen keine Schatten.

## Texturen (CC0) und Entscheidung KTX2 → WebP

- Vier Detailtexturen von Poly Haven (CC0): Eiche, Marmor, Beton, Putz. Selbst gehostet unter `public/textures/`, jeweils 512 und 256 px plus 96-px-Vorschau, zusammen rund 101 KB. Herkunft, Urheber, Abrufdatum und Befehle stehen in `public/textures/QUELLEN.md`.
- Geladen werden sie erst, wenn ein Material sie braucht (je Kategorie). Der E2E-Test prüft das: vor dem ersten Material kein Request, danach nur `/textures/putz-*.webp`.
- ambientCG war nicht nutzbar, weil der Download auf einen nicht freigegebenen Host umleitet.
- **KTX2 versucht und verworfen**: Encoder `ktx2-encoder@0.6.0` (MIT/Apache, einmalig außerhalb des Projekts) lief einwandfrei. three bündelt den Transcoder sogar selbst unter `/_astro/`. Im Browser meldet der Basis-Transcoder (Emscripten/embind) aber „Evaluating a string as JavaScript violates … 'unsafe-eval'". Die strenge CSP erlaubt das nicht. Ein Transcoder-Build ohne `new Function` wäre Zusatzaufwand, deshalb gilt die Rückfallebene WebP.
- Nebeneffekt: Etwa 245 KB komprimierter Transcoder plus Loader entfallen. Es gibt keine neue Abhängigkeit, `npm run licenses -- --check` meldet 599 Pakete, ok.

## Chunk-Größen (Staging-Build, vorher → nachher)

| Chunk | vorher | nachher |
| --- | --- | --- |
| `start.*.js` (Planer, nur /raumplaner/) | 157,6 KB / gz 47,0 KB | 249,8 KB / gz 74,6 KB |
| `Ansicht3D.*.js` (3D, lazy) | 129,1 KB / gz 37,1 KB | 155,0 KB / gz 46,9 KB |
| `react-three-fiber.esm.*.js` | 918,3 KB / gz 238,9 KB | 918,4 KB / gz 238,9 KB |
| `gestalten.css` | – | 12,1 KB (wird als `<style>` mit Hash eingebettet) |

Der Zuwachs von `start` stammt aus den Katalogen, den Panels und dem prozeduralen Zeichnen, das für die Kachel-Vorschau nötig ist. Die Startseite lädt weiterhin nur das Motion-Skript.

## Vertrags- und Fremddatei-Änderungen

- **Projektmodell (`src/lib/geometry`)**: keine Änderung. v2 deckt alles ab.
- `src/islands/planner/Editor2D.tsx` (planner-geometry): neue, optionale Prop `erweiterung?: EditorErweiterung` mit `tippen(w, radius)`, `taste(e)`, `loeschen()` und `ebene(ctx)`. Ohne Prop verhält sich der Editor unverändert (`raumplaner.spec.ts` 20/20 grün). Bitte von planner-geometry gegenlesen.
- `src/islands/planner/Planer.tsx`, `Seitenleiste.tsx`, `start.tsx`, `laden.ts`: Werkzeugleiste, Gestaltungs-Panel, Stilpakete-Durchreichung, globale Tasten und Rundgang-Joystick ergänzt.
- `src/pages/raumplaner/index.astro` (page-builder): `getCollection('trends')`, Attribut `data-planer-stilpakete`, Import `gestalten.css`.

## Geprüft

- `npm test`: 30 Dateien, 480 Tests grün. Neu sind 53 Tests in `tests/unit/materials/`: Muster-Abdeckung, Katalog, Normalisierung, Paletten-Wording, alle 8 Stilpakete, Zonen, `inZone`, Stückliste, Rundgang-Kollision und Fliesen-Zuschnitt. Hook-Test 7/7.
- `npm run check`: 0 Fehler, 0 Warnungen. `npm run scan:wording`: sauber. Dafür heißt die Kamera-Variable im Code jetzt `blick`, und `best…` wurde umbenannt. `npm run build:staging`: grün.
- E2E `tests/e2e/planer-gestalten.spec.ts`, chromium und mobile: 10/10. Gesamtlauf (`E2E_MAILPIT=extern` mit Stub): 223/227. Rot sind nur die 4 bekannten Mail-Tests (`kontakt-api.spec.ts:96/:206`, kein SMTP im Container).
- Browser (SwiftShader, Skript `tests/e2e/planer-gestalten-bilder.mjs`): 0 Konsolenfehler, 0 CSP-Meldungen, 0 Fremd-Requests. Screenshots bei 390 und 1440 px: `docs/agent-reports/screenshots/5-planner-design-*.png` (Wände mit Stilpaket, Fliesen, Elektro 2D, Stückliste, Elektro 3D mit Zonen, Ansicht mit Maßen und Abendlicht, Rundgang).

## Offen / Hinweise

- **architect**: In `CLAUDE.md` die Schnittstellen eintragen:
  - `src/lib/materials/index.ts`: `raumMaterialien`, `beschreibeRef`, `materialVon`, `NUR_VISUALISIERUNG`
  - `src/lib/electro/index.ts`: `elektroStueckliste`, `elektroGesamt`, `installationsZonen`, `inZone`
  - `public/textures/`
- **planner-export (Phase 6)**: Materialien im GLB als IDs nutzen (`userData` der Meshes trägt `art`, `id` und `seite`). Grundriss-Symbole: Typ-Kürzel `kurz` aus dem Elektro-Katalog.
- Vereinfachungen, im UI als Planungshilfe gekennzeichnet:
  - Die Zonen werden ab der fertigen Oberfläche gemessen, nicht ab dem Rohbau. Deckenzonen fehlen.
  - Der Elektro-Vorschlag eines Stilpakets setzt keine Punkte automatisch.
  - Raumteiler (Trockenbau) liegt unter Einrichtung.
  - Möbel lassen sich nur per Knopf oder Taste verschieben, nicht per Ziehen in 3D.
- Möbel blockieren den Rundgang nicht. Die Maserung der Detailtextur folgt beim Fischgrät nicht jedem Stab.
- Die Fischgrät-Ausrichtung auf Böden und den Kontrast der Zonenfarben bitte im a11y/QA-Lauf mit echten Geräten prüfen. Die 60-fps-Messung auf Mittelklasse-Hardware steht noch aus, hier lief nur SwiftShader.
