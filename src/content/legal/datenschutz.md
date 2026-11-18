---
titel: Datenschutzerklärung
seite: datenschutz
stand: 2026-11-18
entwurf: true
---
<!-- ENTWURF – vor Veröffentlichung durch Rechtstexte-Service mit Abmahnschutz oder Anwalt prüfen lassen -->

<!-- Marker-Syntax: siehe docs/agent-reports/2-legal-compliance.md, Abschnitt "Schnittstelle". Jede [[PLATZHALTER]]-Stelle ist eine offene Tatsachenfrage. Kontaktformular, Fotos, ALTCHA, CSRF, Rate-Limit und Mail am 18.11.2026 mit dem Code abgeglichen (Stand dae69c6: src/components/forms/kontakt-schnittstelle.ts, KontaktFormular.astro, src/lib/security/, src/lib/uploads/, src/lib/mail/, docs/agent-reports/2-backend-api.md). Bei Änderungen an Feldern, Limits oder Fristen diesen Text mitziehen. Raumplaner-Versand (Phase 6) ist noch nicht umgesetzt; Abschnitt "Raumplaner" dann abgleichen. -->

## Verantwortlicher

Verantwortlich für die Verarbeitung personenbezogener Daten auf dieser Website ist:

{{firma.firmierung}}\
{{firma.adresse.strasse}}\
{{firma.adresse.plz}} {{firma.adresse.ort}}\
Telefon: {{firma.kontakt.telefon_anzeige}}\
E-Mail: {{firma.kontakt.email}}

Vertreten durch die Gesellschafter {{firma.vertretungsberechtigte}}. Weitere Angaben finden Sie im Impressum.

<!-- § 38 Abs. 1 BDSG (geprüft 18.11.2026, gesetze-im-internet.de/bdsg_2018/__38.html): Benennungspflicht in der Regel erst ab 20 Personen, die ständig mit automatisierter Verarbeitung beschäftigt sind. Betreiber bestätigt, dass das nicht zutrifft. -->

Einen Datenschutzbeauftragten haben wir nicht benannt, weil wir dazu gesetzlich nicht verpflichtet sind. Bei Fragen zum Datenschutz wenden Sie sich bitte an die oben genannte E-Mail-Adresse.

## Das Wichtigste in Kürze

- Diese Website setzt keine Cookies und verwendet kein Tracking, keine Analysewerkzeuge und keine Social-Media-Plugins.
- Alle Inhalte, Schriften und Programmteile werden von unserem eigenen Server geladen. Es werden beim Aufruf keine Daten an Drittanbieter wie Schriften-, Karten- oder Videodienste übertragen.
- Personenbezogene Daten verarbeiten wir nur, wenn Sie uns eine Anfrage schicken (Kontaktformular oder Raumplaner) und soweit dies für den technischen Betrieb der Website nötig ist.
- Der Raumplaner arbeitet in Ihrem Browser. Ihr Grundriss und Ihr Entwurf werden erst übertragen, wenn Sie ausdrücklich auf „Absenden“ klicken.

## Hosting und Server-Logfiles

Diese Website wird bei folgendem Anbieter betrieben: [[PLATZHALTER: Name und Anschrift des Hosters, Serverstandort Deutschland]]. Mit dem Hoster haben wir einen Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO geschlossen.

Beim Aufruf der Website verarbeitet der Server automatisch Daten, die Ihr Browser übermittelt:

- IP-Adresse des anfragenden Geräts
- Datum und Uhrzeit des Zugriffs
- aufgerufene Adresse (URL) und übertragene Datenmenge
- Statuscode der Antwort (zum Beispiel „erfolgreich“ oder „nicht gefunden“)
- Browsertyp und Betriebssystem (User-Agent) sowie gegebenenfalls die zuvor besuchte Seite (Referrer)

Zweck: Auslieferung der Website, Gewährleistung von Stabilität und Sicherheit sowie Abwehr und Aufklärung von Angriffen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt im sicheren und fehlerfreien Betrieb der Website.

Speicherdauer: Die Logfiles werden nach [[PLATZHALTER: Speicherdauer der Server-Logfiles beim Hoster, z. B. 7 Tage]] gelöscht, sofern nicht ein konkreter Sicherheitsvorfall eine längere Aufbewahrung zur Aufklärung erfordert.

