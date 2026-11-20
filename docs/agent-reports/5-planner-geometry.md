# Phase 5 · planner-geometry · Vorab-Auftrag (Projektmodell v2, UI-Kleinkram)

Stand: 20.11.2026. Branch `worktree-agent-a994e28531cf3efb7`.

## Teil A: UI aus der Phase-4-Nachprüfung

- **Gewählter Raum im Plan** (`Editor2D.tsx`, `planer.css`): Ein Kabelgrün-Umriss (3 px) liegt knapp innerhalb der inneren Wandflächen (`nettoPolygon`, um 2,5 px eingerückt), dazu steht der Raumname in Kabelgrün. Gemessen im Browser: 6,74:1 gegen Kalk-hell und 6,17:1 gegen die gewählte Füllung. Der Umriss hat das Attribut `data-planer-raum-auswahl="<raumId>"`.
- **Kurzanleitung bei 390 px**: Ab einer Breite von 40rem oder weniger steht die Kurzanleitung im Fluss über der Zeichenfläche und liegt nicht mehr darüber. Editor bzw. 3D und die Statusmeldung liegen jetzt in einem gemeinsamen Rahmen `.planer-flaeche`. Gemessen: Die Kurzanleitung überdeckt weder die Zoomknöpfe noch die Meldung (390 und 1440 px). Nach „Verstanden" liegt der Fokus auf dem Editor.

## Teil B: Projektmodell Version 2 (Vertrag für planner-design)

`PROJEKT_VERSION = 2`. `parseProjekt` migriert v1-Dateien mit `migriereV1`, das neutrale Vorgaben einsetzt. Version 3 und höher wird abgelehnt. Ist eine Datei als v2 markiert, fehlen ihr aber die neuen Felder, wird sie abgelehnt und nicht migriert.

### Neue Felder

- **Katalog-IDs** `katalogIdSchema`: `/^[a-z0-9-]+(\.[a-z0-9-]+)*$/`, höchstens 60 Zeichen, z. B. `fliese.metro-weiss`. Die Geometrie kennt keine Kataloge.
- **Farben** `farbeSchema`: `#rrggbb`.
- **MaterialRef** `{material, farbe?, muster?, format?, fuge?{farbe, breiteMm 0–30}, richtungGrad? 0–360, fliesenhoehe? raumhoch|halbhoch|spritzschutz}`.
- **Raum**:
  - `gestaltung {wand, boden, decke, fliesen, sockelleiste}`, jeweils MaterialRef oder null.
  - `stilpaket`: Katalog-ID oder null, nur informativ.
- **Öffnung** `gestaltung`: entweder null oder `{stil?, farbe?, zarge?, glas?, schiebetuer?, fensterbank?: MaterialRef}`.
- **Projekt `wandSeiten[{wandId, seite, wand, fliesen}]`** (höchstens 4000, eindeutig je Wand und Seite):
  - Gilt als Override einer Wandseite, z. B. für eine Akzentwand oder einen Spritzschutz an nur einer Wand.
  - null heißt: Es gilt der Wert des Raums.
  - **Abweichung vom Vorschlag**: Statt eines einzelnen `material` gibt es `wand` und `fliesen` getrennt, damit sich Fliesen pro Wand setzen lassen.
