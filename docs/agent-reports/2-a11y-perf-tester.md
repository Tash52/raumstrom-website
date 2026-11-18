# a11y-perf-tester, Phase 2 (Stand 8a1a7f7)

Methode: frischer Klon, `build:staging`, `node server/server.mjs` (Test-Secrets), Chromium headless (Playwright), axe-core (Tags wcag2a/2aa/21a/21aa/22aa/best-practice), Lighthouse 12 Mobile (Standard-Drosselung, ohne GPU). Skripte in /tmp/t, /tmp/lh.

## Gesamturteil
Bestanden. 0 axe-Verstöße auf allen 29 Routen in 4 Konfigurationen (390, 1440 hell, 1440 dunkel, 320 + reduced-motion; 116 Läufe), kein horizontales Scrollen bis 320 px, 0 Fremd-Requests, 0 Konsolenfehler, Lighthouse 95-99 Perf und 100/100/100. Zwei kleine Befunde (1 mittel, 1 niedrig) plus ein Hinweis zur Kompression.

## Tabelle je Seite (Lighthouse Mobile)
| Seite | Perf | A11y | BP | SEO | LCP | CLS | TBT | JS gz | axe |
|---|---|---|---|---|---|---|---|---|---|
| / | 98 | 100 | 100 | 100 | 2,3 s | 0 | 0 ms | 0 kB | 0 |
| /leistungen/wallbox/ | 98 | 100 | 100 | 100 | 2,3 s | 0 | 0 ms | 0 kB | 0 |
| /kontakt/ | 95 | 100 | 100 | 100 | 2,8 s | 0 | 20 ms | 35,3 kB (Formular 3,1 + ALTCHA 32,2; Worker nicht mitgezählt) | 0 |
| /raumplaner/ (Platzhalter, kein JS) | 99 | 100 | 100 | 100 | 2,0 s | 0 | 0 ms | 0 kB | 0 |
| übrige 25 Routen (alle Leistungen, Rechtstexte, Danke/Fehler, Partner, Referenzen, Über uns, Für Zuhause/Unternehmen, Styleguide) | nicht einzeln gemessen | | | | | | | 0 kB | 0 |

Ziel ≥ 95 überall erreicht (Kontakt knapp). LCP auf Kontakt 2,8 s (simuliertes Mobile-Throttling); Lighthouse nennt dort Render-Blocking-CSS (300-450 ms) und 40 kB ungenutztes JS (ALTCHA, bereits lazy per Import).

## Tastatur, Fokus, Bewegung (belegt, Playwright)
- Skip-Link ist erster Tab-Stopp, wird sichtbar (12/12 px), springt auf `main#inhalt` und setzt den Fokus dorthin (desktop und mobil).
- Fokus-Reihenfolge Desktop: Logo, 6 Nav-Links, CTA, dann Inhalt; mobil: Logo, Menü-Button, Inhalt. Fokus überall sichtbar (2 px Outline plus Ring). Menü-Popover mobil: Enter öffnet, Tab läuft Schließen, Für Zuhause, ...; Escape schließt, Fokus kehrt zum Menü-Button zurück.
- Reduced Motion: Transition-Dauer 1e-5 s, scroll-behavior auto, View Transition aus (`src/styles/base.css:10-15`).
- Dunkelmodus: nicht vorhanden (`color-scheme: light`, `base.css`), 1440-dunkel-Lauf identisch. Kein Befund.
- Strom-Grün als Textfarbe: keine Treffer; axe color-contrast 0 Verstöße.
- Kontaktformular: leerer Submit zeigt Zusammenfassung (`role=alert`, tabindex -1), Fokus wandert dorthin; Felder haben `aria-invalid` und `aria-describedby` auf `feld-*-fehler` mit Text; Link in der Zusammenfassung setzt Fokus ins Feld. ALTCHA: Widget wird bei Fokus automatisch verifiziert (Zustand `verified`), Checkbox ist ein echtes `input`, Tab-Reihenfolge danach Fotos, Einwilligung, Link. Datei-Upload ist natives `input[type=file]` mit Label und `aria-describedby` (Hinweis).
- Ohne WebGL: Raumplaner ist in diesem Stand statische Seite, kein WebGL-Pfad zu prüfen.

## Befunde
1. mittel, Fehlerzusammenfassung beschriftet die Einwilligung mit "Ich habe die: ..." statt sinnvollem Namen. Ursache `labelText()` nimmt nur den ersten Textknoten des Labels, `src/components/forms/kontakt-formular.ts` (`labelText`, Zeile 51; Nutzung Zeile 94), bei Checkbox-Label mit Link abgeschnitten. Fix: explizites `data-fehlername` oder fester Text "Datenschutzhinweis". Zuständig: backend-api (Formular-Skript) bzw. page-builder.
2. niedrig, Abweichung vom Briefing: nach Validierungsfehler geht der Fokus auf die Zusammenfassung, nicht auf das erste Fehlerfeld (`kontakt-formular.ts`, `zeigeZusammenfassung`, `summary.focus()`). Das ist ein anerkanntes Muster (WCAG-konform, Links springen ins Feld), nur zur Kenntnis. Zuständig: backend-api, Entscheidung architect.
3. Hinweis, keine Kompression: `server/server.mjs` liefert HTML/CSS/JS unkomprimiert (Lighthouse "uses-text-compression" 39-118 kB, Startseite HTML 49,6 kB roh, `Content-Length` ohne `Content-Encoding` trotz `Accept-Encoding: gzip, br`). Die gz-Zahlen oben sind selbst berechnet. Falls kein Reverse-Proxy komprimiert, kostet das LCP und Score. Zuständig: architect (`server/`), oder Betriebsdoku klären.
4. Hinweis: Schriften-Preload vorhanden (2 woff2 mit `crossorigin`, `<link rel=preload>` auf `/_astro/fonts/`), insgesamt 4-5 Schriftdateien geladen, alle lokal.

## Nicht geprüft
WebGL-Leistung (keine GPU), Raumplaner-Funktion (nicht vorhanden), Screenreader-Ausgabe real, ALTCHA mit echter Maus-/Tastaturinteraktion im Widget-Shadow (Auto-Verify verhindert Bedarf, Checkbox aber nativ), 200-%-Zoom nur über 320-px-Viewport abgedeckt, Lighthouse nur auf 4 Seiten.
