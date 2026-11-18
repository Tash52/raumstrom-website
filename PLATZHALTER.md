# Offene Inhalte vor dem Launch

Automatisch erzeugt mit `npm run platzhalter` am 2026-11-18. Nicht von Hand bearbeiten, sondern die genannte Datei ändern (am einfachsten per Keystatic: `npm run dev`, dann http://localhost:4321/keystatic) und den Befehl erneut ausführen.

`npm run check:launch` schlägt fehl, solange hier etwas offen ist.

## Zu bestätigende Annahmen

- [ ] Rechtsform GbR (`src/content/settings/firma.yaml`, Feld `rechtsform`)
- [ ] Domain `raumstrom.de` (Feld `domain`)
- [ ] Gewerke-Matrix: Ausführung eigen/partner je Gewerk (`src/content/settings/gewerke.yaml`)
- [ ] Server-Secrets auf dem Server in `.env` gesetzt (Vorlage `.env.example`; `npm run check:launch` prüft sie)

## Rechtliches (30)

- [ ] vollständiger Name der Gesellschaft laut Gesellschaftsvertrag · `src/content/settings/firma.yaml:6`
- [ ] vollständiger Name Gesellschafter 1 (Christian Maul?) · `src/content/settings/firma.yaml:9`
- [ ] vollständiger Name Gesellschafter 2 (Jernar Kassimov?) · `src/content/settings/firma.yaml:11`
- [ ] USt-IdNr. (DE + 9 Ziffern) oder leer lassen, falls nicht vorhanden · `src/content/settings/firma.yaml:24`
- [ ] Wirtschafts-Identifikationsnummer oder leer lassen, falls noch nicht zugeteilt · `src/content/settings/firma.yaml:25`
- [ ] Anschrift der Handwerkskammer für Unterfranken · `src/content/settings/firma.yaml:28`
- [ ] Eintragung Handwerksrolle bzw. Verzeichnis zulassungsfreier Handwerke, oder leer lassen · `src/content/settings/firma.yaml:29`
- [ ] Berufsbezeichnung · `src/content/settings/firma.yaml:30`
- [ ] Name des Versicherers · `src/content/settings/firma.yaml:35`
- [ ] Anschrift des Versicherers · `src/content/settings/firma.yaml:36`
- [ ] räumlicher Geltungsbereich, z. B. Deutschland · `src/content/settings/firma.yaml:37`
- [ ] Verantwortlich für redaktionelle Inhalte nach § 18 Abs. 2 MStV · `src/content/settings/firma.yaml:39`
- [ ] Anschrift der verantwortlichen Person · `src/content/settings/firma.yaml:40`
- [ ] Rechtstext fehlt · `src/content/legal/impressum.md`
- [ ] Rechtstext fehlt · `src/content/legal/datenschutz.md`
- [ ] Rechtstext fehlt · `src/content/legal/agb.md`
- [ ] Rechtstext fehlt · `src/content/legal/widerruf.md`
- [ ] Rechtstext fehlt · `src/content/legal/cookie-einstellungen.md`
- [ ] Rechtstext fehlt · `src/content/legal/barrierefreiheit.md`
- [ ] Koordination aller Gewerke: Formulierung von der HWK Unterfranken prüfen lassen · `src/content/settings/gewerke.yaml`
- [ ] Demontage und Entkernung: Formulierung von der HWK Unterfranken prüfen lassen · `src/content/settings/gewerke.yaml`
- [ ] Trockenbau: Formulierung von der HWK Unterfranken prüfen lassen · `src/content/settings/gewerke.yaml`
- [ ] Bodenbelag (Vinyl, Laminat, Teppich): Formulierung von der HWK Unterfranken prüfen lassen · `src/content/settings/gewerke.yaml`
- [ ] Elektroinstallation: Formulierung von der HWK Unterfranken prüfen lassen · `src/content/settings/gewerke.yaml`
- [ ] Wallbox-Installation: Formulierung von der HWK Unterfranken prüfen lassen · `src/content/settings/gewerke.yaml`
- [ ] Zählerschrank und Unterverteilung: Formulierung von der HWK Unterfranken prüfen lassen · `src/content/settings/gewerke.yaml`
- [ ] Fliesen und Bad: Formulierung von der HWK Unterfranken prüfen lassen · `src/content/settings/gewerke.yaml`
- [ ] Putz und Stuck: Formulierung von der HWK Unterfranken prüfen lassen · `src/content/settings/gewerke.yaml`
- [ ] Malerarbeiten: Formulierung von der HWK Unterfranken prüfen lassen · `src/content/settings/gewerke.yaml`
- [ ] Prüfservice DGUV V3 (Ladesäulen, Wallboxen, Ladekabel): Formulierung von der HWK Unterfranken prüfen lassen · `src/content/settings/gewerke.yaml`

## Kontaktdaten (18)

- [ ] Straße und Hausnummer, ladungsfähig, kein Postfach · `src/content/settings/firma.yaml:14`
- [ ] Postleitzahl · `src/content/settings/firma.yaml:15`
- [ ] Ort · `src/content/settings/firma.yaml:16`
- [ ] Telefonnummer im Format +49… · `src/content/settings/firma.yaml:19`
- [ ] Telefonnummer zur Anzeige, z. B. 09721 … · `src/content/settings/firma.yaml:20`
- [ ] allgemeine E-Mail-Adresse, z. B. info@raumstrom.de · `src/content/settings/firma.yaml:21`
- [ ] Empfängeradresse für Anfragen aus Kontaktformular und Raumplaner · `src/content/settings/firma.yaml:22`
- [ ] Einzugsgebiet in einem Satz, z. B. Schweinfurt und Umland · `src/content/settings/firma.yaml:42`
- [ ] Erreichbarkeit, z. B. 8:00–17:00 Uhr · `src/content/settings/firma.yaml:83`
- [ ] Schweinfurt: bestätigen, dass der Ort bedient wird (bestaetigt: true) · `src/content/settings/firma.yaml`
- [ ] Gochsheim: bestätigen, dass der Ort bedient wird (bestaetigt: true) · `src/content/settings/firma.yaml`
- [ ] Grafenrheinfeld: bestätigen, dass der Ort bedient wird (bestaetigt: true) · `src/content/settings/firma.yaml`
- [ ] Bergrheinfeld: bestätigen, dass der Ort bedient wird (bestaetigt: true) · `src/content/settings/firma.yaml`
- [ ] Niederwerrn: bestätigen, dass der Ort bedient wird (bestaetigt: true) · `src/content/settings/firma.yaml`
- [ ] Werneck: bestätigen, dass der Ort bedient wird (bestaetigt: true) · `src/content/settings/firma.yaml`
- [ ] Haßfurt: bestätigen, dass der Ort bedient wird (bestaetigt: true) · `src/content/settings/firma.yaml`
- [ ] Gerolzhofen: bestätigen, dass der Ort bedient wird (bestaetigt: true) · `src/content/settings/firma.yaml`
- [ ] Bad Kissingen: bestätigen, dass der Ort bedient wird (bestaetigt: true) · `src/content/settings/firma.yaml`

## Texte (1)

- [ ] E-Mail-Adresse für Sicherheitsmeldungen, z. B. sicherheit@raumstrom.de · `public/.well-known/security.txt:2`
