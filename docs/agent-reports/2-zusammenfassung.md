# Phase 2 · Zusammenfassung

Stand 20.11.2026, `main` @ 1910ac8 (plus dieser Abschluss-Commit). Ergebnis: **bestanden mit Restpunkten**.

## Gebaut
- Seitentexte, Rechtstext-Entwürfe mit Gewerke-Kennzeichnung, alle Seiten aus Briefing Abschnitt 6, Navigation und Footer.
- Kontakt-API: CSRF, ALTCHA mit Replay-Schutz, Rate-Limits, Upload-Prüfung mit Re-Encoding (HEIC im Worker), Mail per SMTP-TLS.

## Fixes nach den Abnahmen
- **Server (architect):** Der Server setzt die Client-IP selbst (`x-raumstrom-client-ip`) und entfernt Proxy-Header bei `TRUST_PROXY=false`. Kein Open Redirect über `/%2F…` mehr, TRACE ergibt 405, vorkomprimierte `.br`/`.gz` mit `Vary`.
- **Kontakt-API (backend-api):** Abgewiesene Anfragen verbrauchen das globale Budget nicht mehr. Lese-Timeouts, Mindestrate und getrennte Pools für kleine Bodys und Uploads. HEIC seriell im Worker, Spitze unter 600 MB. Der Mail-Anzeigename wird neutralisiert, Eingangsbestätigungen sind begrenzt (2 je Adresse, 20 pro Stunde).
- **Formular-A11y:** ALTCHA und noscript-Hinweis sind sichtbar. Die Fehlerliste zeigt die vollen Feldnamen, der Fokus geht aufs erste Fehlerfeld.
- **Seiten (page-builder):** `/partner/` im Footer verlinkt, Ablauf ohne doppelte Nummerierung, Brotkrumen und Gewerke-Liste ohne Einzug. Neuer E2E-Test für die interne Verlinkung.

## Abnahmen
- **qa-verifier:** Alle 8 Punkte bestanden (`2-qa-nachpruefung.md`).
- **security-auditor:** Nach zwei Nachprüfungen bestanden mit Restpunkten (`SECURITY-REPORT.md`). Kein High- oder Medium-Befund offen.
- **Tests:** 302 Unit-Tests grün, `check` ohne Fehler, Staging-Build grün. E2E ohne Mail grün.

## Offen
- **Mail-E2E (5 Tests, je Desktop/Mobil):** Nicht gelaufen, weil hier weder Docker noch Mailpit verfügbar sind. Die CI muss sie nachholen.
- **N-4 (Low):** 8 schnelle Uploader können Foto-Uploads 55 s lang mit 503 blockieren. Textanfragen gehen weiter.
- **N-5 (Low):** Bei gemischter Last aus HEIC und großen JPEG/PNG steigt der Speicher auf 687–738 MB. In Phase 6 sind `MALLOC_ARENA_MAX=2` und ein Container-Limit von mindestens 1 GB Pflicht (architect).
- **Upload auf schwachem Mobilnetz:** Mit der 55-s-Frist scheitern dort Uploads mit mehreren Fotos. Empfehlung: Fotos im Browser auf 2560 px verkleinern und den Fortschritt anzeigen (backend-api, spätestens Phase 6).
- **Weitere Punkte für Phase 6:** SPF/DKIM/DMARC in den Launch-Check aufnehmen. Den Socket nach einem frühen 408 schneller schließen.
