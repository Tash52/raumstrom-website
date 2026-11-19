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

---

# Nachtrag: Restbefunde der Security-Nachprüfung (N-1, N-2, M-2-Rest, N-3, I-7)

Stand: Branch `worktree-agent-a354c603cc1fbd909`, Basis `6c2e9fc`. Quelle: `docs/SECURITY-REPORT.md`, Abschnitt „Phase 2 – Nachprüfung“.

## Geändert

### N-1 · Globales Budget erst beim Versand (`kontakt-ablauf.ts`, `api.ts`, `speicher.ts`, `schluessel.ts`)
- `RateLimiter.stand()` liest ohne zu zählen. `kontaktGesamt` wird vor der Bildarbeit nur gelesen. Ist es erschöpft, gibt es sofort 429 ohne Arbeit. Gezählt wird **erst unmittelbar vor `d.sende`**, nachdem alle Fotos neu kodiert sind. Ein gescheiterter Versand (502) zählt mit, weil das SMTP-Kontingent dann schon berührt ist.
- Neu: `LIMITS.fotoAbgelehnt` (3 je Client und Stunde). Nach 3 abgewiesenen Fotos erhält derselbe Client für Anfragen **mit** Fotos 429, bevor Bildarbeit beginnt. Anfragen ohne Foto bleiben möglich. „ausgelastet“ (503) zählt nicht als Abweisung.
- Neu: `LIMITS.kontaktNetz` (nur IPv6). Alle /64 eines /48 haben zusammen höchstens 20 Versuche je 15 min (`netzSchluessel48`). Ein /56 bringt damit nicht mehr 256 eigene Buckets.

### N-2 · Annahme nur während des Lesens (`kontakt-ablauf.ts`, `api.ts`, `body.ts`, `speicher.ts`)
- Der Lese-Slot wird **direkt nach `leseBody`** freigegeben, nicht mehr erst nach Bildarbeit und SMTP. `ANNAHME_PRO_CLIENT` (2 je Client) gilt weiter für die ganze Anfrage, trifft aber nur den eigenen Client.
- Zwei Pools (neue Klasse `Annahme`):
  - `ANNAHME_KLEIN`: Bodys mit `Content-Length` ≤ 256 KB (Text, reservierte Skizze), 64 Plätze. Uploads können normale Anfragen damit nie blockieren.
  - `ANNAHME`: größere Bodys und Bodys ohne Länge. 16 Plätze, höchstens 8 × `MAX_BODY` reserviert (Reservierung = `Content-Length`, sonst `MAX_BODY`). Ist der Pool voll, wird der **langsamste Leser unter 256 KB/s nach der Schonfrist verdrängt** (er erhält 503 „ausgelastet“), statt die neue Anfrage abzuweisen. Reicht auch die Verdrängung nicht, wird niemand abgebrochen und die neue Anfrage erhält 503.
- Mindestrate 64 KB/s (0,5 Mbit/s) nach 5 s statt 16 KB/s nach 10 s. Frist = min(55 s, 5 s + `Content-Length` / 64 KB/s). `maxBytes` = min(`MAX_BODY`, `Content-Length`).
- Eigene Warteschlangen für die Arbeit:
  - `PARALLEL` (3 laufend, 6 wartend, 30 s) nur noch für Anfragen **mit** Fotos. Die Fotos selbst laufen seriell über `BILD_SLOT`.
  - SMTP über `VERSAND` (4 laufend, 16 wartend, 20 s).
  - Anfragen ohne Foto warten nie auf Bildarbeit.

### M-2-Rest · Speicher bei HEIC (`uploads/heic.ts`, `uploads/bild.ts`)
- `await worker.terminate()`: Ergebnis oder Fehler kommen erst zurück, wenn der Worker samt WASM-Speicher beendet ist.
- `BILD_SLOT = Parallelitaet(1, 8)` gilt serverweit für **jedes** Bild, vom Dekodieren bis zum fertigen JPEG. Damit gibt es höchstens einen Pixelpuffer in voller Größe. Danach wird der Puffer per `ArrayBuffer.transfer(0)` sofort freigegeben, statt auf den GC zu warten. `sharp.concurrency(1)`, der Cache bleibt aus.
- Der Worker dekodiert direkt über `heif_js_decode_image2` als interleaved **RGB** (RGBA nur bei Alphakanal). Vorher lief es über `display()` mit RGBA und einer zusätzlichen Kopie. Das WASM-Bild wird vor dem Versand der Kopie freigegeben.
- Das WASM-Modul wird einmal im Hauptthread kompiliert und an jeden Worker übergeben (`instantiateWasm`). Es wird also nicht mehr je Bild neu kompiliert.
- Neues Limit `MAX_PIXEL_HEIC_ALPHA = 16 MP` für HEIC mit Alphakanal (Grafiken, keine Kamerafotos). 5 × 10-Bit-RGBA mit 24 MP erreichten sonst 632 MB. Kamerafotos ohne Alpha bleiben bei 25 MP.

