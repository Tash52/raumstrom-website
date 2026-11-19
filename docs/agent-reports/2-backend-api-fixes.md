# backend-api, Phase 2: Fixes aus den Abnahmen

Stand: Branch `worktree-agent-adb86e4b82479b7af`, Basis `9eb85d9`. Quellen: `docs/SECURITY-REPORT.md` (Phase 2), `docs/agent-reports/2-qa-verifier.md` (B1), `docs/agent-reports/2-a11y-perf-tester.md` (Befunde 1 und 2).

## Geändert

### H-1 · Globales Limit, Slots, Body-Lesen (`src/lib/security/kontakt-ablauf.ts`, `api.ts`, `body.ts`, `speicher.ts`)
- Neue Reihenfolge: Herkunft → Content-Type → Content-Length (falls vorhanden, ≤ `MAX_BODY`) → Per-Client-Limit (5/15 min, zählt jeden Versuch, trifft nur den eigenen Bucket) → Lese-Slot → Body lesen → CSRF → Honeypot → Validierung → ALTCHA → CSRF verbrauchen → **globales Limit** → Arbeits-Slot → Fotos → SMTP.
- `kontaktGesamt` (60/h) zählt nur noch Anfragen, die Herkunft, CSRF, Validierung und ALTCHA bestanden haben. Abgewiesene Anfragen können niemanden mehr aussperren. Greift es, steht `kontakt: WARNUNG globales limit erreicht` im Log. (Das Wort „ALARM“ ist durch den Wording-Scan gesperrt.) Restrisiko: Wer 60 ALTCHA pro Stunde löst und dafür mindestens 3 Netze nutzt, sperrt das Formular weiterhin. Dabei gehen aber 60 echte Mails beim Betreiber ein, die Störung fällt also auf. Das Limit schützt das SMTP-Kontingent und bleibt bewusst bestehen.
- Body-Lesen (`leseBody`): Byte-Limit beim Streamen (auch ohne Content-Length), Höchstdauer 55 s (unter `requestTimeout` 60 s) und eine **Mindestrate von 16 KB/s im Mittel nach 10 s Schonfrist**. Ein Slowloris-Upload ist so nach etwa 10 s mit 408 beendet. Ein pauschales Limit von 20 s hätte echte Uploads (bis 20 MB über Mobilfunk) abgebrochen, deshalb die Mindestrate. Bei Verstoß wird der Stream abgebrochen, Rückgabe 408, 413 oder 400.
- Slots: `ANNAHME` (8 gleichzeitige Body-Lesevorgänge, Speicher ≤ 8 × 22 MB) und `ANNAHME_PRO_CLIENT` (2 je Client, sonst 429). Teure Arbeit (`PARALLEL`, 4) wird erst **nach** allen Prüfungen vergeben, mit einer Warteschlange (8 Plätze, 20 s) statt sofortigem 503. Alle Slots werden in `finally` freigegeben.
- Nachgemessen am gebauten Server (`node server/server.mjs`, SMTP absichtlich nicht erreichbar, daher 502 = alle Prüfungen bestanden):
  - 4 Slowloris-Verbindungen (1 Byte alle 2 s) liefen. Eine gleichzeitige gültige Anfrage bekam 502 nach 11 ms, also keinen 503.
  - Die Slowloris-Verbindungen erhielten nach **10,0 s** die Antwort `408` (`kontakt: body zeit`).
  - 70 Anfragen ohne Token von einem Client ergaben 5 × 403 und 65 × 429. Eine gültige Anfrage eines anderen Clients danach bekam 502, also **keinen 429**.
  - Hinweis an architect: Nach dem 408 schließt Node den Socket erst nach etwa 10 s mehr (der restliche Body wird verworfen). Der Slot ist schon vorher frei.

### M-1 · Client-Adresse (Route-Teil) (`src/lib/security/anfrage.ts`)
- `socketAdresse()` liest nur noch `x-raumstrom-client-ip` (`CLIENT_IP_HEADER`). Akzeptiert wird nur eine einzelne gültige IP. Astros `clientAddress` (erster XFF-Eintrag) wird nicht mehr verwendet.
- Fehlt der Header oder ist er ungültig, gilt ein gemeinsamer Bucket „unbekannt“. X-Forwarded-For wird nie ausgewertet, außer mit `TRUST_PROXY=true`, und dann nur der letzte Eintrag wie bisher. Beim ersten Fehlen gibt es einmalig eine Warnzeile im Log, ohne den Header-Wert.
- **Abhängigkeit:** Die Absicherung wirkt erst zusammen mit dem Server-Teil von architect. `server/server.mjs` muss den Header immer überschreiben und Client-Werte entfernen. Ohne diesen Teil könnte ein Client den Header selbst setzen. Bitte beide Branches zusammen mergen.