- **Projekt `elektro[{id e…, typ, ort wand|decke|boden, wandId, seite, abstand, hoehe 0–6, x, y, raumId}]`** (höchstens 2000):
  - **Wandpunkte** setzt man über `wandId`, `seite`, `abstand` (ab „von") und `hoehe`. `x`, `y` (Punkt auf der Wandoberfläche) und `raumId` sind abgeleitet.
  - **Decken- und Bodenpunkte** setzt man über `x` und `y`. `raumId` ist abgeleitet. `wandId` und `seite` sind null.
  - Das Schema erzwingt diese Kombinationen.
  - `ort` ist eine Ergänzung zum Vorschlag: Ohne das Feld wüsste die Geometrie nicht, ob ein Punkt an der Decke oder am Boden sitzt.
- **Projekt `einrichtung[{id m…, typ, x, y, drehungGrad 0–360, raumId}]`** (höchstens 500). `raumId` ist abgeleitet.
- **Seitenkonvention**, gleich wie bei `aufschlag`: `links` zeigt in Richtung `normale(bis − von) = (−dy, dx)`. Ein Raum liegt immer `links` der Kanten, die er von→bis durchläuft. Auf dem Bildschirm (y nach unten) ist das rechts der Laufrichtung.

### Konsistenz

- `mitRaeumen` ruft am Ende `bereinigeAusstattung` auf, also nach jeder Store-Änderung über `aendere` oder `ersetze`. Dabei passiert Folgendes:
  - Wandpunkte und Wandseiten auf fehlenden Wänden werden entfernt.
  - `abstand` wird auf die Wandlänge begrenzt.
  - `x`, `y` und `raumId` werden neu berechnet.
  - Ist ein Raum weg, wird `raumId` null bzw. auf den neuen Raum an dieser Stelle gesetzt.
- Wand-Operationen:
  - `teileWand` verschiebt Punkte auf die zweite Hälfte und dupliziert die Wandseiten.
  - `verschmelzeKollineare` rechnet Punkte und Seiten um und dreht die Seite, wenn eine Hälfte andersherum lief.
  - `entferneWand` und `verbindeKnoten` entfernen Wandpunkte und Wandseiten.
  - `skaliereProjekt` skaliert Punkte und Möbel mit.
- `pruefeVerweise` prüft Wand- und Raum-Verweise, doppelte IDs und doppelte Wandseiten.

### Helfer (`import … from '<rel>/lib/geometry/index.ts'`, reines TS)

- `raumAnWandseite(p, wandId, seite)` und `raeumeAnWand(p, wandId)` liefern `{links, rechts}`.
- `raumBei(p, pt)` und `raumSucher(p)` finden den Raum zu einem Punkt.
- `wandSeiteBei(p, pt, tol)` liefert `{wandId, seite, abstand, entfernung, raumId}`, gedacht für das Platzieren per Klick.
- `wandAbschnitte(p, raumId)` liefert die Wandabschnitte je Raum: Seite zum Raum, Achs- und Innenpunkte, `laengeInnen`.
- `elektroLage(p, e)` liefert `{plan, position (three), normale, drehungY}`. Ein Modell, das mit `rotation.y = drehungY` gedreht ist, zeigt mit seinem lokalen +z in den Raum.
- `wandFlaechenPunkt` und `seitenNormale`.
- `wirksameWandGestaltung(p, wandId, seite)` liefert den Override, sonst den Wert des Raums.
- `setzeWandSeite`, `gestalteRaeume(p, ids|'alle', teil, stilpaket?)`.
- `fuegeElektroHinzu`, `aendereElektro`, `entferneElektro`, `elektroImRaum` (Grundlage für die Stückliste).
- `fuegeEinrichtungHinzu`, `aendereEinrichtung`, `entferneEinrichtung`.
- `leereRaumGestaltung`.

Beispiel:
```ts
const r = fuegeElektroHinzu(p, { typ: 'steckdose.2fach', ort: 'wand', wandId: 'w3', seite: 'links', abstand: 1.2, hoehe: 0.3 });
st.aendere(() => r!.projekt, 'Steckdose gesetzt.');
st.aendere((p) => setzeWandSeite(p, 'w3', 'links', { wand: { material: 'farbe.matt', farbe: '#3d6300' } }));
```

### 3D (`src/islands/planner/szene/bauen.ts`)

- **Wände**: Jede Wand ist eine Gruppe `wand-<id>` mit drei Meshes:
  - `wand-<id>-links` und `wand-<id>-rechts` mit `userData {art:'wand', id, seite, raumId}`. Die UVs sind in Metern angegeben, u läuft von der jeweiligen Seite aus gesehen nach rechts.
  - `wand-<id>-kante` (Krone, Stirnseiten, Laibungen) mit `seite: null`.
- **Böden** `boden-<raumId>` und **Decken** `decke-<raumId>` haben `{art, id: raumId}`.
  - Decken sind einseitig nach unten gerichtet. Von oben sind sie deshalb unsichtbar und nicht pickbar.
  - Alle Decken liegen in `szene.decken` und lassen sich dort ausblenden, alternativ über `baueSzene(p, {decken:false})`.
- **Fenster und Türen** haben `{art, id, wandId}`.
- `teilVon(hit.object)` liefert die Pick-Daten, `teileWandFlaechen(geo)` ist exportiert.

## Geprüft

- `npm test`: 26 Dateien, 427 Tests grün, davon 19 neu in `tests/unit/geometry/ausstattung.test.ts` und 4 neu in `szene-bauen.test.ts`. Hook-Test 7/7.
- `npm run check`: 0/0/0.
- `npm run build:staging`: grün.
- `raumplaner.spec.ts` (chromium und mobile): 20/20.
- Browser per Playwright (390 × 844, 1440 × 900): 0 Konsolenfehler, 0 CSP-Verstöße, 0 Fremd-Requests. Die 3D-Ansicht baut auf.

## Offen

- `CLAUDE.md` (Abschnitt Planer-Projektmodell) muss auf Version 2 aktualisiert werden. Das ist Aufgabe von architect.
