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

## Fotos (3)

- [ ] Nachweis der Prüfbefugnis des Prüfenden (Ausbildung, Prüfschein) benennen, Formulierung vom Betreiber und der Handwerkskammer bestätigen lassen · `src/content/leistungen/pruefservice-ladesaeulen.md:30`
- [ ] Alternativtext zum Foto, sobald ein Foto vorliegt · `src/content/team/christian-maul.yaml:4`
- [ ] Alternativtext zum Foto, sobald ein Foto vorliegt · `src/content/team/jernar-kassimov.yaml:4`

## Texte (50)

- [ ] Einzugsgebiet vom Betreiber bestätigen lassen · `src/content/faq/einzugsgebiet.yaml:2`
- [ ] Angebotsform und Preisbindung laut AGB, von legal-compliance zu bestätigen · `src/content/faq/komplett-angebot.yaml:2`
- [ ] Fristen gegen DGUV-Primärquelle prüfen · `src/content/faq/pruef-frist.yaml:2`
- [ ] aktuelle Förderlage recherchieren · `src/content/faq/wallbox-foerderung.yaml:2`
- [ ] Sanitärinstallation – ausführendes Gewerk (Partner) in gewerke.yaml noch nicht enthalten, vom Betreiber festlegen · `src/content/leistungen/bad-fliesen.md:21`
- [ ] Umgang mit Sanitär- und Heizungsinstallation klären, ob Leistung angeboten wird und von wem sie ausgeführt wird · `src/content/leistungen/bad-fliesen.md:38`
- [ ] Parkettverlegung im Leistungsumfang ja/nein, vom Betreiber festzulegen · `src/content/leistungen/boden.md:34`
- [ ] technische Mindestanforderungen laut TAB des örtlichen Netzbetreibers prüfen · `src/content/leistungen/elektro-modernisierung.md:40`
- [ ] Hinweis zu rechtlichen Rahmenbedingungen für Wohnungseigentümergemeinschaften nur nach Recherche · `src/content/leistungen/ladepunkte-unternehmen.md:37`
- [ ] Vertragsinhalt und Konditionen vom Betreiber · `src/content/leistungen/pruefservice-ladesaeulen.md:36`
- [ ] Konditionen für Rahmenvereinbarungen · `src/content/leistungen/renovierung-mieterwechsel.md:43`
- [ ] Hinweis auf Trendpakete (Farbwelten), sobald trends/ befüllt ist · `src/content/leistungen/waende-decken.md:35`
- [ ] aktuelle Fördermöglichkeiten (Bund, Land, Kommune, Netzbetreiber) recherchieren; bis dahin keine Förderaussage · `src/content/leistungen/wallbox.md:37`
- [ ] Konditionen und Reaktionszeiten für Rahmenvereinbarungen nur nach Freigabe durch den Betreiber · `src/content/pages/fuer-unternehmen.md:21`
- [ ] Reaktionszeit nur nennen, wenn sie vom Betreiber zugesagt wird · `src/content/pages/kontakt.md:9`
- [ ] Einzugsgebiet vom Betreiber bestätigen lassen · `src/content/pages/kontakt.md:13`
- [ ] Konditionen und Empfehlungsregelung, falls gewünscht und rechtlich geprüft · `src/content/pages/partner.md:13`
- [ ] Anforderungen und Ablauf der Partneraufnahme, vom Betreiber festzulegen · `src/content/pages/partner.md:21`
- [ ] Hinweis ersetzen, sobald erste echte Referenzen mit Einverständnis vorliegen · `src/content/pages/referenzen.md:13`
- [ ] Einzugsgebiet vom Betreiber bestätigen lassen · `src/content/pages/start.md:34`
- [ ] Gründungsjahr und Gründungsgeschichte vom Betreiber · `src/content/pages/ueber-uns.md:9`
- [ ] Partnerbetriebe namentlich nennen, sofern gewünscht und abgestimmt · `src/content/pages/ueber-uns.md:17`
- [ ] Qualifikationsnachweise der Gründer (Abschlüsse, Prüfscheine) mit genauer Bezeichnung, geprüft durch legal-compliance und Betreiber · `src/content/pages/ueber-uns.md:21`
- [ ] Ort, sobald ein echtes Projekt vorliegt · `src/content/referenzen/beispiel-altbauwohnung.md:3`
- [ ] Ort, sobald ein echtes Projekt vorliegt · `src/content/referenzen/beispiel-wallbox-stellplatz.md:3`
- [ ] Anfahrtszeit und Entfernung ab Firmensitz, sobald die Adresse feststeht · `src/content/regionen/bad-kissingen.md:6`
- [ ] konkrete Vorgaben der Stadt/Denkmalbehörde (Kern- und Pufferzone) recherchieren, bevor Aussagen zu Genehmigungen erfolgen · `src/content/regionen/bad-kissingen.md:14`
- [ ] Erfahrungen des Betreibers mit Kurstadt-Bestand · `src/content/regionen/bad-kissingen.md:17`
- [ ] belegte Ortsbesonderheiten für Bergrheinfeld; in der Recherche vom 2026-11-18 wurden keine belastbaren Quellen gefunden, daher bewusst keine Aussage · `src/content/regionen/bergrheinfeld.md:5`
- [ ] Anfahrtszeit und Entfernung ab Firmensitz, sobald die Adresse feststeht · `src/content/regionen/bergrheinfeld.md:6`
- [ ] Anfahrtszeit und Entfernung ab Firmensitz, sobald die Adresse feststeht · `src/content/regionen/gerolzhofen.md:6`
- [ ] Erfahrungen des Betreibers zu Altstadt-Bestand in Gerolzhofen · `src/content/regionen/gerolzhofen.md:14`
- [ ] Auskunft der Denkmalbehörde einholen · `src/content/regionen/gerolzhofen.md:17`
- [ ] Anfahrtszeit und Entfernung ab Firmensitz, sobald die Adresse feststeht · `src/content/regionen/gochsheim.md:6`
- [ ] Erfahrungswerte oder Beobachtungen zu Gebäudebestand in Gochsheim, vom Betreiber · `src/content/regionen/gochsheim.md:17`
- [ ] Anfahrtszeit und Entfernung ab Firmensitz, sobald die Adresse feststeht · `src/content/regionen/grafenrheinfeld.md:6`
- [ ] konkrete Beobachtungen zum Bestand vor Ort, vom Betreiber · `src/content/regionen/grafenrheinfeld.md:14`
- [ ] Anfahrtszeit und Entfernung ab Firmensitz, sobald die Adresse feststeht · `src/content/regionen/hassfurt.md:6`
- [ ] Erfahrungen des Betreibers mit Fachwerk- und Altbaubestand in Haßfurt · `src/content/regionen/hassfurt.md:14`
- [ ] Hinweis nach Rücksprache mit der Denkmalbehörde · `src/content/regionen/hassfurt.md:17`
- [ ] Anfahrtszeit und Entfernung ab Firmensitz, sobald die Adresse feststeht · `src/content/regionen/niederwerrn.md:6`
- [ ] Beobachtungen des Betreibers zum Bestand in Niederwerrn und Oberwerrn · `src/content/regionen/niederwerrn.md:14`
- [ ] Anfahrtszeit und Entfernung ab Firmensitz, sobald die Adresse feststeht · `src/content/regionen/schweinfurt.md:6`
- [ ] Erfahrungswerte RAUMSTROM zu typischen Baujahren und Befunden in Schweinfurt, vom Betreiber · `src/content/regionen/schweinfurt.md:14`
- [ ] Bezug zu konkreten Quartieren erst nach Prüfung · `src/content/regionen/schweinfurt.md:17`
- [ ] Anfahrtszeit und Entfernung ab Firmensitz, sobald die Adresse feststeht · `src/content/regionen/werneck.md:6`
- [ ] Hinweis zu Denkmalschutz nur nach Rücksprache mit Fachstelle (Landratsamt/Denkmalamt) · `src/content/regionen/werneck.md:14`
- [ ] persönlicher Kurztext, Werdegang ohne Nennung früherer oder aktueller Arbeitgeber, vom Betreiber · `src/content/team/christian-maul.yaml:3`
- [ ] genaue Abschlussbezeichnung und Bezeichnung des Prüfscheins mit Aussteller, vom Betreiber und legal-compliance bestätigen lassen · `src/content/team/jernar-kassimov.yaml:3`
- [ ] E-Mail-Adresse für Sicherheitsmeldungen, z. B. sicherheit@raumstrom.de · `public/.well-known/security.txt:2`