### M-2 · HEIC (`src/lib/uploads/heic.ts`, `bild.ts`)
- Eigenes Pixellimit `MAX_PIXEL_HEIC = 25 MP`. Ein 24-MP-iPhone-Foto (5712 × 4284) passt, 48 MP „HEIF Max“ wird mit eigener Meldung abgelehnt (`MELDUNG.fotoZuGross`). Damit ist auch I-4 für HEIC erledigt.
- Die Dekodierung läuft in einem `worker_thread` mit `resourceLimits` (Old Gen 96 MB, Young 16 MB, Stack 4 MB) und hartem Timeout von 20 s. **Für jedes Bild gibt es einen eigenen Worker, der danach beendet wird**, damit der WASM-Heap freigegeben wird. Das Pixellimit wird im Worker geprüft, bevor der RGBA-Puffer angelegt wird. Die Pixel kommen als übertragener ArrayBuffer zurück. OOM, Absturz oder Timeout gelten als `defekt`.
- `HEIC_SLOT = Parallelitaet(1, 4)`: Es läuft höchstens eine Dekodierung gleichzeitig, bis zu 4 warten höchstens 30 s. Ist die Warteschlange voll, gibt es `ausgelastet` → **503** mit `Retry-After: 60`.
- Der Worker-Code ist ein fester String (`eval: true`, ohne Anfragedaten). So übersteht er das Bündeln nach `dist/server` ohne eigenes Asset. Geprüft im Staging-Build: HEIC-Anfrage mit 2 Bildern über den gebauten Server dekodiert.
- Nicht nachgemessen: VmHWM und `/healthz`-Latenz mit der 8000 × 5000-HEIC-Bombe. Ohne pillow-heif und Docker gibt es hier keinen Encoder für große HEIC. Das gehört in den Nachtest von security-auditor. Erwartung: Eine Dekodierung zur Zeit, höchstens 25 MP, also etwa 100 MB RGBA plus WASM-Heap je Worker. Der Event-Loop bleibt frei (Unit-Test).

### L-3 · Anzeigename (`src/lib/mail/kontakt-mails.ts`)
- Entfernt werden zusätzlich `\p{Cf}` (Bidi-Overrides, Zero-Width), `\p{Zl}`, `\p{Zp}`, `\p{Co}` und `\p{Cn}` sowie `=?` und `?=`, ersetzt durch Leerzeichen. Dadurch kann kein neues Paar entstehen. Gekürzt wird nach Codepoints, nicht nach UTF-16-Einheiten.

### L-4 · Eingangsbestätigungen (Entscheidung)
- Pro Adresse bleiben 2 in 23 h. **Neu ist eine Obergrenze von 20 je Stunde für alle Adressen zusammen** (`LIMITS.bestaetigungGesamt`). Eine gesperrte Adresse verbraucht dabei kein globales Budget (`darfBestaetigen`).
- Begründung: Die Bestätigung enthält keine Nutzereingaben und trägt `Auto-Submitted`. Das Missbrauchspotenzial ist Backscatter, also ein Reputationsrisiko für die Absenderdomain. 20/h liegt weit über dem echten Bedarf eines Handwerksbetriebs und deutlich unter dem Anfragelimit von 60/h. Wird die Grenze erreicht, geht die Anfrage trotzdem ein, nur ohne Bestätigung. Das ist für Kunden unkritisch, die Website zeigt den Erfolg ohnehin an.
- Empfehlung an architect: SPF, DKIM und DMARC für `MAIL_FROM` in `check:launch` aufnehmen.

### QA B1 · Widget und noscript sichtbar (`KontaktFormular.astro`, `altcha-widget.css`)
- Der Einhängepunkt hieß `class="altcha"`. `altcha.css` setzt `.altcha{display:none}` und `.altcha *{all:revert-layer}`. Er heißt jetzt `class="spamschutz"`. `altcha-widget.css` setzt `[data-altcha-platz]{display:block}` mit einem Warnkommentar.
- **Hinweis:** `KontaktFormular.astro` gehört page-builder. Geändert wurde nur dieses eine Klassenattribut, weil eine CSS-Lösung den Fall ohne JS nicht abdeckt.
- Barrierefreiheit: Das Widget ist eine native Checkbox mit dem Label „Ich bin kein Roboter“ (ALTCHA-i18n de). axe meldet 0 Verstöße (E2E).

