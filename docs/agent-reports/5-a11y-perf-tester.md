# Phase 5 · a11y-perf-tester · Abnahme Raumplaner (main @ 158214b)

Umgebung: `dist/` (frischer `build:staging`, nicht neu gebaut) per `cp -a` kopiert, `server/server.mjs` auf 127.0.0.1:4500 (Wegwerf-Env, kein Mailpit, keine Kontakt-E2E). Chromium 1243 headless mit SwiftShader (keine GPU), Playwright 1.63, axe-core aus dem Projekt (Tags wcag2a/2aa/21a/21aa/22aa + best-practice), Lighthouse 12.8.2 Mobil (Standard-Drosselung, 5 Läufe je Seite, Median). Profile: Desktop 1440x900, Mobil 390x844 (Touch, DPR 2). Skripte unter dem Scratchpad (`axe9.mjs`, `kbd.mjs`, `func2.mjs`, `qual.mjs`, `walk.mjs`, `rm.mjs`, `kontrast.mjs`, `chunks.mjs`, `lh.sh`).
Einheit der Größen: KiB (1024 B). Hinweis zu den Zahlen aus dem Phase-5-Bericht: 249,8 dort = 249785 Byte = 243,9 KiB.

## Ergebnis je Punkt

| Punkt | Ergebnis |
|---|---|
| axe WCAG 2.2 AA, alle 9 Modi, offene Panels (alle `<details>` geöffnet), Desktop + Mobil, dazu 2D-Variante der Flächenmodi | **bestanden**: 0 Verstöße gegen WCAG-Tags in allen Zuständen. 1 Best-Practice-Verstoß siehe B1 |
| Tastatur: Tasten 1–9 | **bestanden**: von der Werkzeugleiste aus schaltet jede Ziffer den richtigen Modus (1 bauen … 9 ansicht). Auch bei Fokus auf `.planer-3d` |
| Tastatur: Kacheln, Anwenden, Bereich, Raumliste | **bestanden**: Raum per Enter wählen, Kachel per Enter/Leertaste (aria-pressed true, sofort angewendet), Radios per Leertaste, „Anwenden" per Enter (Meldung „Boden in allen Räumen: …") |
| Pipette | **bestanden**: mit Ziel übernimmt Enter das Material und meldet es; ohne Ziel wird sie aktiv geschaltet, Esc beendet. Kein Hänger |
| Undo/Redo | **bestanden**: Strg+Z, Strg+Y, Strg+Umschalt+Z jeweils ein Schritt, Knopfzustände (disabled) stimmen |
| Rundgang WASD | **bestanden**: W, A, S, D, Pfeil links/rechts ändern das Bild (7 verschiedene Bildhashes, Desktop und Mobil), Tab verlässt den Rundgang zu „Rundgang beenden", Enter beendet (Fokus bleibt in der Knopfleiste). Joystick auf Desktop nicht sichtbar (display none), nur Touch |
| Fokus sichtbar, keine Fallen | **bestanden**: je Modus 19–58 Tab-Stopps im Planer (bauen 25, elektro 58, wände 46, boden 37, fliesen 32, decke 26, türen/fenster 19, einrichtung 27, ansicht 22), alle mit Outline oder Box-Shadow, keiner unsichtbar. Tab verlässt den Planer in allen Modi nach vorn und zurück (keine Falle). Desktop und Mobil gleich |
| Kontraste | **teilweise**: Auswahl, Kacheln, Text bestanden; Zonen-Overlay nicht (B2) |
| Reduced-Motion | **bestanden**: 0 laufende Animationen/Transitions in allen 9 Modi, 0 Elemente mit Übergangsdauer > 10 ms, kein GSAP-Request. (Auch ohne Reduced-Motion laufen keine CSS-Animationen, `planer.css:841` hat die Media-Query) |
| No-WebGL-Fallback | **bestanden**: `data-planer-webgl=nein`, alle 9 Modi bedienbar im 2D-Plan (Kacheln 20/12/7/4/10, Elektro 31 Typen), Kachel anwenden und Strg+Z funktioniert, 3D-Tab und Ansicht-Panel zeigen erklärenden Text, axe 0 Verstöße (außer B1), 0 Skriptfehler (Desktop und Mobil) |
| Chunk-Größen / JS-Budget | **bestanden** (Zahlen unten): nur auf `/raumplaner/`, Startlast sinkt gegenüber Phase 4 |
| Texturen bei Bedarf je Kategorie | **bestanden**: siehe unten |
| Mobil reduzierte Qualität | **bestanden** (belegt, siehe unten) |
| 0 Fremd-Requests, 0 CSP-Verstöße, 0 Konsolenfehler | **bestanden**: in allen Läufen (axe, Tastatur, Funktion, Rundgang, Reduced-Motion, No-WebGL, Desktop und Mobil) 0 Fremd-Requests, 0 CSP-Meldungen, 0 `securitypolicyviolation`-Events, 0 Konsolenfehler, 0 Skriptfehler |
| Lighthouse Mobil | **bestanden** (Tabelle unten) |

