# Trend-Update: Stilpakete pflegen

Stilpakete liegen als je eine Datei unter `src/content/trends/<slug>.json` (Schema: `src/content/trends/_schema.json`, Quelle `src/lib/schemas/trend.ts`). Der Planer wendet ein Paket mit einem Klick auf einen Raum oder die Wohnung an. Neue oder geänderte Pakete kommen nur als Pull Request zur Freigabe, nie direkt auf `main`.

## Feldbedeutungen
- `name`, `beschreibung`: Titel und ein bis zwei Sätze Stilbeschreibung (deutsch, sachlich).
- `gueltig_ab` (Datum JJJJ-MM-TT), `saison` (z. B. `2026/27`): ab wann das Paket als „Trends <Saison>" erscheint.
- `aktiv`: `true` = sichtbar. Veraltete Pakete nicht löschen, sondern auf `false` setzen.
- `trend_quelle_notiz`: interne Notiz mit Quellen und Abrufdatum, erscheint nicht auf der Website.
- `wandfarben`: 2 bis 4 Farben mit eigenem, neutralem Namen (z. B. „Haferweiß") und Hex-Wert `#RRGGBB`. Keine Marken- oder Farbsystem-Namen (kein RAL, NCS, Pantone, keine Herstellernamen).
- `putz_tapete`: `art` (putz, tapete, farbe) und `beschreibung`.
- `boden`: `material` (vinyl, laminat, parkett, fliese, teppich), `farbton`, `verlegemuster`.
- `fliesen` (optional): `format`, `farbe`, `verlegemuster`, `fuge` (Hex).
- `deckenlicht`: `art` und `farbtemperatur_k` (1800 bis 6500; 2700 warmweiß, 3000 neutral-warm).
- `elektro_vorschlag`: `paket` und `punkte` (kurze Sätze).

## Feste Begriffe (der Planer erkennt nur diese)
- `fliesen.format`: „30×60", „60×60", „60×120", „120×120", „7,5×15 Metro", „Hexagon", „Mosaik", „Zellige-Optik".
- `verlegemuster` (Boden und Fliesen): Halbverband, Drittelverband, Kreuzfuge, Diagonal, Fischgrät, Chevron, vertikal gestapelt; nur beim Boden zusätzlich Landhausdiele.
- `putz_tapete.beschreibung` beginnt mit einem dieser Begriffe: Glattputz Q3, Glattputz Q4, Rauputz, Kalkputz, Lehmputz, Betonoptik, Mikrozement, Raufaser, Vlies glatt, Strukturvlies, Glasfaser, Mustertapete, Wandfarbe.
- `elektro_vorschlag.paket`: „Basis", „Komfort", „Smart", „Komfort Plus".
- Klingel nur als Audio. Keine Kameras, keine Alarm- oder „Sicherheitstechnik"-Begriffe, keine Superlative, keine Festpreise (`npm run scan:wording`).

## Prüfen
`npm run trend-schema -- --check`, `npm run scan:wording`, `npm test`.
