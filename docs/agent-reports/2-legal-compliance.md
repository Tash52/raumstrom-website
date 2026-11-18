# Phase 2b · legal-compliance · Rechtstext-Entwürfe und Gewerke-Kennzeichnung

Stand: 18.11.2026 · Worktree-Branch `worktree-agent-aff84475c01290f4b` · **Keine Rechtsberatung.** Alle Texte sind Entwürfe (`entwurf: true` + Kopfvermerk) und müssen vor Veröffentlichung durch einen Rechtstexte-Service mit Abmahnschutz oder einen Anwalt geprüft werden.

## 1. Geändert

| Datei | Inhalt |
|---|---|
| `src/content/legal/impressum.md` | § 5 DDG, Register (Platzhalter), USt-IdNr./W-IdNr. bedingt, HWK/Eintragung/Berufsrecht, Transparenzhinweis Partnerbetriebe, Betriebshaftpflicht (DL-InfoV), § 18 Abs. 2 MStV, § 36 VSBG, Urheberrecht. **Kein Hinweis auf die EU-OS-Plattform** (auch nicht im Kommentar). |
| `src/content/legal/datenschutz.md` | Verantwortlicher, DSB-Hinweis (§ 38 BDSG), Hosting/Logfiles, Rate-Limit, TLS, Kontaktformular, Uploads (Metadaten), Raumplaner, KI-Analyse Mistral (nur bei `features.floorplan_ai`), E-Mail-Versand, ALTCHA, CSRF (offen), Browser-Speicher (§ 25 Abs. 2 Nr. 2 TDDDG), Weitergabe an Partnerbetriebe, Art. 22, Betroffenenrechte, Widerspruch, BayLDA. |
| `src/content/legal/agb.md` | B2C/B2B gekennzeichnet (**[Verbraucher]**/**[Unternehmer]**), Kostenvoranschlag (§ 649 BGB), Verbraucherbauvertrag (§ 650i), **§ 4 Ausführung durch Meister-Partnerbetriebe (transparent)**, Preise (Gesamtpreise / § 19 UStG offen), Abschläge (§ 632a, § 650m), Mitwirkung, Abnahme inkl. Textform-Hinweis (§ 640 Abs. 2), Mängelrechte ohne Verkürzung (§ 634a), Haftung (keine Beschränkung bei Leben/Körper/Gesundheit, Vorsatz, grober Fahrlässigkeit), Eigentumsvorbehalt, Prüfservice-Laufzeit (§ 309 Nr. 9), Widerruf, VSBG, Gerichtsstand nur B2B. |
| `src/content/legal/widerruf.md` | Belehrung A (Muster Anlage 1 EGBGB, Variante Dienstleistung), Hinweise zu vorzeitigem Beginn/Erlöschen/Wertersatz/dringender Reparatur, Belehrung B (Verbraucherbauvertrag, Muster Anlage 10), Muster-Widerrufsformular (Anlage 2). |
| `src/content/legal/cookie-einstellungen.md` | Keine einwilligungspflichtigen Cookies, Tabelle der Browser-Speicherungen (Planer-Entwurf, CSRF offen), Löschen, Consent-Block nur bei `features.consent_manager`. |
| `src/content/legal/barrierefreiheit.md` | Freiwillige Erklärung (BFSG-Ausnahme Kleinstunternehmen), Ziel WCAG 2.2 AA, Stand (Platzhalter für a11y-Prüfung), Einschränkungen Planer, Feedback-Kontakt. |
| `PLATZHALTER.md` | per `npm run platzhalter` neu erzeugt. |

## 2. Schnittstelle für page-builder: Marker in Rechtstexten

In `src/lib/content/` gab es keine Ersetzungs-Konvention (nur `[[PLATZHALTER: …]]` für fehlende Werte). Neu festgelegt, nur für `src/content/legal/*.md`:

1. **Wert:** `{{firma.<pfad>}}` – Punktpfad in das Objekt aus `getFirma()`, z. B. `{{firma.kontakt.email}}`, `{{firma.adresse.plz}}`, `{{firma.handwerk.berufsrecht_url}}`.
   - Listen: `{{firma.gesellschafter.*.name}}` = alle Namen, verbunden mit „, " und vor dem letzten mit „ und ".
   - Abgeleitet: `{{firma.vertretungsberechtigte}}` = Namen aller `gesellschafter` mit `vertretungsberechtigt: true`, gleiche Verbindung.
   - Unbekannter Pfad oder Wert, der kein String ist: **Build abbrechen** (wie unbekannte Gewerke-IDs).
   - Wert ist ein `[[PLATZHALTER: …]]`: unverändert ausgeben (Staging zeigt ihn, `check:launch` blockiert ohnehin).
   - Ausgabe HTML-escapen. Empfohlen: `kontakt.email` als `mailto:`-Link, `kontakt.telefon_anzeige` als `tel:`-Link mit `kontakt.telefon`, Pfade auf `_url` als Link. Marker stehen nie in Markdown-Link-Zielen (würden URL-kodiert).
2. **Bedingter Block:** eigene Zeilen mit Leerzeilen davor und danach
   `<!-- wenn firma.<pfad> -->` … `<!-- /wenn -->` bzw. `<!-- wenn features.<flag> -->` … `<!-- /wenn -->`.
   Block bleibt, wenn der Wert ein nicht leerer String (auch Platzhalter) oder `true` ist, sonst wird er samt Inhalt entfernt. Keine Verschachtelung. Regex: `/<!-- wenn ([\w.]+) -->([\s\S]*?)<!-- \/wenn -->/g`.
   Verwendet: `firma.steuer.ust_idnr`, `firma.steuer.w_idnr`, `firma.handwerk.eintragung`, `firma.handwerk.berufsbezeichnung`, `features.floorplan_ai`, `features.consent_manager`.
3. **Kommentare entfernen:** Nach den Ersetzungen alle übrigen HTML-Kommentare (`<!-- … -->`, inkl. Kopfvermerk und Quellenvermerke) aus der Ausgabe streichen. Sie sind interne Prüfvermerke.
4. **Wo ersetzen:** Funktioniert auf `entry.body` (Markdown) und auf dem gerenderten HTML. Geprüft: Astros Markdown-Pipeline (satteri) lässt `{{…}}` und die Kommentare unverändert durch (`node_modules/.astro/data-store.json` nach `build:staging`). Harte Zeilenumbrüche sind als `\` am Zeilenende geschrieben (rendern als `<br>`), damit kein Inline-HTML nötig ist.
5. `stand` aus dem Frontmatter als „Stand: TT.MM.JJJJ" anzeigen; Seiten mit `entwurf: true` nie im Produktions-Build ausliefern.

Empfehlung an architect: eine kleine pure Funktion `fuelleRechtstext(text, firma, features)` in `src/lib/content/` mit Unit-Test (Pfad, Liste, Bedingung, unbekannter Pfad bricht ab, Escape).

## 3. Prüfung zeitabhängiger Angaben (Primärquellen, abgerufen 18.11.2026)

| Punkt | Ergebnis | Quelle |
|---|---|---|
| W-IdNr. | **Belegt:** Pflichtangabe, sobald eine W-IdNr. nach § 139c Abs. 1 AO „besessen" wird (§ 5 Abs. 1 Nr. 6 DDG). Ein Stichtag „ab Dezember 2026" steht nicht im Gesetz; er betrifft nur den Vergabezeitplan (Sekundärquellen: Vergabe stufenweise seit 2024, Abschluss 2026; **ungeprüft**). | gesetze-im-internet.de/ddg/__5.html, /ao_1977/__139c.html |
| DDG § 5 | Belegt (Nr. 1–6 übernommen). Nr. 4 Register: firma.yaml hat kein Feld (Befund). | ddg/__5.html |
| MStV § 18 Abs. 2 | **Ungeprüft** (Staatsvertrag, nicht auf gesetze-im-internet.de; andere Quellen nicht freigegeben). Angabe trotzdem aufgenommen. | – |
| VSBG § 36 | Belegt. Abs. 3: Ausnahme von Abs. 1 Nr. 1 bei ≤ 10 Beschäftigten am 31.12. des Vorjahres; Erklärung trotzdem freiwillig aufgenommen (Website und AGB). § 37 (nach Streitfall, Textform) bleibt. | vsbg/__36.html, __37.html |
| EU-OS-Plattform | Kein Link, kein Hinweis. Aufhebung der ODR-VO durch VO (EU) 2024/3228 mit Wirkung zum 20.07.2025: nur Sekundärquellen (IHK, Kanzleien), Amtsblatt **nicht primär geprüft**. | – |
| Art. 50 KI-VO | **Nicht primär geprüft** (EUR-Lex nicht freigegeben). Sekundärquellen: Art. 50 gilt seit 02.08.2026, durch das Digital-Omnibus-Paket nicht verschoben (nur Übergangsfrist für Kennzeichnung nach Art. 50 Abs. 2 bei Altsystemen). Die Grundriss-Erkennung als Betreiber fällt nach vorläufiger Einschätzung nicht unter Art. 50 Abs. 1/4; KI-Kennzeichnung im Tool trotzdem empfohlen. | – |
| TDDDG § 25 | Belegt: Abs. 2 Nr. 2 deckt Planer-Entwurf im localStorage auf Klick; kein Banner nötig, solange nichts Einwilligungspflichtiges hinzukommt. | ttdsg/__25.html |
| BFSG | Belegt: gilt für „Dienstleistungen im elektronischen Geschäftsverkehr" (§ 1 Abs. 3 Nr. 5, Def. § 2 Nr. 26: auf Anfrage des Verbrauchers „im Hinblick auf den Abschluss eines Verbrauchervertrags"). **Ausnahme für Kleinstunternehmen**, die Dienstleistungen erbringen (§ 3 Abs. 3; § 2 Nr. 17: < 10 Beschäftigte und ≤ 2 Mio. € Umsatz oder Bilanzsumme). Ergebnis: für RAUMSTROM nach aktuellem Stand **nicht verpflichtend**; Erklärung freiwillig. Ob Anfrage-Formulare überhaupt unter § 2 Nr. 26 fallen: offen. | bfsg/__1, __2, __3, __14.html |
| Widerruf | Belegt: Muster Anlage 1/2/10 EGBGB im aktuellen Wortlaut übernommen. § 356a BGB (Widerrufsfunktion) gilt nur für Verträge, die über eine Online-Benutzeroberfläche geschlossen werden – hier nicht der Fall, Baustein nicht aufgenommen. Verbraucherbauvertrag: eigene Belehrung (§ 650l BGB, § 312 Abs. 2 Nr. 3). | bgb/__312, __312g, __356, __356a, __357a, __650i, __650l; bgbeg/art_253anlage_1, _2, _10 |
| Weitere | § 38 BDSG (DSB ab 20 Personen), § 147 AO (6/8/10 Jahre), §§ 309, 634a, 640, 649, 650m BGB, § 2 DL-InfoV belegt. § 650j/§ 650k BGB nicht abrufbar (ungeprüft). BayLDA-Anschrift: nicht geprüft → Platzhalter. | jeweilige §§ |

## 4. Gewerke-Kennzeichnung (Bewertung, Code nicht geändert)

**Belegt (HwO, abgerufen 18.11.2026):** Anlage A enthält u. a. Nr. 9 Stuckateure, Nr. 10 Maler und Lackierer, Nr. 24 Installateur und Heizungsbauer, Nr. 25 Elektrotechniker, Nr. 42 Fliesen-, Platten- und Mosaikleger, Nr. 46 Parkettleger, Nr. 52 Raumausstatter. „Bodenleger" steht in Anlage B Abschnitt 2 (handwerksähnlich, Anzeigepflicht § 18 HwO). § 1 Abs. 1 HwO: selbständiger Betrieb nur mit Eintragung; GbR ausdrücklich erfasst. § 51 HwO schützt die Bezeichnung „Meister" in Verbindung mit zulassungspflichtigen Handwerken. **§ 7 Abs. 2 HwO:** Absolventen staatlicher Fachschulen für Technik werden mit dem Handwerk eingetragen, dem ihr Schulschwerpunkt entspricht.

Gut gelöst:
- Hinweistext zentral (`PARTNER_HINWEIS`), Daten nur aus `gewerke.yaml`, unbekannte IDs brechen den Build ab, Matrix ohne Code umstellbar, Test vorhanden (`tests/unit/gewerke.test.ts`).
- `GewerkeHinweis.astro` nennt die betroffenen Gewerke (Standard `nennen = true`), steht im Textfluss in Fließtextfarbe mit Icon, also sichtbar und nicht als Fußnote.

Befunde:
1. **Startseite (page-builder, `src/pages/index.astro:15-16`):** „Modernisierung aus einer Hand" erhält `GewerkeHinweis gewerke={['koordination', 'elektroinstallation']}` und nennt damit nur „Elektroinstallation". Der Claim umfasst aber auch Fliesen, Putz und Maler. Nach dem Gesamteindruck entsteht dann der Eindruck, diese Gewerke würden selbst ausgeführt (§ 5 Abs. 2 Nr. 3 UWG). An jedem „aus einer Hand"-Claim müssen **alle** Partner-Gewerke stehen (z. B. alle IDs mit `ausfuehrung: partner` aus `getGewerke()`).
2. **Singular (architect, `src/lib/schemas/gewerke.ts`, `PARTNER_HINWEIS`):** „unseren Meister-Partnerbetrieb" bei mehreren genannten Gewerken (Elektro, Fliesen, Putz, Maler) unterstellt einen einzigen Betrieb. Wenn das nicht stimmt, ist das eine unzutreffende Angabe. Vorschlag: bei mehr als einem Partner-Gewerk die Pluralform „Ausführung durch unsere Meister-Partnerbetriebe" verwenden. Der Wortlaut ist im Briefing festgelegt, deshalb entscheidet der Betreiber. Test und Konstante pflegt architect.
3. **„Meister-" muss stimmen:** Nur zulässig, wenn jeder Partnerbetrieb tatsächlich von einem Meister (oder einer Person mit gleichwertiger Berechtigung, diese Bezeichnung zu führen) geleitet wird. Bei Eintragung per Ausnahmebewilligung oder Ausübungsberechtigung wäre „eingetragener Partnerbetrieb" richtig. Das muss der Betreiber je Partner bestätigen. „fest" nur bei vertraglicher Bindung.
4. **Eigene Gewerke sind nicht automatisch frei:** Bodenbelag (Vinyl, Laminat, Teppich) ist Bodenleger, Anlage B2 (anzeigepflichtig nach § 18 HwO), überschneidet sich aber mit Raumausstatter (A 52) und Parkettleger (A 46). Trockenbau überschneidet sich mit Stuckateuren (A 9), der Prüfservice DGUV V3 mit Elektrotechnikern (A 25). Die Abgrenzung muss die HWK Unterfranken vornehmen (`hinweis_hwk_geprueft` bleibt deshalb zu Recht `false`).
5. **Chance:** Nach § 7 Abs. 2 HwO kann ein staatlich geprüfter Techniker (Fachschule für Technik, Schwerpunkt Elektrotechnik) mit dem Elektrotechniker-Handwerk eingetragen werden. Ob der Abschluss des Gründers das erfüllt, sollte der Betreiber mit der HWK klären. Wird er eingetragen, stellt man elektroinstallation, wallbox-installation und zaehlerschrank auf `eigen` um. Die Bezeichnung „Meister" darf er trotzdem nicht führen (§ 51 HwO).
6. **Außerhalb der Website:** Schema.org-Angaben (page-builder/seo), Meta-Descriptions und Branchenkategorien im Google-Unternehmensprofil (z. B. „Elektriker", „Fliesenleger") dürfen keine Eigenausführung behaupten.
7. **Nicht primär geprüft:** OLG Rostock, 2 U 11/20 (aus dem Briefing; Rechtsprechungsdatenbanken nicht freigegeben). Die Werbung selbst als Verstoß gegen § 3a UWG i. V. m. § 1 HwO zu werten, ist eine Einschätzung des Briefings und von mir nicht verifiziert.

**Ist „Modernisierung aus einer Hand" mit dem Hinweis tragfähig?** Ja, nach vorläufiger Einschätzung, wenn vier Bedingungen erfüllt sind. (a) Der Claim beschreibt Koordination und einen einzigen Ansprechpartner, nicht die Ausführung aller Gewerke. (b) Die Klarstellung steht unmittelbar am Claim, auf gleicher visueller Ebene, und nennt alle Partner-Gewerke. (c) Die Aussagen sind wahr (Partnerbetriebe eingetragen, „Meister" zutreffend). (d) Das ist auf allen Seiten, in Meta-Texten und Profilen einheitlich. Ohne Klarstellung ist ein pauschales „aus einer Hand" angreifbar (§ 5 UWG).

Formulierungsempfehlung (Hero, Wording-Scan-konform):

> **Modernisierung aus einer Hand.** Ein Ansprechpartner für Ihre gesamte Renovierung: Wir planen, koordinieren und führen Demontage, Trockenbau und Bodenbeläge selbst aus.
> ⓘ Ausführung durch unsere Meister-Partnerbetriebe: Elektroinstallation, Wallbox-Installation, Zählerschrank und Unterverteilung, Fliesen und Bad, Putz und Stuck, Malerarbeiten

Kurzform (Teaser, Meta): „Renovierung aus einer Hand koordiniert: ein Ansprechpartner, zulassungspflichtige Gewerke durch Meister-Partnerbetriebe." Die selbst ausgeführten Gewerke sollten aus `gewerke.yaml` (`ausfuehrung: eigen`) erzeugt werden, nicht fest im Text stehen.

## 5. Befunde an andere Agenten (nicht selbst geändert)

- **architect:** (a) `firma.yaml`/Schema: Feld `register` (Registergericht, Nummer; leer = keins) für § 5 Abs. 1 Nr. 4 DDG / § 2 Abs. 1 Nr. 3 DL-InfoV. Danach den Platzhalter im Impressum durch `<!-- wenn firma.register… -->` ersetzen. Optional `hosting`/`smtp` (Anbieter, Anschrift), damit Datenschutz-Platzhalter aus Keystatic pflegbar sind. (b) `scripts/lib/wording.mjs`: `ALLOWED` um `/günstigste Standardlieferung/gi` ergänzen (gesetzlicher Mustertext). Bis dahin steht in `widerruf.md` `g&uuml;nstigste` (rendert identisch). Außerdem fällt ein Paragrafenverweis wie „Abs. 1 Nr. 1" unter die Regel `superlativ` (`\bnr\.?\s*1\b`); Vorschlag: Lookbehind auf `Abs\.\s*\d+\s+`. (c) Launch-Check zählt Platzhalter auch in Blöcken hinter abgeschalteten Flags. Deshalb stehen in den Blöcken für `floorplan_ai`/`consent_manager` keine `[[PLATZHALTER: …]]`, sondern „VOR AKTIVIERUNG"-Kommentare. Vorschlag: Launch-Check soll beim Aktivieren eines Flags auf diese Kommentare hinweisen. (d) `PARTNER_HINWEIS` Plural (Abschnitt 4, Punkt 2). (e) Keystatic (`fields.markdoc`): Ob der Editor beim Speichern HTML-Kommentare (Kopfvermerk, Bedingungen) erhält, ist ungeprüft. `Markdoc.format` erhält sie im Test. Bis zur Prüfung Rechtstexte nicht über Keystatic bearbeiten.
- **page-builder:** Marker-Schnittstelle (Abschnitt 2) umsetzen, Kommentare entfernen, Hinweis auf der Startseite auf alle Partner-Gewerke erweitern (Abschnitt 4, Punkt 1).
- **backend-api:** Platzhalter in `datenschutz.md`/`cookie-einstellungen.md` klären: Felder des Kontaktformulars, keine Speicherung auf dem Server, Rate-Limit (IP, Dauer), CSRF ohne Cookie, Eingangsbestätigung, Entfernen von EXIF-Daten.
- **Planer-Agenten:** localStorage-Schlüssel, KI-Kennzeichnung und separate Einwilligung im Tool, barrierefreie Alternative.

## 6. Offene rechtliche Punkte für den Betreiber

1. Vertragsmodell: RAUMSTROM als Vertragspartner mit Nachunternehmern (Entwurf) oder Direktvertrag Kunde–Partner? Ist das ohne eigene Eintragung zulässig? Mit HWK/Anwalt klären.
2. HWK Unterfranken: Abgrenzung der eigenen Gewerke (Bodenbelag/Raumausstatter, Trockenbau/Stuckateur, Prüfservice/Elektrotechnik), Anzeige nach § 18 HwO, Eintragung nach § 7 Abs. 2 HwO prüfen.
3. Je Partnerbetrieb bestätigen: Eintragung in der Handwerksrolle, Meister als Betriebsleiter, feste vertragliche Bindung. Danach Singular oder Plural im Hinweis festlegen.
4. Rechtsform/Register (eGbR?), USt-IdNr., W-IdNr., Kleinunternehmerregelung, Beschäftigtenzahl (VSBG § 36 Abs. 3, BFSG, § 38 BDSG).
5. Weitergabe von Anfragedaten an Partnerbetriebe: Zeitpunkt und datenschutzrechtliche Rolle klären.
6. Hoster und SMTP-Anbieter benennen, AVV abschließen, Log-Speicherdauer; bei KI: AVV Mistral, Verarbeitungsort, keine Nutzung zum Training.
7. Belehrungen dem Kunden mit dem Vertrag auf dauerhaftem Datenträger übergeben. Für erhebliche Umbaumaßnahmen gilt Belehrung B; Baubeschreibung (§ 650j BGB) ist ungeprüft.
8. Ungeprüft und vor Launch zu verifizieren: MStV § 18, Art. 50 KI-VO, Aufhebung der ODR-VO (Amtsblatt), OLG Rostock 2 U 11/20, BayLDA-Anschrift.

## 7. Getestet

`npm ci` ok · `npm run scan:wording` ok (0 Funde) · `npm run platzhalter` ok (79 offene Punkte, 0 Fehler) · `npm test` ok (Vitest 148/148, Hook-Test 7/7) · `npm run check` 0 Fehler · `npm run build:staging` ok. Die Rechtsseiten werden noch nicht gerendert (Routen baut page-builder). Die Markdown-Ausgabe habe ich im Content-Store geprüft: Marker, Kommentare und Tabelle bleiben erhalten, `\` wird zu `<br>`.

## 8. Nachbesserung (18.11.2026): Keystatic-feste Rechtstexte und Register

- `cookie-einstellungen.md`: GFM-Tabelle durch verschachtelte Liste ersetzt (je Zweck: Art der Speicherung, Wann, Dauer), Inhalt und Platzhalter unverändert.
- `impressum.md`: Register-Platzhalter ersetzt durch `<!-- wenn firma.register.nummer -->` mit „Registereintrag: {{firma.register.art}}, {{firma.register.gericht}}, {{firma.register.nummer}}“. Ist `nummer` leer, entfällt die Zeile. Die drei Platzhalter stehen jetzt in `firma.yaml`.
- `widerruf.md`: Statt `(\*)` steht im Muster-Formular jetzt `(∗)` (U+2217, sieht gleich aus). Grund: Keystatic entfernt den Escape, und ein bloßes `*` würde als Hervorhebung gerendert. Den veralteten Kommentar zur HTML-Entity „g&uuml;nstigste“ habe ich ersetzt, denn der Scan erlaubt den Mustertext inzwischen.
- Alle sechs Texte geprüft: Es gibt keine weiteren Tabellen und keine `\*`-Escapes, auch nicht in Kommentaren. Mit micromark gegengerendert: Listen und Registerblock kommen richtig an, kein `<em>`.
- Getestet: `npm run platzhalter` (133 offen, 0 Fehler) · `npm run scan:wording` 0 Funde · `npm test` 181/181 + Hook 7/7 · `npm run build:staging` ok.
- Vorschlag an architect: Den Unit-Test aus Bericht 2-architect §6 (b) ergänzen, also kein `|---|` und kein `\*` in `src/content/legal`.

## 9. Nacharbeit (18.11.2026): Datenschutz und Cookie-Seite an die Kontakt-API angeglichen

Branch `worktree-agent-a498e6915e03ed2a6`, Basis dae69c6. Geändert nur `src/content/legal/datenschutz.md` und `src/content/legal/cookie-einstellungen.md` (plus `PLATZHALTER.md` per `npm run platzhalter`). Keine Tabellen, keine `\*`.

Abgeglichen mit `kontakt-schnittstelle.ts`, `KontaktFormular.astro`, `kontakt-ablauf.ts`, `kontakt-mails.ts`, `api.ts`, `speicher.ts`, `schluessel.ts`, `csrf.ts`, `altcha.ts`, `altcha-widget.ts`, `server/server.mjs`, `node_modules/altcha/dist/external` (setCookie nur per Option, nicht gesetzt).

datenschutz.md:
- Kontaktformular: Feldliste (Name, E-Mail, Telefon freiwillig, PLZ/Ort freiwillig, Anliegen freiwillig, Vorhaben, Fotos freiwillig, Häkchen, Eingangszeit), Zweck, Art. 6 Abs. 1 lit. b/f, keine Speicherung auf dem Server (nur Arbeitsspeicher, keine DB/Dateien), Honeypot-Anfragen verworfen, Speicherdauer im Postfach (Löschfrist bleibt Platzhalter), Pflichtangaben-Hinweis korrigiert.
- „Datei-Uploads“ → „Fotos hochladen“: max. 5, JPG/PNG/WebP/HEIC, 10 MB je Datei, 20 MB gesamt, **keine PDFs/Grundrisse** (alter Text war falsch), Neukodierung zu JPG ≤ 2560 px, alle Metadaten inkl. GPS entfernt, neutrale Dateinamen, Original nicht gespeichert.
- E-Mail-Versand: SMTP-Anbieter und ggf. Postfach-Anbieter als Platzhalter, TLS nur bis zum Mailserver, keine Ende-zu-Ende-Verschlüsselung (vorher pauschal „verschlüsselt“), Reply-To mit Name/Adresse, Eingangsbestätigung ohne Nutzereingaben, max. 2/Tag je Adresse.
- Neu „Schutz vor Missbrauch“: ALTCHA selbst gehostet, keine Verhaltensdaten, Nonce 10 min im Speicher, JavaScript nötig (Alternative Telefon/E-Mail); CSRF-Token ohne Cookie, nur im Formular, 2 h, einmalig; Rate-Limit über HMAC der IP (IPv6 /64), 5 je 15 min, nur Arbeitsspeicher, nicht protokolliert; HMAC der E-Mail-Adresse für das Bestätigungslimit (24 h). Alter Rate-Limit-Absatz unter „Hosting“ entfernt.
- Hosting: die Anwendung schreibt keine Zugriffsprotokolle, Ereignis-Logs ohne IP/Namen/Adressen. Ob der Hoster oder ein Reverse-Proxy Zugriffsprotokolle führt, ist ein neuer Platzhalter.
- „Speicherung im Browser“, „Das Wichtigste“: jetzt ausdrücklich keine Cookies. Bei „Empfänger“ sind Hoster und E-Mail-Dienst genannt.
- Fünf Platzhalter erledigt (Felder, keine Speicherung, Metadaten, Eingangsbestätigung, CSRF), drei neu (Häkchen-Rechtsgrundlage, Speicherbereinigung, Hoster-Logs).

cookie-einstellungen.md: Der CSRF-Eintrag mit zwei Platzhaltern ist ersetzt durch: „keine Cookies, auch keine technisch notwendigen“. Dazu kommt eine Liste, die zeigt, dass Formular und ALTCHA nichts im Browser speichern. Der Code-Abgleich steht als Kommentar im Text. Der Planer-Eintrag (localStorage) bleibt unverändert.

### Befunde (Code vs. rechtliche Anforderung, nicht selbst geändert)
1. **backend-api, Speicherbegrenzung (belegt):** `src/lib/security/speicher.ts`, `RateLimiter#aufraeumen` und `EinmalSpeicher#aufraeumen` löschen abgelaufene Einträge erst bei 20 000 bzw. 50 000 Schlüsseln. Bei normalem Verkehr bleiben die HMAC-Werte von IP- und E-Mail-Adresse bis zum Neustart im Speicher. Der Bericht 2-backend-api („max. 24 h“) und die Datenschutzerklärung sagen etwas anderes (Art. 5 Abs. 1 lit. e DSGVO). Vorschlag: abgelaufene Einträge bei jedem `pruefe`/`markiere` begrenzt aufräumen oder per `setInterval(...).unref()` regelmäßig löschen, dazu ein Unit-Test. Danach den Platzhalter in datenschutz.md streichen (legal-compliance).
2. **page-builder + backend-api, Pflicht-Häkchen (Rechtseinschätzung, keine Rechtsberatung):** `KontaktFormular.astro` „… bin damit einverstanden, dass RAUMSTROM meine Angaben und Fotos … verwendet“ und `kontakt-mails.ts` „Einwilligung in die Verarbeitung laut Datenschutzerklärung: ja“ formulieren eine Einwilligung nach lit. a, die Verarbeitung stützt sich aber auf lit. b/f. Empfehlung: Häkchen als Kenntnisnahme („Ich habe die Datenschutzerklärung gelesen.“) oder Hinweistext ohne Häkchen, Mailzeile entsprechend. Der Platzhalter blockiert den Launch bis zur Entscheidung (Betreiber/Rechtstexte-Service).
3. **backend-api, Hinweis:** `server/server.mjs:95` loggt `err.message` bei internen Fehlern. Derzeit ist kein Pfad bekannt, über den Nutzereingaben dorthin gelangen. Bitte bei der Phase-8-Prüfung mitbetrachten.
4. **Betreiber:** SMTP- und Postfach-Anbieter (AVV, EU-Standort), ob der Hoster Zugriffsprotokolle führt und wie lange, Löschfrist für Anfragen.

Getestet: `npm ci` ok · `npm run platzhalter` 128 offen, 0 Fehler · `scan:wording` 0 Funde · `npm test` Vitest 216/216 + Hook 7/7 · `build:staging` ok. In `dist/client/datenschutz/` und `cookie-einstellungen/` geprüft: neue Abschnitte gerendert, keine Kommentare in der Ausgabe.