### A11y 1 und 2 (`kontakt-formular.ts`, neu `formular-hilfen.ts`)
- `fehlerName()`: Reihenfolge `data-fehlername` → feste Kurznamen (`einwilligung` → „Datenschutzhinweis“) → vollständiger Label-Text (alle Textknoten, auch im Link, ohne `.feld-pflicht`) → Feldname. Die Selektor-ID wird mit `CSS.escape` maskiert.
- Nach Fehlern geht der Fokus auf das erste Fehlerfeld in Dokumentreihenfolge. Die Zusammenfassung (`role=alert`) bleibt sichtbar, ihre Links führen weiter in jedes Feld. Gibt es keinen Feldfehler (Netz-, Rate- oder Serverfehler), geht der Fokus wie bisher auf die Zusammenfassung.

## Tests
- Neu: `tests/unit/backend-api-fixes.test.ts` mit 23 Tests:
  - H-1: Flut ohne Token, eigener Bucket, Slowloris 408 mit Slot-Freigabe, 2 parallele Uploads je Client, Stream über dem Limit ohne Content-Length, globales Limit erst nach 60 gültigen Anfragen.
  - `leseBody`, Warteschlange und Schlüssel-Parallelität.
  - M-1: Header, XFF ignoriert, gemeinsamer Bucket.
  - M-2: Worker, Pixel- und Zeitlimit, Warteschlange und 503, Event-Loop.
  - L-3, L-4.
  - B1: statische Prüfung der Klasse.
  - A11y-Helfer.
- E2E: `tests/e2e/kontakt-api.spec.ts`:
  - Widget und Checkbox `toBeVisible`, noscript-Hinweis ohne JS `toBeVisible`.
  - Neuer Test: Fokus aufs erste Fehlerfeld und vollständige Namen in der Zusammenfassung.
  - Der Serverfehler-Test erwartet den Fokus jetzt auf `#feld-fotos`.
- In `tests/e2e/seiten.spec.ts` (page-builder) wurden zwei Zeilen angepasst: Fokus auf `#feld-name` statt auf die Zusammenfassung (wegen A11y 2) und noscript `toBeVisible`.
- Ergebnisse:
  - `npm test`: 14 Dateien, 253 Tests grün, Hook-Test 7/7.
  - `npm run check`: 0 Fehler.
  - `npm run build:staging`: grün.
  - E2E: **Mailpit/Docker hier nicht verfügbar**, Docker fehlt und der Download des Mailpit-Binaries wurde nicht freigegeben. Playwright lief mit dem lokalen Chrome (`channel: 'chrome'`, temporäre Konfiguration ohne Mailpit-Setup, danach gelöscht):
    - `seiten`, `security` und `design-system`: 149/149 grün.
    - `kontakt-api`, ohne Mailpit lauffähige Tests: Widget, Fokus/Feldnamen, Methoden/Rate-Limit grün.
    - Rest von `kontakt-api`: Die Sichtbarkeits- und Fokus-Assertions vor dem Mailpit-Zugriff liefen grün. Fehlgeschlagen sind nur die Mailpit-Abfragen bzw. 502 ohne SMTP.
  - Den vollen E2E-Lauf mit Mailpit bitte in CI oder mit Docker nachholen.

## Offen / für andere
- **architect:**
  - M-1 Server-Teil (Header setzen und überschreiben) ist Voraussetzung, siehe oben. Danach in CLAUDE.md eintragen.
  - Sockets nach einem frühen 408 schneller schließen (optional).
  - SPF/DKIM/DMARC-Prüfung im Launch-Check (L-4).
  - I-1 (`X-Forwarded-Host` erster Eintrag in `herkunft.ts`) ist unverändert, weil es nicht beauftragt war. Es ist ein Info-Befund und betrifft nur `TRUST_PROXY=true`.
- **page-builder:** Klasse in `KontaktFormular.astro` und zwei Assertions in `seiten.spec.ts` wurden geändert (siehe oben). Bitte übernehmen. Der Kommentar in `kontakt-schnittstelle.ts` zu den Statuscodes nennt 408 noch nicht. Das Formular-Skript behandelt 408 wie jeden anderen Fehler mit `nachricht`.
- **security-auditor:** Nachtest von H-1, M-1 (zusammen mit dem architect-Branch) und M-2 (VmHWM mit `flach.heic`). I-3 neu bewertet: Einträge im Einmal-Speicher entstehen nur mit gelöstem ALTCHA bzw. gültigem CSRF und unter dem Per-Client-Limit. Eine Verdrängung bleibt damit unpraktikabel.