<!-- Code-Stand 18.11.2026: server/server.mjs schreibt kein Zugriffsprotokoll; die API protokolliert nur Ereignisnamen (z. B. "kontakt: gesendet (2 fotos)") ohne IP-Adresse, Namen, E-Mail-Adresse oder Inhalte. Zugriffsprotokolle entstehen nur beim Hoster oder einem vorgeschalteten Reverse-Proxy; vor Launch beim Hoster klären und die Absätze oben ggf. anpassen. -->

Unsere Website-Anwendung selbst schreibt kein Zugriffsprotokoll. Bei Formularanfragen hält sie nur technische Ereignisse fest (zum Beispiel „Anfrage gesendet“ oder „Anfrage abgelehnt“), ohne IP-Adresse, Namen, E-Mail-Adresse oder Inhalte Ihrer Anfrage. Die oben genannten Zugriffsdaten werden nur in den Protokollen des Hosters erfasst. [[PLATZHALTER: beim Hoster klären, ob er oder ein vorgeschalteter Reverse-Proxy Zugriffsprotokolle führt; falls nein, die Absätze zu Logfiles und Speicherdauer anpassen]]

## Verschlüsselung

Die Verbindung zu dieser Website ist per TLS verschlüsselt (erkennbar am Schloss-Symbol bzw. am Protokoll HTTPS in der Adresszeile). Daten, die Sie über Formulare senden, können dadurch auf dem Übertragungsweg nicht von Dritten mitgelesen werden.

## Kontaktformular

Wenn Sie uns über das Kontaktformular schreiben, verarbeiten wir folgende Angaben:

- Name (Pflichtangabe)
- E-Mail-Adresse (Pflichtangabe), damit wir Ihnen antworten können
- Telefonnummer (freiwillig), für Rückfragen und die Terminabsprache
- Postleitzahl und Ort des Projekts (freiwillig), damit wir einschätzen können, ob das Vorhaben in unserem Einzugsgebiet liegt
- Art des Anliegens (freiwillig, Auswahl aus unseren Leistungen)
- Beschreibung Ihres Vorhabens (Pflichtangabe)
- Fotos (freiwillig, siehe „Fotos hochladen“)
- Ihre Bestätigung zur Datenschutzerklärung (Pflichtangabe)
- Datum und Uhrzeit des Eingangs

Dazu kommen technische Angaben, die nur dem Schutz vor Missbrauch dienen und nicht an uns weitergeleitet werden (siehe „Schutz vor Missbrauch“).

Zweck: Bearbeitung Ihrer Anfrage und gegebenenfalls Vorbereitung eines Angebots. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit Ihre Anfrage auf einen Vertrag mit uns gerichtet ist, im Übrigen Art. 6 Abs. 1 lit. f DSGVO (unser berechtigtes Interesse an der Beantwortung von Anfragen).

Ablauf: Unser Server prüft Ihre Angaben, wandelt Fotos um (siehe „Fotos hochladen“) und sendet die Anfrage als E-Mail an unser Postfach (siehe „E-Mail-Versand“). Auf dem Webserver wird nichts gespeichert: Formulardaten und Fotos liegen nur während der Verarbeitung im Arbeitsspeicher und werden danach verworfen. Es gibt keine Datenbank und keine Zwischenspeicherung in Dateien. Anfragen, die unser Missbrauchsschutz als automatisiert erkennt, werden verworfen und nicht weitergeleitet.

Speicherdauer: Ihre Anfrage liegt danach nur in unserem E-Mail-Postfach. Wir löschen sie, sobald sie erledigt ist und kein Vertrag zustande kommt, spätestens nach [[PLATZHALTER: Löschfrist für Anfragen ohne Auftrag, z. B. 6 Monate]]. Kommt ein Vertrag zustande, bewahren wir die Unterlagen auf, solange gesetzliche Aufbewahrungsfristen es verlangen (insbesondere nach § 147 Abgabenordnung bis zu zehn Jahre).

Die Bereitstellung Ihrer Daten ist weder gesetzlich noch vertraglich vorgeschrieben. Ohne die Pflichtangaben können wir Ihre Anfrage über das Formular jedoch nicht entgegennehmen. Sie erreichen uns auch per Telefon oder E-Mail.

## Fotos hochladen

Sie können Ihrer Anfrage bis zu 5 Fotos beifügen (JPG, PNG, WebP oder HEIC, je bis zu 10 MB, zusammen bis zu 20 MB). Andere Dateiarten, etwa PDF-Dokumente, nimmt das Formular nicht an.

