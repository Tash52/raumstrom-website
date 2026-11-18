# Offene Inhalte vor dem Launch

Automatisch erzeugt mit `npm run platzhalter` am 2026-11-18. Nicht von Hand bearbeiten, sondern die genannte Datei ändern (am einfachsten per Keystatic: `npm run dev`, dann http://localhost:4321/keystatic) und den Befehl erneut ausführen.

`npm run check:launch` schlägt fehl, solange hier etwas offen ist.

## Zu bestätigende Annahmen

- [ ] Rechtsform GbR (`src/content/settings/firma.yaml`, Feld `rechtsform`)
- [ ] Domain `raumstrom.de` (Feld `domain`)
- [ ] Gewerke-Matrix: Ausführung eigen/partner je Gewerk (`src/content/settings/gewerke.yaml`)
- [ ] Server-Secrets auf dem Server in `.env` gesetzt (Vorlage `.env.example`; `npm run check:launch` prüft sie)

## Rechtliches (53)

- [ ] Vertragsmodell festlegen: RAUMSTROM als Vertragspartner mit Meister-Partnerbetrieben als Nachunternehmer (dieser Entwurf) oder Direktvertrag zwischen Kunde und Partnerbetrieb; danach Abschnitt „Ausführung durch Meister-Partnerbetriebe“ anpassen · `src/content/legal/agb.md:11`
- [ ] Bindefrist für Angebote, z. B. 30 Tage · `src/content/legal/agb.md:27`
- [ ] Falls die Kleinunternehmerregelung nach § 19 UStG angewendet wird: „Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.“ statt des vorstehenden Satzes · `src/content/legal/agb.md:53`
- [ ] Zahlungsziel, z. B. 14 Tage · `src/content/legal/agb.md:65`
- [ ] Ergebnis der Barrierefreiheitsprüfung vor Launch (a11y-perf-tester): z. B. „Die Website ist mit WCAG 2.2 Stufe AA weitgehend vereinbar. Geprüft am … mit automatischen Tests (axe-core) und manueller Prüfung per Tastatur und Screenreader.“ · `src/content/legal/barrierefreiheit.md:22`
- [ ] Abgleich mit Planer-Agenten und a11y-Prüfung: Welche Teile sind nicht vollständig barrierefrei, und welche Alternative gibt es (z. B. Anfrage über das Kontaktformular mit Fotos und Maßen)? · `src/content/legal/barrierefreiheit.md:34`
- [ ] Antwortfrist, z. B. fünf Werktagen · `src/content/legal/barrierefreiheit.md:40`
- [ ] Abgleich mit Planer-Agenten: Schlüsselname · `src/content/legal/cookie-einstellungen.md:21`
- [ ] Abgleich mit backend-api: kein Cookie (Token im Formular) oder Cookie-Name · `src/content/legal/cookie-einstellungen.md:22`
- [ ] Laufzeit oder „wird nicht gespeichert“ · `src/content/legal/cookie-einstellungen.md:22`
- [ ] Name und Anschrift des Hosters, Serverstandort Deutschland · `src/content/legal/datenschutz.md:36`
- [ ] Speicherdauer der Server-Logfiles beim Hoster, z. B. 7 Tage · `src/content/legal/datenschutz.md:48`
- [ ] Abgleich mit backend-api: Art und Dauer der Speicherung beim Rate-Limit, z. B. nur im Arbeitsspeicher, höchstens 1 Stunde · `src/content/legal/datenschutz.md:50`
- [ ] Abgleich mit backend-api: Pflicht- und freiwillige Felder, z. B. Name, E-Mail-Adresse, Telefonnummer (freiwillig), Ort des Vorhabens, Nachricht, Dateianhänge · `src/content/legal/datenschutz.md:58`
- [ ] Abgleich mit backend-api: bestätigen, dass der Server Anfragen und Anhänge nach dem Versand nicht dauerhaft speichert · `src/content/legal/datenschutz.md:62`
- [ ] Löschfrist für Anfragen ohne Auftrag, z. B. 6 Monate · `src/content/legal/datenschutz.md:64`
- [ ] Abgleich mit backend-api/Planer: werden Metadaten vor dem Versand entfernt? Falls ja: „Wir entfernen diese Metadaten vor dem Versand.“ Falls nein: „Entfernen Sie diese bei Bedarf vor dem Hochladen.“ · `src/content/legal/datenschutz.md:72`
- [ ] Name und Anschrift des SMTP-Anbieters, Serverstandort · `src/content/legal/datenschutz.md:100`
- [ ] Abgleich mit backend-api: Erhalten Absender eine Eingangsbestätigung per E-Mail? Falls ja, hier beschreiben. · `src/content/legal/datenschutz.md:102`
- [ ] Abgleich mit backend-api: Wie ist der CSRF-Schutz umgesetzt (Token im Formular ohne Cookie, oder technisch notwendiges Cookie mit Name und Laufzeit)? Ergebnis auch auf der Seite Cookie-Einstellungen eintragen. · `src/content/legal/datenschutz.md:110`
- [ ] Weitergabe an Partnerbetriebe bestätigen: erst nach Ihrer Zustimmung im Angebotsgespräch oder bereits bei der Kalkulation? Rechtliche Einordnung (eigene Verantwortliche, Auftragsverarbeitung) mit dem Rechtstexte-Service klären. · `src/content/legal/datenschutz.md:122`
- [ ] Anschrift und Website des BayLDA aus der Behördenseite übernehmen (am 18.11.2026 nicht geprüft) · `src/content/legal/datenschutz.md:147`
- [ ] Registereintrag, z. B. „Gesellschaftsregister, Amtsgericht …, GsR …“, oder Zeile löschen, wenn die Gesellschaft in keinem Register eingetragen ist · `src/content/legal/impressum.md:25`
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
- [ ] Entwurf: vor Veröffentlichung durch Rechtstexte-Service oder Anwalt prüfen lassen · `src/content/legal/impressum.md`
- [ ] Entwurf: vor Veröffentlichung durch Rechtstexte-Service oder Anwalt prüfen lassen · `src/content/legal/datenschutz.md`
- [ ] Entwurf: vor Veröffentlichung durch Rechtstexte-Service oder Anwalt prüfen lassen · `src/content/legal/agb.md`
- [ ] Entwurf: vor Veröffentlichung durch Rechtstexte-Service oder Anwalt prüfen lassen · `src/content/legal/widerruf.md`
- [ ] Entwurf: vor Veröffentlichung durch Rechtstexte-Service oder Anwalt prüfen lassen · `src/content/legal/cookie-einstellungen.md`
- [ ] Entwurf: vor Veröffentlichung durch Rechtstexte-Service oder Anwalt prüfen lassen · `src/content/legal/barrierefreiheit.md`
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