## Chunk-Größen (Netz = Brotli wie ausgeliefert, KiB)

| Chunk | roh | gz | br | Phase 4 |
|---|---|---|---|---|
| `start.CgYi7dTq.js` (Planer, Startlast) | 243,9 | 73,2 | 63,7 | 152,1 roh / 45,4 gz (BoySIV3m) |
| `client.CY6QLjXo.js` (React) | 213,8 | 65,8 | 56,8 | unverändert |
| `Ansicht3D.DtM478mC.js` (lazy) | 151,3 | 45,9 | 39,4 | 126,9 / 36,4 gz |
| `react-three-fiber.esm.Cbk7kMQI.js` (lazy) | 896,9 | 234,2 | 193,1 | 918,3 / 239,8 gz |
| `scroll.*.js` (GSAP) | 112,5 | 43,6 | 39,4 | auf `/raumplaner/` **nicht mehr geladen** (Phase-4-Befund B3 behoben) |

- Übertragenes JS beim Aufruf von `/raumplaner/` (Start, 8 Dateien): **127,8 KiB br**; nach Vorlage (2D-Editor) unverändert 127,8 KiB; nach erstem Flächenmodus (3D, +2 Chunks) **360,3 KiB br** (Ansicht3D 39,4 + R3F 193,1). Lighthouse meldet für `/raumplaner/` 137,8 KiB Script-Transfer (Phase 4: 154,3 KiB mit GSAP).
- Start+React wuchsen von 378,7 KB roh (Phase 4) auf rund 457 KB roh (+ 79 KB), gz von 116,7 auf rund 139 KB. Planer ist keine Inhaltsseite, das Budget 150 kB gz gilt nur dort: `/` 52,9 KiB, `/kontakt/` 41,9 KiB, `/leistungen/wallbox/` 9,5 KiB (Phase 4, unverändert).
- Planer-, three-, Textur-, pdf-, heic-Chunks werden auf `/`, `/kontakt/`, `/leistungen/wallbox/`, `/styleguide/` nicht angefordert (Playwright-Netzmitschnitt, belegt).

## Texturen (Netzwerk-Mitschnitt, belegt)

- `/raumplaner/` laden und Vorlage starten: 0 Textur-Requests. 3D-Modus Wände öffnen: nur 96-px-Vorschauen (`putz-`, `beton-`, `holz-eiche-vorschau.webp`) für die Kachelvorschau. Boden-Modus lädt `marmor-vorschau.webp`. Fliesen- und Decken-Modus: keine Requests.
- Erst beim Anwenden eines Materials mit Detailtextur: `putz.rau` auf Raum -> `putz-256.webp` (Mobil / Software-Renderer) bzw. `putz-512.webp` (Desktop-Pfad), `boden.parkett` -> `holz-eiche-256|512.webp`. Je Kategorie und erst bei Bedarf.
- Hinweis zur Messung: In diesem Container gilt `leicht` auch auf Desktop-Viewport (SwiftShader-Renderer und 4 Kerne, `src/islands/planner/laden.ts:31`). Den Desktop-Pfad habe ich nur mit überschriebener Renderer-Kennung und `hardwareConcurrency=12` im Messskript gemessen (Projektcode unverändert), er liefert `-512`, Antialias an, 2048er Schattentextur.