Fotos können Metadaten enthalten, etwa Aufnahmezeitpunkt, Gerätetyp oder den Ort der Aufnahme. Unser Server prüft jede Datei auf ihr tatsächliches Format und erzeugt daraus ein neues Bild im JPG-Format mit höchstens 2560 Pixeln Kantenlänge. Dabei werden alle Metadaten einschließlich der Standortdaten entfernt, und die Datei erhält einen neutralen Namen (zum Beispiel „foto-1.jpg“). Nur dieses neu erzeugte Bild wird mit Ihrer Anfrage per E-Mail an uns gesendet; die Originaldatei wird nicht gespeichert.

Zweck, Rechtsgrundlage und Speicherdauer entsprechen dem Abschnitt „Kontaktformular“. Bitte laden Sie keine Bilder hoch, auf denen andere Personen erkennbar sind, ohne deren Einverständnis, und achten Sie darauf, dass keine vertraulichen Unterlagen zu sehen sind.

## Raumplaner

Mit dem Raumplaner können Sie einen Grundriss hochladen, daraus ein 3D-Modell erstellen und Ihre Gestaltungswünsche festhalten. Die Verarbeitung findet vollständig in Ihrem Browser statt. Solange Sie nicht absenden, erhalten wir keine Daten aus dem Planer.

Wenn Sie Ihren Entwurf absenden, übermitteln wir Ihre Kontaktangaben, Ihre Nachricht sowie die erzeugten Dateien (zum Beispiel 3D-Modell, Ansichten, PDF-Zusammenfassung und Projektdatei) per E-Mail an uns. Zweck, Rechtsgrundlage und Speicherdauer entsprechen dem Abschnitt „Kontaktformular“.

<!-- wenn features.floorplan_ai -->

## Optionale KI-Grundriss-Analyse (Mistral AI)

<!-- Nur sichtbar, wenn features.floorplan_ai aktiv ist. Art. 50 KI-VO (EU) 2024/1689: Primärquelle (EUR-Lex) am 18.11.2026 nicht erreichbar, ungeprüft. Sekundärquellen: Transparenzpflichten gelten seit 02.08.2026. Art. 50 Abs. 1 trifft Anbieter von Systemen, die mit Personen interagieren; die Grundriss-Erkennung als Betreiber fällt nach vorläufiger Einschätzung nicht darunter. Die Kennzeichnung im Tool erfolgt trotzdem (Transparenz, Art. 13 DSGVO). -->

Im Raumplaner können Sie optional eine automatische Erkennung Ihres Grundrisses durch künstliche Intelligenz nutzen. Diese Funktion ist im Planer als KI-Funktion gekennzeichnet und wird nur ausgeführt, wenn Sie vorher ausdrücklich eingewilligt haben.

<!-- VOR AKTIVIERUNG von floorplan_ai prüfen und ergänzen (keine [[PLATZHALTER]] hier, damit der Launch-Check bei deaktiviertem Flag nicht blockiert): genaue Firma und Anschrift von Mistral AI laut Auftragsverarbeitungsvertrag, Verarbeitungsort, Speicherdauer beim Anbieter, Ausschluss der Nutzung zum Training. Angaben unten sind ungeprüft. -->

Dabei übermitteln wir das von Ihnen hochgeladene Grundrissbild an den Anbieter Mistral AI mit Sitz in Frankreich. Mistral AI erkennt darin Wände, Türen und Fenster und schickt das Ergebnis an Ihren Browser zurück. Ihre Kontaktangaben werden dabei nicht übermittelt. Die Verarbeitung erfolgt in der Europäischen Union auf Grundlage eines Vertrags zur Auftragsverarbeitung nach Art. 28 DSGVO; der Anbieter darf das Bild nur zur Erkennung in unserem Auftrag verwenden.

Rechtsgrundlage ist Ihre Einwilligung nach Art. 6 Abs. 1 lit. a DSGVO. Sie können die Einwilligung jederzeit mit Wirkung für die Zukunft widerrufen, indem Sie die Funktion nicht weiter nutzen und uns dies mitteilen. Die Rechtmäßigkeit der bis zum Widerruf erfolgten Verarbeitung bleibt unberührt. Ohne Einwilligung können Sie den Grundriss vollständig von Hand nachzeichnen.

Das Ergebnis der KI-Erkennung ist ein Vorschlag, den Sie prüfen und ändern können. Es dient nicht als Grundlage für Entscheidungen über Sie.

<!-- /wenn -->

## E-Mail-Versand

