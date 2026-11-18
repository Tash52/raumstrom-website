---
titel: Cookie-Einstellungen
seite: cookie-einstellungen
stand: 2026-11-18
entwurf: true
---
<!-- ENTWURF – vor Veröffentlichung durch Rechtstexte-Service mit Abmahnschutz oder Anwalt prüfen lassen -->

<!-- § 25 TDDDG geprüft 18.11.2026 (gesetze-im-internet.de/ttdsg/__25.html). Solange nur unbedingt erforderliche Speicherungen für ausdrücklich gewünschte Funktionen erfolgen (Abs. 2 Nr. 2), ist keine Einwilligung und kein Banner nötig. Die Liste vor Launch mit dem tatsächlichen Verhalten abgleichen (Browser-Entwicklerwerkzeuge: Cookies, Local Storage, Session Storage, IndexedDB). -->

## Kurz gesagt

Diese Website setzt keine Cookies, verwendet kein Tracking und bindet keine Dienste von Drittanbietern ein. Deshalb gibt es hier nichts einzustellen und kein Cookie-Banner.

## Was in Ihrem Browser gespeichert wird

Gespeichert wird nur, was für eine von Ihnen ausdrücklich gewünschte Funktion unbedingt erforderlich ist (§ 25 Abs. 2 Nr. 2 TDDDG). Diese Speicherungen bleiben auf Ihrem Gerät.

- **Entwurf im Raumplaner**
  - Art der Speicherung: Lokaler Speicher des Browsers (localStorage), [[PLATZHALTER: Abgleich mit Planer-Agenten: Schlüsselname]]
  - Wann: nur wenn Sie auf „Entwurf speichern“ klicken
  - Dauer: bis Sie den Entwurf löschen

Diese Website setzt keine Cookies, auch keine technisch notwendigen.

<!-- Abgleich mit dem Code am 18.11.2026 (Stand dae69c6): GET /api/csrf liefert das Token als JSON ohne Set-Cookie (docs/agent-reports/2-backend-api.md), kontakt-formular.ts schreibt es nur in das versteckte Formularfeld. ALTCHA-Widget (altcha/external) setzt ein Cookie nur mit der Option setCookie, die hier nicht gesetzt ist; src/components/forms/ nutzt weder localStorage noch sessionStorage. Bei neuen Funktionen hier nachtragen. -->

Das Kontaktformular speichert nichts in Ihrem Browser:

- **Schutz vor untergeschobenen Anfragen:** Das Einmal-Kennzeichen, das Ihr Browser beim Öffnen des Formulars erhält, steht nur im geöffneten Formular. Es wird nicht als Cookie und nicht im Browserspeicher abgelegt und ist mit dem Schließen der Seite weg.
- **Spam-Schutz (ALTCHA):** Die Rechenaufgabe wird im Arbeitsspeicher Ihres Browsers gelöst. ALTCHA setzt keine Cookies und legt nichts im Browserspeicher ab.

Näheres zu beiden Verfahren steht in der Datenschutzerklärung im Abschnitt „Schutz vor Missbrauch“.

## Gespeicherte Daten löschen

Einen gespeicherten Planer-Entwurf können Sie im Raumplaner löschen. Außerdem können Sie alle Daten dieser Website jederzeit über die Einstellungen Ihres Browsers entfernen (meist unter „Datenschutz“ oder „Websitedaten“).

<!-- wenn features.consent_manager -->

## Ihre Einwilligungen

<!-- Erst ausfüllen, wenn consent_manager aktiviert wird: Liste der Dienste mit Anbieter, Zweck, Speicherdauer und Rechtsgrundlage; die Consent-Komponente rendert hier die Schalter. „Alle ablehnen“ gleichwertig zu „Alle akzeptieren“, Einwilligung protokollieren. Dann auch die Datenschutzerklärung ergänzen. -->

Hier können Sie Ihre Einwilligungen jederzeit erteilen oder mit Wirkung für die Zukunft widerrufen.

<!-- /wenn -->

Weitere Informationen finden Sie in unserer Datenschutzerklärung.