## Mobile Qualität (belegt)

| Messgröße | Mobil 390 (natürlich) | Desktop-Pfad (Messskript-Spoof) |
|---|---|---|
| Canvas-Pixelverhältnis (Fenster-DPR 2) | **1,25** (487 px bei 390 CSS-px) | 1,0 (Fenster-DPR 1, Obergrenze 2) |
| Antialias (Kontextattribut) | **aus** | an |
| Größte Textur (texImage2D/texStorage2D) | **256** | 2048 |
| Schattentextur 2048 (Tiefe) | **keine** | 2 Aufrufe (Schatten an) |
| Detailtextur | 256 px | 512 px |

Code: `src/islands/planner/szene/Ansicht3D.tsx:485-489` (dpr, shadows, antialias), `szene/materialien.ts:128,138,141`, `szene/texturen.ts:18`.

## Lighthouse Mobil (5 Läufe)

| Seite | Perf je Lauf | Median | A11y / BP / SEO | LCP Median | TBT Median | CLS | JS-Transfer | Fremd-Req | Phase 4 |
|---|---|---|---|---|---|---|---|---|---|
| `/raumplaner/` (Ziel Perf ≥ 70, A11y ≥ 95) | 97 / 97 / 96 / 98 / 98 | **97** | 100 / 100 / 100 | 2359 ms (`p.planer-klein`) | 113 ms | 0 | 137,8 KiB | 0 | Perf 95, LCP 2537, TBT 160, JS 154,3 |
| `/` | 99 / 98 / 98 / 99 / 99 | **99** | 100 / 100 / 100 | 2029 ms (hero-start.avif) | 9 ms | 0 | 52,9 KiB | 0 | Perf 98–100, LCP 2027, TBT 34 |
| `/kontakt/` (Referenz) | 100 / 99 / 100 / 100 / 100 | 100 | 100 / 100 / 100 | 1697 ms | 12 ms | 0 | 41,9 KiB | 0 | LCP 1735 |

Lighthouse-Läufe ohne GPU: WebGL-Leistung (60 fps, Frame-Zeiten) nicht messbar, siehe „Nicht geprüft".

## Befunde