### N-3 · libheif-Ausgaben (`uploads/heic.ts`)
- Im Worker sind `console.*` sowie `print` und `printErr` stummgeschaltet.
- stdout und stderr des Workers werden abgefangen und verworfen (`stdout: true`, `stderr: true`).
- Der eigene Dekodierpfad nutzt den loggenden `display()`-Wrapper nicht mehr.

### I-7 · HEAD (`src/pages/api/altcha.ts`, `csrf.ts`)
- `HEAD /api/altcha` und `HEAD /api/csrf` antworten mit Status und Headern wie GET (200, bzw. 429 mit `Retry-After`), aber ohne Body.
- Dabei entsteht weder Challenge noch Token, und das Limit wird nur gelesen.
- Andere Methoden erhalten 405 mit `Allow: GET, HEAD`.

## Messung (gebauter Server, Staging-Build)

- **Aufbau wie im Bericht:**
  - `node server/server.mjs` mit `TRUST_PROXY=true` und wechselnder XFF.
  - SMTP zeigt auf einen geschlossenen Port, 502 heißt also „alle Prüfungen bestanden“.
  - ALTCHA mit `altcha-lib` gelöst.
  - HEIC aus pillow-heif 1.1.1 (libheif 1.20.2, Scratch-venv).
- **Messgrößen:** VmHWM aus `/proc/<pid>/status`, `/healthz` alle 50 ms, für jede Messung ein frischer Server.
- **„vorher“** = Build von `6c2e9fc` auf derselben Maschine.

| Szenario | vorher VmHWM | nachher VmHWM | nachher RSS danach | Ergebnis nachher | `/healthz` max |
|---|---|---|---|---|---|
| 1 × 1 × flach-24mp | – | 350 MB | 140 MB | 502, 0,9 s | 73 ms |
| 1 × 5 × flach-24mp | 661 MB | **454 MB** | 247 MB | 502, 3,5 s | 38 ms |
| 1 × 5 × rausch-24mp (0,3 MB je Bild) | 695 MB | **492 MB** | 284 MB | 502, 6,3 s | 65 ms |
| 4 × 5 × rausch-24mp | – | 535 MB | 300 MB | 4 × 502, 24,6 s | 93 ms |
| 8 × 5 × flach-25mp | 770 MB | **519–544 MB** | 284 MB | 8 × 502, 29,5 s | 83 ms |
| 1 × 1 × 10-Bit-RGBA 24 MP | 511 MB | 120 MB | – | 422 „zu hohe Auflösung“ (Alpha-Limit) | – |
| 1 × 5 × 10-Bit-RGB 24 MP | – | 530 MB | 236 MB | 502, 4,2 s | 72 ms |
| 1 × 5 × 10-Bit-RGBA 16 MP | – | 488 MB | 231 MB | 502, 4,3 s | 86 ms |
| 1 × 5 × flach-40mp | – | 124 MB | – | 422 | – |
| 1 × 2 × JPEG 40 MP (9 MB) | 316 MB | 318 MB | – | 502, 2,8 s | 54 ms |
| 3 × 5 × PNG 40 MP | – | 334 MB | – | 3 × 502, 5,0 s | 99 ms |

- **Ziel < 600 MB:** in allen Szenarien erreicht, Spitze 544 MB. Zwischen Läufen schwanken die Werte um etwa ± 25 MB.
- **`MALLOC_ARENA_MAX=2`:** senkt die Spitze weiter. 4 × 5 × rausch kommt auf 435 MB, 8 × 5 × flach-25mp auf 427 MB, RSS danach etwa 200 MB. Der Wert lässt sich nur beim Prozessstart setzen, deshalb als Empfehlung für Phase 6 (Dockerfile oder Startskript).
- **Wirkung der einzelnen Maßnahmen** (1 × 5 × rausch / 8 × 5 × flach-25mp):
  - Slot, RGB und `await terminate`: 602 MB / – .
  - Dazu sofortige Pufferfreigabe: 539 / 598 MB.
  - Dazu geteiltes WASM-Modul: 493 / 519 MB.

## Reproduktionen am gebauten Server

- **N-1:** 12 Adressen × 5 Anfragen mit dem Foto „kein bild“ als `image/jpeg`, gültigem CSRF und gelöstem ALTCHA.
  - Ergebnis: 36 × 422 und 24 × 429 („rate-limit fotos“, ab der 4. Anfrage je Adresse).
  - Danach eine legitime Anfrage ohne Foto: **502 nach 15 ms**. Mit 12-MP-JPEG: **502 nach 1,4 s**.
  - Vorher: 429 mit `Retry-After: 3321`.
- **N-2, Reproduktion 1:** 4 Adressen × 2 Verbindungen mit 20 KB/s, `Content-Length: 20000000`.
  - Die legitime Anfrage einer 5. Adresse erhält **502 nach 27 ms** (vorher 503).
  - Die langsamen Verbindungen erhalten 408 nach 5,1 s.
  - Der Server schließt den Socket erst nach etwa 11 s. Das ist der offene Punkt bei architect.
