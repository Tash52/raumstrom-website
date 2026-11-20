# Phase 4 · planner-geometry · Fixes nach QA und a11y-perf

Basis: main @ 2209622. Befunde aus `4-qa-verifier.md` (B1, B2, B4, B5) und `4-a11y-perf-tester.md` (B1, B2, B4).

## QA B1: flakiger Tastatur-Test (`raumplaner.spec.ts:102`, mobile)

**Ursache (belegt, nicht die vermuteten veralteten Closures):**
1. Nach „Verstanden" in der Kurzanleitung wurde der fokussierte Knopf entfernt, der Fokus fiel auf `<body>`, und die Seite scrollte danach weich (scroll-behavior smooth) von scrollY 378 auf 23, während die Tastatureingaben schon liefen (Messung per rAF-Protokoll im Browser).
2. Die Maus des Tests lag noch über dem Editor (Klickposition „Verstanden"). Durch das Scrollen glitt der Editor unter der ruhenden Maus weg, Chrome sendet dann `pointerout` vom Editor zur Werkzeugleiste (gemessen: `pointerout … planer-svg` → `pointerover … planer-leiste`). React leitet daraus `onPointerLeave` ab, und `Editor2D` setzte den Tastatur-Zeiger auf `null`.
3. Fiel das zwischen `ArrowUp` und `Enter`, fehlte die Richtung, `Enter` nahm die Ersatzrichtung +x: Wand (5,7)→(8,7) überlagerte Wand 3 und teilte sie. Ergebnis exakt wie im QA-Trace: (5,4)→(9,4), (9,4)→(9,7), (9,7)→(8,7), (8,7)→(5,7), „Räume (0)".
   Belegt mit einer Probe auf dem alten Code (Editor2D von 2209622 gebaut): Es wurde nur ein `pointerout` nach `ArrowUp` eingespeist, und die Ausgabe waren genau diese vier Wände mit „Räume (0)". Mit dem neuen Code ergibt dieselbe Probe ein geschlossenes Rechteck mit „Räume (1)".
4. Veraltete Closures traten hier nicht auf (React 19 rendert nach jedem diskreten Ereignis synchron). Gehärtet wurde trotzdem.

**Behebung (`src/islands/planner/Editor2D.tsx`):**
- `zeiger`, `start` und `eingabe` liegen in Refs, die State-Kopie dient nur dem Rendern. `onKeyDown`, `setzeWandPunkt`, `beendeKette` und `tippe` lesen nur noch aus den Refs.
- Die Tastatur behält den Zeiger, bis die Maus sich wirklich bewegt: `pointerleave` der Maus löscht ihn nicht mehr, und Mausbewegungen ohne Weg (gleiche Client-Koordinaten, z. B. beim Scrollen) werden ignoriert.
- Nach `Enter` setzt die Tastatur den Zeiger auf den eingerasteten Startpunkt. Vorher konnte der ungerastete Zeiger um bis zu 2,5 cm vom gerasteten Start abweichen. Die Richtung einer danach getippten Länge war dann zufällig (gleiche Fehlerklasse wie oben).
- Regressionstest `raumplaner.spec.ts` „Tastatur: Maus über dem Editor verliert den Tastatur-Zeiger nicht": Die Maus ruht über dem Editor, nach jeder Pfeiltaste folgen eine Bewegung ohne Weg und ein `pointerout`. Auf dem alten Code schlägt er in beiden Projekten fehl, auf dem neuen ist er grün.

## QA B2: Fokus nach „Verstanden"
`Planer.tsx`: Vor dem Schließen bekommt `[data-planer-editor]` (bzw. `.planer-3d`) den Fokus, mit `preventScroll`. Damit entfällt auch das Scrollen aus B1. Gemessen: scrollY bleibt gleich, `activeElement` ist „Grundriss-Editor". E2E prüft das jetzt mit `toBeFocused()`.

## QA B4: three-bvh-csg-Warnung `maxLeafSize`
three-bvh-csg 0.0.18 ist die neueste Version und übergibt `maxLeafSize` an three-mesh-bvh 0.9.18, das deshalb einmal je Brush warnt. `szene/bauen.ts` nutzt jetzt `CsgKoerper extends Brush`. Diese Klasse überschreibt `prepareGeometry` und erzeugt dieselben Daten: BVH mit `targetLeafSize: 3`, indirect, dazu Half-Edges und Gruppenindizes. Die SharedArrayBuffer-Umwandlung entfällt, sie ist nur für Worker nötig. Auch die Ergebnis-Brushes von `evaluate` sind `CsgKoerper`. Keine Änderung an Abhängigkeiten.
Neuer Unit-Test `tests/unit/geometry/szene-bauen.test.ts`: EFH-Vorlage ohne `console.warn`, Wände mit Öffnung haben mehr als 12 Dreiecke und volle Höhe. Gegenprobe mit `Brush` schlägt fehl.
Die Klasse kann entfallen, sobald three-bvh-csg selbst `targetLeafSize` übergibt.

## QA B5: `z.number().finite()`
`projekt.ts` verwendet jetzt `z.number()` (Zeilen 20, 21, 58, 67). In zod 4 lehnt `z.number()` NaN und ±Infinity ohnehin ab, der Vertrag bleibt also gleich (kein Feld, kein Grenzwert geändert). Neuer Unit-Test prüft NaN/±Infinity für Koordinate, Wanddicke und Fläche. `npm run check`: 0 Fehler, 0 Warnungen, 0 Hinweise. Die unbenutzte Variable `wandArt` in Editor2D ist entfernt.

## a11y B1: Überschriftenfolge
Im Editor-Modus steht jetzt `<h2 class="visually-hidden">Grundriss bearbeiten</h2>` vor der Werkzeugleiste (`Planer.tsx`). Damit gilt h1 (Seitenkopf) → h2 → h3 (Kurzanleitung, Räume, 3D-Ersatz). Der Startbildschirm hat bereits h2 → h3. `src/pages/raumplaner/index.astro` blieb unverändert. E2E prüft das h2.

## a11y B2: Tippziele
`planer.css`: `.planer-link` und `.planer-gruppe summary` haben `min-height: 1.5rem` (24 px), bei `pointer: coarse` 2.75rem (44 px). Die Wandliste ist auf Touch volle Breite ohne Lücke. Die Summary ist jetzt flex mit eigenem Dreieck (`::before`, dreht sich bei `[open]`), der WebKit-Marker ist ausgeblendet. E2E misst die Höhe: ≥ 24 px Desktop, ≥ 44 px Pixel 7.

## a11y B4: Kontraste (manuell gerechnet, WCAG-Formel, Tokens aus `tokens.css`)
Text (≥ 4,5:1), alles bestanden:
- Graphit auf Kalk/Kalk-tief/Kalk-hell: 15,7 / 13,8 / 16,9.
- Grau-Text: auf Kalk 6,2, auf Kalk-tief 5,5, auf Kalk-hell 6,7, auf Raumfüllung 6,2, auf gewähltem Raum 6,1, auf starker Rasterlinie 5,1.
- Kabelgrün (Links, aktives Maß) auf Kalk/Kalk-hell/Kalk-tief: 6,2 / 6,7 / 5,5.
- Fehler: #b42318 auf Kalk 5,8; Fehlermeldung Kalk auf #b42318 5,8.
- Meldung und Längeneingabe (Kalk auf Graphit .88): 11,1. Zoom- und 3D-Knöpfe (Graphit auf Kalk .92, schlechtester Untergrund): 13,4. Ablage aktiv: 16,1.
- Deaktivierte Knöpfe (opacity .45): nach WCAG ausgenommen.

UI (≥ 3:1):
- Ränder `--line-strong`: auf Kalk/Kalk-hell/Kalk-tief 3,6 / 3,9 / 3,15.
- Wand Graphit auf Kalk-hell 16,9; gewählte Wand und Öffnung (Kabelgrün) 6,7; Fokus Graphit plus Strom-Glow; Werkzeug-Marke Strom auf Graphit 13,3.

Korrigiert:
- Gewählter Eckpunkt: Die Strom-Füllung allein hatte 1,3:1. Jetzt trägt ein Kabelgrün-Ring 3 px den Zustand (6,7:1).
- Maßzahlen `.mass` hatten keinen Halo und lagen direkt auf Raster bzw. hochgeladenem Grundriss. Jetzt haben sie einen Kalk-hell-Halo wie `.mass-aktiv`.

Bewusst belassen (Restrisiko):
- Die Füllung des gewählten Raums hat 1,1:1. Der Zustand steht zusätzlich im Seitenpanel (Raum-Fieldset, Listeneintrag mit Graphit-Rand und Strom-Balken). Eine Kontur liegt unter den Wänden (Achspolygon) und wäre nicht sichtbar.
- Die Öffnungsvorschau (Strom .85) liegt auf der Graphit-Wand (13:1) und ist nur vorübergehend sichtbar.

Strom-Grün kommt nirgends als Text auf hellem Grund vor, nur als Füllung oder Marke.

## Prüfläufe (Worktree, nach `npm ci`)
- `npm test`: Vitest 25 Dateien / 404 Tests grün, Hook-Test 7/7.
- `npm run check`: 0/0/0. `npm run scan:wording`: sauber. `npm run build:staging`: ok.
- `raumplaner.spec.ts --repeat-each=5`, beide Projekte: **100/100 grün**.
- Ganze E2E-Suite (`E2E_MAILPIT=extern`, fremder Stub auf 8025): 205 grün, 5 übersprungen (bewusst), 10 rot, alle in `kontakt-api.spec.ts` (5 je Projekt). Ursache ist der Stub: Er liefert kein `messages_count` bzw. keine Mails (`Received: undefined`). Rot sind damit die Mail-Tests sowie zusätzlich „Ohne JavaScript …", das ebenfalls das Mail-Postfach abfragt. Außerhalb von `kontakt-api` ist nichts rot.

## Offen
- Die Kurzanleitung bleibt nicht-modal und deckt den Editor ab (bewusst, QA-Hinweis).
- Labels „Art"/„Wandstärke" (21 px) sind keine eigenen Tippziele, die Felder darunter haben 44 px. Unverändert.