- **B1 (niedrig, belegt): doppelte Landmark im Modus Decke.** axe `landmark-unique` (best-practice, nicht WCAG-AA), in 3D und 2D, Desktop und Mobil. `.gestalt-panel` (`aria-labelledby` -> „Decke", `src/islands/planner/gestalten/Panel.tsx:845`) und die Gruppe `<section aria-label={gr}>` mit demselben Namen „Decke" (`Panel.tsx:399`) heißen gleich. Fix: Gruppenname ändern (z. B. „Deckenarten") oder `aria-label` an der Gruppe entfernen. Verantwortlich: planner-design.
- **B2 (mittel, belegt durch Berechnung, WCAG 1.4.11 Nicht-Text-Kontrast): Zonen-Overlay unter 3:1.** Gemessen gegen den Plan-Hintergrund `#FBFAF7` (Komposit nach Alpha): waagerechte Zonen im 2D-Plan `rgb(61 99 0 / .35)` -> 1,74:1, senkrechte `rgb(197 138 0 / .75)` -> 2,16:1 (`src/islands/planner/gestalten/gestalten.css:401-408`); Legendenfelder `.gestalt-zone-waagerecht` 2,08:1 und `.gestalt-zone-senkrecht` 1,75:1 (`gestalten.css:393-399`). Die Zonen sind Planungsinformation (DIN 18015-3, Stückliste „außerhalb der Zonen"), daher relevant. Fix: Deckkraft anheben (Ziel ≥ 3:1 gegen `#FBFAF7`, z. B. Kabelgrün `#3D6300` mit Alpha ≥ 0,7, Bernstein dunkler) und/oder Linienmuster zusätzlich zur Farbe (gestrichelt vs. durchgezogen) für Farbunabhängigkeit. 3D-Bänder (halbtransparent) nicht messbar, Vermutung: ähnlich schwach. Verantwortlich: planner-design (Farben mit design-system abstimmen).
- **B3 (niedrig, belegt): Tageszeit-Regler zu niedrig auf Mobil.** `input[type=range]#gestalt-tageszeit` (`Panel.tsx:801`) 366 x 21 px (Desktop 295 x 22 px), unter 24 px Zielhöhe (WCAG 2.5.8, Abstandsausnahme wahrscheinlich, axe meldet keinen Verstoß). Fix: `min-height: 44px` für Touch in `gestalten.css`. Auch `.planer-raum-knopf` unter 44 px auf Mobil (5 Stück, mindestens 24 px). Verantwortlich: planner-design (Raum-Knöpfe: planner-geometry).
- **B4 (niedrig, belegt): Planer-Schalter für Leistungsstufe.** `leicht` wird auch bei echten Desktop-Geräten mit höchstens 4 logischen Kernen gesetzt (`src/islands/planner/laden.ts:31`: `hardwareConcurrency <= 4`). Das trifft viele Büro-Laptops. Folge: weder Schatten noch Antialias noch 512er Texturen. Vermutung zur Relevanz (nicht auf echter Hardware gemessen). Entscheidung bei motion-3d / planner-design, ob Schwelle auf ≤ 2 gesenkt wird.
- **B5 (Hinweis, belegt): 3 axe `incomplete`.** `color-contrast` in allen Zuständen (Canvas-Hintergrund, nicht automatisch entscheidbar), Text im Panel manuell per Heuristik geprüft: kein Text unter 4,5:1 (nur `visually-hidden`-Spans, nicht sichtbar). `label-content-name-mismatch` für die Zoomknöpfe „+", „−", „⤢" (`aria-label` „Vergrößern" usw., Symbol-Inhalt), in Phase 4 schon vorhanden, unkritisch (Planer-Editor, planner-geometry).
- **B6 (Hinweis, belegt): Kachelrand im Normalzustand schwach.** Rand `rgb(21 25 30 / .14)` auf `#F4F1EB` rund 1,3:1. Kein Verstoß, da Name und Vorschau die Kachel erkennbar machen. Zustände „gewählt" (2 px Kabelgrün + 2 px Ring, `#3D6300` auf `#F4F1EB` rund 6,3:1) und Fokus (2 px dunkle Outline plus Ring) sind deutlich. Kein Handlungsbedarf.
- **Phase-4-Befunde:** B1 Überschriftenreihenfolge (axe `heading-order`) und B3 GSAP auf `/raumplaner/` sind behoben (belegt: kein Verstoß, kein `scroll.*.js`-Request). Wandliste-Touchziele (B2 aus Phase 4) auf Mobil nicht mehr in der Meldung.

## Nicht geprüft / Vermutung

- WebGL-Leistung (fps, Speicher), Schatten, Anisotropie und Texturschärfe auf echter GPU und Mittelklasse-Handy; nur Funktion und Rückfallebenen.
- Screenreader (NVDA, VoiceOver): `aria-hidden` auf dem Canvas und `role=application` an `.planer-3d` nur per axe geprüft, nicht gehört.
- Kontrast der 3D-Inhalte (Zonenbänder, Auswahlmarkierung in der Szene, Maßzahlen als CSS2D-Overlay) nicht messbar; 2D-Overlay und Panel gemessen.
- Touch-Joystick und Rundgang per Berührung nicht geprüft (nur Tastatur; Joystick im Desktop-Profil unsichtbar bestätigt).
- Kontakt-Mail-E2E laut Auftrag nicht ausgeführt.
