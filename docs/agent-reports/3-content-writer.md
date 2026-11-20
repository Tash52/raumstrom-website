# 3 content-writer: Startseite „So läuft's ab"

- `src/content/pages/start.md`: neuer Abschnitt `id: ablauf` (label Ablauf, Titel „So läuft's ab") vor `raumplaner-teaser`. Text als nummerierte Liste mit 4 Schritten im Format `N. **Titel.** Text` (Anfrage, Besichtigung, Angebot, Umsetzung). Ein Platzhalter (Angebotsfrist). Keine Preisaussagen; Partnerformulierung wie in `koordination`.
- `src/pages/index.astro` liest den Abschnitt NICHT aus (nur einstieg, saeulen, eingaenge, koordination, raumplaner-teaser, region). Bestätigt: `dist/client/index.html` enthält den Text nicht, daher kein sichtbarer Screenshot-Unterschied.
- Offen für page-builder: `abschnitt(seite, 'ablauf')` lesen, Liste in `{titel, text}[]` zerlegen (Regex `^\d+\. \*\*(.+?)\.\*\* (.+)$`) und `AblaufListe` (data-prozess) einbinden.
- Geprüft: platzhalter, scan:wording, npm test (313 + Hook 7), build:staging grün.