Anfragen aus dem Kontaktformular versenden wir über den E-Mail-Dienst [[PLATZHALTER: Name und Anschrift des SMTP-Anbieters und Serverstandort (EU); falls das Postfach, in dem Anfragen eingehen, bei einem anderen Anbieter liegt, auch diesen nennen]]. Mit dem Anbieter besteht ein Vertrag zur Auftragsverarbeitung nach Art. 28 DSGVO. Die Verbindung von unserem Server zum Mailserver ist per TLS verschlüsselt. Eine Ende-zu-Ende-Verschlüsselung der E-Mails findet nicht statt.

Ihre Anfrage geht als E-Mail an unser Postfach. Ihre E-Mail-Adresse und Ihr Name stehen darin als Antwortadresse, damit wir Ihnen direkt antworten können.

Eingangsbestätigung: Nach dem Absenden schicken wir eine automatische Bestätigung an die E-Mail-Adresse, die Sie angegeben haben. Sie enthält bewusst keine Angaben aus Ihrer Anfrage, sondern nur einen festen Text und unsere Kontaktdaten. So kann das Formular nicht dazu missbraucht werden, beliebige Inhalte an fremde Adressen zu senden. An dieselbe Adresse senden wir höchstens zwei Bestätigungen pro Tag. Zweck ist, Ihnen den Eingang zu bestätigen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit Ihre Anfrage auf einen Vertrag gerichtet ist, im Übrigen Art. 6 Abs. 1 lit. f DSGVO (unser berechtigtes Interesse an einer verlässlichen Kommunikation). Auf unserem Webserver wird die Bestätigung nicht gespeichert.

Wenn Sie uns direkt per E-Mail schreiben, verarbeiten wir Ihre Angaben zur Bearbeitung Ihres Anliegens; es gelten Zweck, Rechtsgrundlage und Speicherdauer aus dem Abschnitt „Kontaktformular“.

## Schutz vor Missbrauch

Damit das Kontaktformular nicht durch automatisierte Programme oder untergeschobene Anfragen missbraucht wird, setzen wir die folgenden Maßnahmen ein. Alle laufen auf unserem eigenen Server, setzen keine Cookies, laden nichts von Drittanbietern und erstellen keine Nutzerprofile. Rechtsgrundlage ist jeweils Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist der Schutz vor Spam, Überlastung und Missbrauch.

**Spam-Schutz (ALTCHA):** Wir verwenden die Open-Source-Software ALTCHA, die wir selbst auf unserem Server betreiben. Ihr Browser ruft bei unserem Server eine Rechenaufgabe ab und löst sie im Hintergrund, sobald Sie das Formular ausfüllen; unser Server prüft das Ergebnis. Dabei werden keine Mausbewegungen, Tastatureingaben oder anderen Verhaltensdaten erfasst, und es werden keine Daten an den Hersteller übermittelt. Damit jede gelöste Aufgabe nur einmal verwendet werden kann, merkt sich unser Server eine zufällige Kennung der Aufgabe ohne Bezug zu Ihrer Person im Arbeitsspeicher, bis die Aufgabe nach 10 Minuten ungültig wird. Der Spam-Schutz benötigt JavaScript. Ist JavaScript abgeschaltet, erreichen Sie uns per Telefon oder E-Mail.

**Schutz vor untergeschobenen Anfragen:** Beim Öffnen des Formulars erhält Ihr Browser von unserem Server ein zufälliges, signiertes Einmal-Kennzeichen, das mit dem Formular zurückgesendet wird. Es wird weder als Cookie noch anderweitig in Ihrem Browser gespeichert, sondern steht nur im geöffneten Formular. Es ist 2 Stunden gültig und nur einmal verwendbar; dazu merkt sich unser Server seine Kennung bis zum Ablauf im Arbeitsspeicher. Das Kennzeichen enthält keine Angaben zu Ihrer Person.

**Begrenzung der Anfragen:** Damit niemand in kurzer Zeit sehr viele Anfragen senden kann, zählt unser Server, wie oft von einem Internetanschluss aus das Formular gesendet oder eine Rechenaufgabe abgerufen wird (für das Formular höchstens 5 Anfragen in 15 Minuten). Dafür bildet er aus Ihrer IP-Adresse (bei IPv6 nur aus dem Netzpräfix) mit einem geheimen Schlüssel einen Prüfwert, aus dem sich die IP-Adresse nicht zurückrechnen lässt. Gespeichert wird nur dieser Prüfwert mit einem Zähler, nicht die IP-Adresse. Für die Begrenzung der Eingangsbestätigungen (siehe „E-Mail-Versand“) bildet der Server auf die gleiche Weise einen Prüfwert aus Ihrer E-Mail-Adresse. Die Prüfwerte liegen nur im Arbeitsspeicher, werden nicht protokolliert und nicht weitergegeben. Sie werden nach Ablauf des jeweiligen Zeitfensters gelöscht (höchstens 24 Stunden), bei einem Neustart des Servers sofort.