- **N-2, Variante oberhalb der Mindestrate:** 8 Adressen × 2 Verbindungen mit 80 KB/s, je 20 MB.
  - 9 Verbindungen werden angenommen (Byte-Budget), 7 erhalten sofort 503.
  - Eine legitime Anfrage mit 12-MP-Foto 6 s später: **502**. Dafür wird der langsamste Leser verdrängt und erhält 503.
  - Eine legitime Anfrage ohne Foto: **502 nach 13 ms**.
  - Die übrigen Angreifer enden bei 55 s mit 408.
- **N-2, Reproduktion 2:** 8 Anfragen von 4 Adressen mit je 5 × HEIC 24 MP Rauschen, 1 s später eine Anfrage ohne Foto.
  - Die Anfrage ohne Foto erhält **502 nach 33 ms** (vorher 503 nach 0,0 s).
  - Von den Last-Anfragen erhalten 6 × 502 und 2 × 503 nach 30 s (Warteschlange `PARALLEL`).
- **N-3:** Ein abgeschnittenes HEIC (3 Bilder) ergibt 422. Im Log steht nur `kontakt: foto abgelehnt defekt`. Vorher standen dort Zeilen wie `Decoding image failed heif_image_handle {} { … message: 'Invalid input: …' }`.
- **I-7:** `curl -I` auf `/api/altcha` und `/api/csrf` ergibt 200 mit JSON-Content-Type und `no-store`. `PUT /api/altcha` ergibt 405 mit `Allow: GET, HEAD`.

## Tests
- Neu: `tests/unit/backend-api-nachpruefung.test.ts` mit 19 Tests:
  - **N-1:**
    - `stand()` zählt nicht.
    - Reproduktion 12 × 5, danach 200.
    - 60 defekte Fotos verbrauchen kein Budget.
    - Die Foto-Sperre trifft nur den eigenen Client.
    - Das Budget wird vor dem Versand verbucht, auch bei 502.
    - IPv6-/48-Limit.
  - **N-2:**
    - Mindestrate und Frist.
    - Slots sind während Bildarbeit und Versand frei.
    - Ein voller Upload-Pool und volle Bild-Warteschlangen blockieren keine Anfrage ohne Foto.
    - `Annahme`: Reservierung, Schonfrist und Verdrängung, auch der Fall „verdrängt niemanden, wenn es nicht reicht“.
    - `leseBody` endet bei Verdrängung. Die verdrängte Anfrage erhält 503 und gibt ihren Client-Slot frei.
  - **M-2:**
    - Ergebnis und Fehler kommen erst nach beendetem Worker.
    - RGB ohne Alpha, Alpha-Limit.
    - Über 3 parallele Anfragen läuft höchstens ein Bild gleichzeitig.
  - **N-3:** Ein defektes HEIC schreibt nichts nach stdout, stderr oder console.
  - **I-7:** `kopfAntwort`, HEAD-Export und `Allow`.
- `tests/unit/backend-api-fixes.test.ts`: Den M-2-Block auf `BILD_SLOT` und `kodiereNeu` umgestellt (`dekodiereHeic` und `HEIC_SLOT` entfallen).
- Ergebnisse:
  - `npm test`: 16 Dateien, 302 Tests grün, Hook-Test 7/7.
  - `npm run check`: 0 Fehler, 0 Warnungen, 0 Hinweise.
  - `npm run build:staging` grün, `npm run scan:wording` ohne Befund.
  - E2E: nicht gelaufen, weil Docker und Mailpit hier fehlen.

## Offen / für andere
- **architect (Phase 6):**
  - `MALLOC_ARENA_MAX=2` im Container bzw. im Startskript setzen (spart laut Messung oben etwa 110 MB Spitze).
  - Container-Limit mindestens 1 GB.
  - Sockets nach frühem 408 schneller schließen: Die Antwort kommt nach 5,1 s, der Socket bleibt bis etwa 11 s offen.
  - Optional in CLAUDE.md (Abschnitt Kontakt-API): `HEAD` auf `/api/csrf` und `/api/altcha`.
- **security-auditor:** Nachtest N-1, N-2 und M-2 mit den Reproduktionen aus dem Bericht. Neu zu prüfen:
  - Verdrängung im großen Pool: Eine Verbindung mit mindestens 256 KB/s wird nicht verdrängt. Der Pool hat 16 Plätze und 8 × 22 MB Byte-Budget.
  - Alpha-Limit.
- **Restrisiken:**
  - Wer 60 ALTCHA je Stunde löst **und** 60 echte Mails versendet, erschöpft das globale Budget weiterhin. Das ist gewollt: Das Budget schützt das SMTP-Kontingent, und der Betreiber sieht die Mails.
  - Unter HEIC-Volllast (mehr als 9 Anfragen mit Fotos gleichzeitig) erhalten weitere Foto-Anfragen nach 30 s 503. Anfragen ohne Foto sind nicht betroffen.
  - Legitime Uploads unter 64 KB/s (0,5 Mbit/s) enden nach 5 s mit 408. Unter Last kann ein Upload unter 256 KB/s verdrängt werden.