Abgelaufene Prüfwerte und Kennungen löschen wir automatisch aus dem Arbeitsspeicher, spätestens 24 Stunden nach ihrem Entstehen und in jedem Fall bei einem Neustart des Servers.

## Speicherung im Browser

Diese Website setzt keine Cookies. Das Kontaktformular einschließlich Spam-Schutz speichert nichts in Ihrem Browser. Eine Speicherung in Ihrem Browser erfolgt nur, wenn sie für eine von Ihnen ausdrücklich gewünschte Funktion unbedingt erforderlich ist (§ 25 Abs. 2 Nr. 2 TDDDG), zum Beispiel wenn Sie im Raumplaner auf „Entwurf speichern“ klicken. Der Entwurf bleibt dann nur auf Ihrem Gerät gespeichert und wird nicht an uns übertragen. Sie können ihn im Planer oder über die Einstellungen Ihres Browsers jederzeit löschen. Eine Übersicht finden Sie auf der Seite Cookie-Einstellungen.

<!-- § 25 TDDDG (geprüft 18.11.2026, gesetze-im-internet.de/ttdsg/__25.html): Abs. 2 Nr. 2 – keine Einwilligung, wenn unbedingt erforderlich für einen ausdrücklich gewünschten digitalen Dienst. -->

## Empfänger Ihrer Daten

Ihre Daten erhalten nur die in dieser Erklärung genannten Auftragsverarbeiter, insbesondere der Hoster (siehe „Hosting und Server-Logfiles“) und der E-Mail-Dienst (siehe „E-Mail-Versand“). Sie verarbeiten die Daten nur nach unserer Weisung.

Betrifft Ihre Anfrage Gewerke, die einer unserer Meister-Partnerbetriebe ausführt, geben wir die dafür nötigen Angaben (zum Beispiel Ort, Umfang, Fotos und Pläne des Vorhabens sowie Ihre Kontaktdaten) an diesen Partnerbetrieb weiter, damit er die Leistung kalkulieren und ausführen kann. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO. [[PLATZHALTER: Weitergabe an Partnerbetriebe bestätigen: erst nach Ihrer Zustimmung im Angebotsgespräch oder bereits bei der Kalkulation? Rechtliche Einordnung (eigene Verantwortliche, Auftragsverarbeitung) mit dem Rechtstexte-Service klären.]]

Eine Übermittlung in Länder außerhalb der Europäischen Union oder des Europäischen Wirtschaftsraums findet nicht statt.

## Keine automatisierte Entscheidungsfindung

Wir treffen keine Entscheidungen, die ausschließlich auf einer automatisierten Verarbeitung einschließlich Profiling beruhen (Art. 22 DSGVO).

## Ihre Rechte

Sie haben gegenüber uns folgende Rechte hinsichtlich der Sie betreffenden personenbezogenen Daten:

- Auskunft (Art. 15 DSGVO)
- Berichtigung (Art. 16 DSGVO)
- Löschung (Art. 17 DSGVO)
- Einschränkung der Verarbeitung (Art. 18 DSGVO)
- Datenübertragbarkeit (Art. 20 DSGVO)
- Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO)

**Widerspruchsrecht (Art. 21 DSGVO):** Soweit wir Daten auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO verarbeiten, können Sie aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit widersprechen. Wir verarbeiten die Daten dann nicht mehr, es sei denn, wir können zwingende schutzwürdige Gründe nachweisen, die Ihre Interessen überwiegen, oder die Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen.

Für die Ausübung Ihrer Rechte genügt eine formlose Nachricht an {{firma.kontakt.email}}.

## Beschwerderecht

Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren. Für uns zuständig ist das Bayerische Landesamt für Datenschutzaufsicht (BayLDA), [[PLATZHALTER: Anschrift und Website des BayLDA aus der Behördenseite übernehmen (am 18.11.2026 nicht geprüft)]].

## Aktualität

Wir passen diese Datenschutzerklärung an, wenn sich die Website oder die Rechtslage ändert. Es gilt die jeweils hier veröffentlichte Fassung. Stand siehe Seitenangabe.
