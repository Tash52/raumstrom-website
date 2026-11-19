# SECURITY-REPORT

Pflege: `security-auditor`. Jede Prüfphase als eigener Abschnitt. Befunde mit Schweregrad, `Datei:Zeile`, Reproduktion, Fix-Vorschlag; „belegt" = am laufenden Server reproduziert, „Vermutung" = aus dem Code abgeleitet, nicht vollständig nachgewiesen.

---

## Phase 2 – Kontakt-API

- **Stand:** `8a1a7f7` (main), frischer Klon `/tmp/sec2`, `npm ci`, `npm run build:staging` (`npm run build` bricht wegen offener Platzhalter ab, wie vorgesehen). Es gibt also nur einen Staging-Build. Er hat dieselbe Server- und API-Logik wie der Produktions-Build, nur `allowedDomains` enthält zusätzlich `localhost` und `127.0.0.1`.
- **Umgebung:** `node server/server.mjs` mit Test-Secrets, zweimal gestartet: A auf `:18480` mit `TRUST_PROXY=false` und B auf `:18481` mit `TRUST_PROXY=true`, damit wechselnde Client-Kennungen per XFF getestet werden können. Eigener Mailpit-Container `sec2-mailpit` auf `127.0.0.1:21025/28025` mit STARTTLS und Wegwerf-Zertifikat über `NODE_EXTRA_CA_CERTS`. Nach dem Test wurde alles beendet bzw. entfernt.
- **Werkzeuge:** eigene Node-Skripte (fetch/net/http, ALTCHA über `altcha-lib` `solveChallenge` gelöst), curl, sharp und pillow-heif für die Testbilder, `npm audit`, Semgrep 1.186.0 mit lokalen Regeln aus `semgrep/semgrep-rules` (javascript, typescript, html, generic/secrets), OWASP ZAP Baseline (`zaproxy/zap-stable`, Docker, `--network host`).

### Gesamturteil

**Bedingt bestanden, mit 1 High und 2 Medium.** Die Sicherheitslogik hält: Origin/CSRF, ALTCHA mit Replay-Schutz, Validierung, Uploads (Signatur und Neukodierung), Mail-Header, Fehlermeldungen, Logs und Header. Es gab keine Injection, kein XSS, keinen Pfad-Ausbruch, keine Secrets im Repo oder in `dist/` und keine Stacktraces in Antworten. Die Schwächen betreffen die **Verfügbarkeit**: Ein einzelner Client ohne Token kann das Formular für eine Stunde sperren (H-1). Die Per-Client-Drosselung lässt sich bei `TRUST_PROXY=false` per `X-Forwarded-For` umgehen (M-1). HEIC-Uploads kosten unverhältnismäßig viel Speicher (M-2). Vor dem Livegang müssen H-1, M-1 und M-2 behoben und erneut geprüft werden.

| ID | Schwere | Kurz | Status |
|---|---|---|---|
| H-1 | High | Globales Limit und Parallel-Slots werden vor jeder Authentifizierung verbraucht: ein Client sperrt das Formular für 1 h | belegt |
| M-1 | Medium | `TRUST_PROXY=false` vertraut trotzdem dem ersten `X-Forwarded-For` (über Astros `clientAddress`), Per-Client-Limits umgehbar | belegt |
| M-2 | Medium | HEIC-Pfad: 4 Anfragen mit je 5 × 24 KB HEIC ergeben 1,78 GB RSS, die nicht wieder freigegeben werden; der Event-Loop blockiert bis 1,6 s | belegt |
| L-1 | Low | Protokoll-relative Weiterleitung `/%2Fkontakt` → `Location: //kontakt/` | belegt |
| L-2 | Low | `TRACE` auf `/api/*` → 500 und Astro-Stacktrace im Log | belegt |
| L-3 | Low | RFC-2047-Encoded-Word im Reply-To-Anzeigenamen bleibt stehen | belegt (Header), Wirkung im Client: Vermutung |
| L-4 | Low | Eingangsbestätigung an beliebige Adressen (fester Text), bis 60/h | belegt (Design) |
| I-1…I-5 | Info | siehe unten | – |

### H-1 · High · Unauthentifizierte Sperre des Kontaktformulars (globales Limit und Parallel-Slots)

- **Ort:** `src/lib/security/kontakt-ablauf.ts:71-76` (`LIMITS.kontaktGesamt.pruefe('gesamt')` läuft bei **jeder** Anfrage, auch wenn das Per-Client-Limit schon greift, und noch vor CSRF/ALTCHA). `src/lib/security/kontakt-ablauf.ts:78` belegt den Parallel-Slot, bevor der Body gelesen wird (`:86`). `src/lib/security/api.ts:48` (60/h global) und `:58` (`Parallelitaet(4)`).
- **Reproduktion (belegt, Server B):**
  1. Ein Client (fester XFF `203.0.113.7`) sendet 70 × `POST /api/contact` mit gleichem Origin, `multipart` und nur `name=x`, also ohne CSRF und ohne ALTCHA. Ergebnis: 5 × 403, danach 65 × 429.
  2. Danach eine vollständig gültige Anfrage (CSRF und gelöstes ALTCHA) von einem **anderen** Client (`198.51.100.99`) → **429, `Retry-After: 3526`**. Das Formular ist für alle gesperrt, rund 59 min.
  3. Variante Slowloris: 4 Verbindungen mit `Content-Length: 1000000`, die 1 Byte pro 5 s senden. Eine gültige Anfrage während dieser Zeit → **503**. Die Slots werden erst nach `requestTimeout` (60 s, `server/server.mjs:103`) mit 408 frei. Dafür braucht es kein Token, nur Origin und Content-Type, die ein Nicht-Browser-Client beliebig setzt.
- **Wirkung:** Der wichtigste Geschäftskanal (Anfragen) lässt sich mit einer curl-Schleife (rund 60 Anfragen pro Stunde) dauerhaft abschalten. CVSS 3.1 etwa 7.5 (AV:N/AC:L/PR:N/UI:N/A:H).
- **Fix-Vorschlag (backend-api):**
  - Das globale Budget nur für Anfragen zählen, die das Per-Client-Limit bestanden haben, besser erst **nach** gültigem CSRF und gültigem ALTCHA (also für echte Versandversuche). Für rohe Last reicht das Per-Client-Limit, das nach M-1 an der echten Adresse hängt.
  - Den Parallel-Slot erst nach der CSRF-Prüfung belegen. Dafür den CSRF-Token zusätzlich als Header (`X-CSRF-Token`) senden, damit er vor dem Body-Parsing prüfbar ist, oder den Slot erst nach `formData()` belegen und das Body-Lesen mit einem eigenen kurzen Timeout begrenzen (z. B. 20 s statt 60 s).
  - Optional: globales Limit als Schutz des SMTP-Kontingents nur auf erfolgreich versandte Mails anwenden und eine Alarm-Logzeile ausgeben, wenn es greift.
- **Nachtest:** Schritte 1 bis 3 wiederholen. Erwartung: Eine legitime Anfrage von einem zweiten Client erhält 200.

### M-1 · Medium · `TRUST_PROXY=false` schützt nicht: Astro setzt `clientAddress` aus dem ersten `X-Forwarded-For`

- **Ort:** `src/lib/security/anfrage.ts:5-10` (`context.clientAddress`) und `src/lib/security/schluessel.ts:42-48` (ohne `TRUST_PROXY` wird `socketAdresse` direkt übernommen). Ursache in Astro 7.4.12: `node_modules/astro/dist/core/app/node.js:62-64`. Ist der Host gegen `security.allowedDomains` validiert, ist `clientAddress` der **erste** XFF-Eintrag, also vom Client gesetzt.
- **Reproduktion (belegt, Server A, `TRUST_PROXY=false`):** Mit `Host: raumstrom.de`, `X-Forwarded-Proto: https`, `Origin: https://raumstrom.de` und wechselndem `X-Forwarded-For: 192.0.2.$i` → 8 × 403 (CSRF), **nie 429**. Mit festem XFF → 5 × 403, dann 429. `GET /api/altcha` 40 × mit wechselndem XFF → 40 × 200 (Limit 30/10 min). Derselbe Effekt trat im Staging-Build auch mit `Host: 127.0.0.1:18480` auf.
- **Wirkung:** Die Per-Client-Limits (Kontakt 5/15 min, CSRF/ALTCHA 30/10 min) sind für jeden Client umgehbar. Das gilt im Produktionsbetrieb direkt (der Angreifer setzt `X-Forwarded-Proto: https` selbst) und ebenso hinter einem Proxy, der XFF anhängt. Gegenmittel bleiben nur das globale Limit (das wiederum H-1 auslöst) und der ALTCHA-Arbeitsnachweis. Der dokumentierte Sicherheitshinweis „TRUST_PROXY nur hinter eigenem Proxy" kehrt sich damit um: Der Standardwert ist der unsichere.
- **Fix-Vorschlag (backend-api, Rücksprache architect wegen `server/server.mjs`):** Die Socket-Adresse nicht aus `context.clientAddress` nehmen, sondern in `server/server.mjs` vor `astroHandler` als `req.socket.remoteAddress` durchreichen (z. B. per Symbol oder `locals` am Request bzw. eigenem Header, den der Server immer **überschreibt**). Alternativ setzt `server/server.mjs` bei `TRUST_PROXY=false` `delete req.headers['x-forwarded-for']` (sowie `-host`, `-proto` und `-port`), bevor Astro den Request baut. Dazu ein Unit- oder E2E-Test: `TRUST_PROXY=false` plus wechselnder XFF → 429 nach 5.
- **Nachtest:** Reproduktion wiederholen. Erwartung: 429 nach der fünften Anfrage, auch bei wechselndem XFF.

### M-2 · Medium · HEIC-Dekodierung: Speicherverstärkung und blockierter Event-Loop

- **Ort:** `src/lib/uploads/bild.ts:50-73` (`heicZuRoh`): libheif-WASM dekodiert synchron im Haupt-Thread. `:66` legt RGBA mit bis zu 40 MP × 4 = 160 MB als JS-Puffer an, dazu kommen die Puffer im WASM-Heap. `:79` übergibt das Ergebnis als rohe Eingabe an sharp. Das `timeout` von sharp (`:89`) gilt nicht für den libheif-Schritt. Der WASM-Speicher wächst und schrumpft nicht.
- **Reproduktion (belegt, Server B):** `flach.heic` mit 8000 × 5000 einfarbigen Pixeln ist nur **24 KB** groß (pillow-heif).
  - 1 Anfrage mit 5 Fotos: 200, 5,6 s, `/healthz` bis **675 ms** blockiert, VmHWM **970 MB**.
  - 4 Anfragen parallel mit je 5 Fotos (zusammen rund 0,5 MB Upload): 4 × 200, 11,3 s, `/healthz` bis **1,6 s** blockiert, VmHWM **1,78 GB**, RSS danach dauerhaft **1,63 GB**.
  - Zum Vergleich: PNG mit 39,7 MP (128 KB) über sharp, 5 Stück in 3,1 s, unauffällig.
- **Wirkung:** Ein Container mit 1 bis 1,5 GB Speicherlimit (Phase 6) wird beendet (OOM), der Server blockiert für alle Seiten. Für jede Anfrage braucht es ein gelöstes ALTCHA (rund 1 s), die Per-Client-Limits sind nach M-1 umgehbar, und vier Anfragen genügen.
- **Fix-Vorschlag (backend-api):**
  - Eigenes, niedrigeres Pixellimit für HEIC, z. B. 24 MP (iPhone-Fotos 12 bis 48 MP; 48-MP-ProRAW kommt als HEIC selten vor) oder Begrenzung auf 1 HEIC je Anfrage.
  - HEIC-Dekodierung in einen `worker_thread` mit `resourceLimits` (z. B. `maxOldGenerationSizeMb`) und hartem Timeout auslagern; den Worker nach jeder Anfrage beenden, damit der WASM-Heap freigegeben wird.
  - Für HEIC eine eigene Parallelitätsgrenze von 1 setzen.
  - Für den Container (Phase 6) Speicherlimit und Neustart-Richtlinie vorsehen.
- **Nachtest:** Reproduktion wiederholen. Ziel: VmHWM unter 600 MB, `/healthz`-Latenz unter 200 ms.

### L-1 · Low · Protokoll-relative Weiterleitung über kodierten Schrägstrich

- **Ort:** `server/static.mjs:70`. Die Weiterleitung wird aus dem **dekodierten** `pathname` gebaut.
- **Reproduktion (belegt):** `curl -s --path-as-is -o /dev/null -w '%{http_code} %header{location}' 'http://127.0.0.1:18480/%2Fkontakt'` → `308 //kontakt/`. `/%2F%2Fkontakt` → `///kontakt/`, `/%2Fleistungen` → `//leistungen/`. Browser lösen das als `https://kontakt/` auf.
- **Wirkung:** Weiterleitung nur auf einteilige Hostnamen, die als Verzeichnis in `dist/client` existieren (kontakt, leistungen, fonts …). Relevant nur in Netzen mit DNS-Suchdomäne (Intranet). Kein Ziel frei wählbar.
- **Fix-Vorschlag (architect):** `return { redirect: '/' + segments.join('/') + '/' }` und Segmente beim Zusammensetzen URL-kodieren (`encodeURIComponent`).

### L-2 · Low · `TRACE`/`CONNECT` auf `/api/*` → 500 und Stacktrace im Log

- **Ort:** `server/server.mjs:72-76`. Astro baut `new Request()` mit der Methode TRACE, undici wirft, `@astrojs/node` loggt `[ERROR] Could not render /api/contact` mit vollem Stack.
- **Reproduktion (belegt):** `curl -si -X TRACE http://127.0.0.1:18480/api/contact` → `500 Internal Server Error` (Text „Internal Server Error", keine Interna in der Antwort). Im Log stehen 10 Zeilen Stack je Anfrage. Das bläht das Log auf und widerspricht der Vorgabe „Log ohne Interna".
- **Fix-Vorschlag (architect):** In `server/server.mjs` vor dem Astro-Aufruf nur `GET, POST` (und `HEAD`) für `/api/*` zulassen, sonst `plain(res, 405, …, { Allow: 'GET, POST' })`.

### L-3 · Low · Encoded-Word im Reply-To-Anzeigenamen

- **Ort:** `src/lib/mail/kontakt-mails.ts:16-18` (`anzeigeName` entfernt `" < > , ; : \ @`, aber nicht `=?…?=`).
- **Reproduktion (belegt):** Name `Eve "Boss" <ceo@firma.de>, x@y.de; =?utf-8?B?QmNjOiB2QHguZGU=?=` → Header `Reply-To: "Eve Boss ceo firma.de x y.de =?utf-8?B?QmNjOiB2QHguZGU=?=" <eve+tag@sub.example.org>`. Die Adresse bleibt korrekt, es entsteht **kein** neuer Header (CRLF wird vorher mit 422 abgelehnt, belegt).
- **Wirkung (Vermutung):** Manche Clients dekodieren Encoded-Words auch in Quoted-Strings (RFC 2047 verbietet das) und zeigen dann einen frei gewählten Anzeigenamen samt `<…@…>` an, also Anzeige-Spoofing gegenüber dem Betreiber.
- **Fix-Vorschlag (backend-api):** In `anzeigeName` zusätzlich `=?` und `?=` entfernen (z. B. `.replace(/=\?|\?=/g, ' ')`). Unit-Test ergänzen.

### L-4 · Low · Eingangsbestätigung an fremde Adressen

- **Ort:** `src/lib/security/kontakt-ablauf.ts:150-158`.
- **Befund (belegt, Design):** Wer CSRF und ALTCHA löst, kann eine Bestätigung an jede Adresse schicken. Der Inhalt ist fest, ohne Nutzereingaben (belegt im Mailpit-Rohtext) und mit `Auto-Submitted: auto-replied`. Die Grenze liegt bei 2 je Adresse in 23 h und über das globale Limit bei 60/h. Kein Spam-Relay, aber Backscatter mit Reputationsrisiko für die Absenderdomain.
- **Vorschlag:** Akzeptabel. Optional die Bestätigung nur senden, wenn das globale Limit weit unterschritten ist (z. B. höchstens 20/h), und SPF/DKIM/DMARC für `MAIL_FROM` im Launch-Check aufnehmen.

### Info

- **I-1 · `X-Forwarded-Host` mit `TRUST_PROXY=true`** (`src/lib/security/herkunft.ts:25`): Wird der erste XFH-Eintrag genommen, besteht `Origin: https://evil.example` plus `X-Forwarded-Host: evil.example` die Herkunftsprüfung (belegt, 200). Ein Browser kann XFH cross-site nicht setzen, und `Sec-Fetch-Site: cross-site` wird vorher abgewiesen (belegt, Astro-`checkOrigin` 403). Das ist also kein CSRF. Empfehlung: Nur dem Proxy-Wert vertrauen (letzter Eintrag) oder XFH ganz ignorieren und nur die feste Domain erlauben.
- **I-2 · ALTCHA `solution.counter`** wird bei signiertem Schlüssel nicht geprüft. Ein Payload mit `counter+1` wurde akzeptiert (belegt). Maßgeblich ist `derivedKey` gegen `keySignature`, der Arbeitsnachweis bleibt nötig. Der Replay-Schutz über die Nonce griff anschließend für das Original (422 „wiederholt", belegt). Kein Befund.
- **I-3 · EinmalSpeicher-Verdrängung** (`src/lib/security/speicher.ts:58-68`): Bei 50 000 Einträgen fallen die ältesten heraus, ein Replay wird theoretisch möglich. Wegen des globalen Limits (60/h) ist das praktisch nicht erreichbar. Kein Handlungsbedarf, solange H-1 das globale Limit nicht entfernt. Bei einer Änderung erneut bewerten.
- **I-4 · PNG-Header-Bombe** 20000 × 20000 liefert „Foto konnte nicht gelesen werden" statt „zu groß" (die libvips-Meldung passt nicht auf `/pixel limit/i`, `src/lib/uploads/bild.ts:99`). Sicher abgewiesen, nur die Meldung ist ungenau.
- **I-5 · Semgrep** (17 Treffer, 0 im Prüfumfang mit Laufzeitrisiko): `detect-redos` `server/site.mjs:20` (nur zur Build-Zeit auf eigener Domain), `lazy-load-module` `src/lib/uploads/bild.ts:43` (bewusst), `html-in-template-string` `src/components/sections/markdown.ts`, `src/lib/content/rechtstext.ts` (Build-Zeit aus Repo-Inhalten, außerhalb Phase 2, in Phase 7 mit Fokus auf Keystatic-Eingaben ansehen), `prototype-pollution-loop` `src/lib/content/rechtstext.ts:49` (Build-Zeit). 3 Parser-Fehler bei `.astro`-Dateien.

### Geprüft ohne Befund (belegt)

| Bereich | Test | Ergebnis |
|---|---|---|
| Origin | fehlt / fremd / `null` / ohne `Sec-Fetch-Site` mit falschem Origin | 403 (eigene Meldung) |
| Sec-Fetch-Site | `cross-site`, `same-site` | 403 (Astro `checkOrigin`) |
| CSRF | fehlt / manipuliert / Ablauf verändert / zweite Nutzung | 403, kein Versand |
| ALTCHA | fehlt / Müll / `expiresAt` verlängert / `cost=1` / Replay | 422, kein Versand |
| Felder | unbekanntes Feld, doppeltes Feld, Datei in Textfeld | 400 |
| Validierung | CRLF in Name und E-Mail, Komma-/Quoted-Adresse, unbekanntes `anliegen` (`../../etc`), Nachricht 4001 Zeichen, `skizze` kein JSON, Einwilligung fehlt | 422 mit deutscher Feldmeldung |
| Honeypot | `website` gefüllt | 200, kein Versand |
| Content-Type | `text/plain`, `x-www-form-urlencoded` → 415; falsche Boundary → 400 | ok |
| Größe | `Content-Length` 30 MB → 413; `Content-Length: abc` → 400; chunked 40 MB ohne Länge → 400 nach 128 ms; Datei 11 MB → 422; 6 Dateien → 422; leere Datei → 422 | ok |
| Magic Bytes | HTML als `image/jpeg`, SVG (auch `image/svg+xml`), AVIF, GIF → 422 „Format"; JPEG-Signatur plus HTML → 422 „defekt" | ok |
| Polyglot | gültiges JPEG plus angehängtes `<script>` → 200, Anhang neu kodiert, ohne Fremdbytes | ok |
| Pixel-Flut | PNG 39,7 MP (128 KB), 5 Stück → 2560 × 2560-JPEGs in 3,1 s; Header-Bombe 20000² → 422 | ok |
| EXIF/GPS | JPEG mit Make/Model/Copyright/GPS und Orientation 6 → Anhang `foto-1.jpg` 480 × 640, ohne EXIF/ICC/XMP; Dateiname `../../etc/passwd.jpg` ignoriert | ok |
| HEIC | Fixture → 200, Anhang JPEG (Last siehe M-2) | ok |
| Mail | From immer `MAIL_FROM`, Kunde nur `Reply-To`, Betreff fest; `text/plain`, HTML/Links/`.`/`QUIT` in der Nachricht bleiben wirkungsloser Text (quoted-printable); Bestätigung ohne Nutzereingaben | ok |
| 303-Pfad | ohne `Accept: application/json` → `303 /kontakt/danke/` | ok |
| Methoden | PUT/DELETE/OPTIONS/PATCH/GET auf `/api/contact` → 405 `Allow: POST`; POST/HEAD `/api/csrf` → 405; Seiten: Nicht-GET → 405 (TRACE: L-2) | ok |
| Keystatic | `/keystatic`, `/keystatic/`, `/api/keystatic`, `/api/keystatic/x` → 404 | ok |
| Pfade | `%2e%2e`, `..%2f`, `%5c`, `%00`, `/.env`, `/.git/config`, `/_headers.json`, `/../server/entry.mjs`, `/server/`, `/client/index.html` → 404; `/.well-known/security.txt` → 200 | ok (Redirect: L-1) |
| Host-Header | `Host: evil.example` → relative `Location`, keine Host-Übernahme; Query mit `%0d%0a` bleibt kodiert, kein `Set-Cookie` | ok |
| TRUST_PROXY=true | letzter XFF-Eintrag zählt; erster Eintrag wechselnd → 429 nach 5 | ok |
| Fehlerantworten | nur feste deutsche Texte; 500 nur „Internal Server Error" bzw. eigene Meldung | ok |
| Logs | nur Ereignisnamen (`[api] kontakt: …`); keine Namen, Adressen, IPs, Tokens (grep auf `@`, IPv4, Testnamen: 0 Treffer außer Startzeile/Astro-Pfad) | ok (Ausnahme L-2) |
| Header | Seiten und API: HSTS (2 J., includeSubDomains), nosniff, XFO DENY, Referrer-Policy, Permissions-Policy (20 Features aus, fullscreen self), COOP/CORP same-origin, OAC, X-Permitted-Cross-Domain-Policies | ok |
| CSP | alle 30 HTML-Seiten mit eigener Policy aus `_headers.json`; Skripte/Styles per SHA-256; kein `unsafe-inline`/`unsafe-eval`/`wasm-unsafe-eval` im Staging-Build; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri`/`form-action 'self'`, `upgrade-insecure-requests`; Fallback für Assets/API `default-src 'none'`; 0 `style=`/`on*=` im HTML | ok |
| Formular-Client | nur `textContent`, `?anliegen=` nur gegen Optionsliste, kein `innerHTML` | ok |
| Secrets | Repo/Historie: nur Test-Fixtures (`'a'.repeat(40)` u. ä.), keine `.env`/Schlüssel committet; `dist/` ohne Secrets, ohne Sourcemaps | ok |
| `npm audit` | 0/0/0/0; `npm run audit` ok. `npm audit signatures` konnte nicht laufen (Download blockiert, Netzrichtlinie) | ok / offen |
| ZAP Baseline | 60 PASS, 0 FAIL, 2 WARN informativ: 10109 „Modern Web Application" (noscript-Hinweis), 10031 „User Controllable Attribute" bei `?anliegen=` (Falsch-Positiv: statisches HTML, Client prüft gegen Optionsliste) | ok |

### Nicht geprüft / Grenzen

- Kein echter Produktions-Build (`check:launch` offen). Unterschied zu Staging: `allowedDomains` ohne localhost; M-1 wurde mit `Host: raumstrom.de` plus `X-Forwarded-Proto: https` nachgestellt.
- Container-Härtung, Mistral, Planer-Versand: Phase 6.
- `npm audit signatures` und Trail-of-Bits-`supply-chain-risk-auditor`: nicht ausgeführt (Netz bzw. nicht im Auftrag).
- Mozilla Observatory: kein Zugriff auf den externen Dienst. Nach den Headern zu urteilen ist A+ zu erwarten, mit einem Abzug, falls Observatory `X-Frame-Options` neben `frame-ancestors` anders bewertet.

### Rückgabe an die bauenden Agenten

- **backend-api:** H-1, M-1 (zusammen mit architect), M-2, L-3, optional L-4, I-1, I-4.
- **architect:** L-1, L-2 (`server/server.mjs`, `server/static.mjs`), Server-Anteil von M-1.
- Nach den Fixes prüft der security-auditor H-1, M-1, M-2, L-1, L-2 und L-3 mit den oben genannten Reproduktionen erneut.

### Phase 2 – Nachprüfung

- **Stand:** `main` @ `0065724` (enthält `41b1886` backend-api und `fbf8971` architect). `npm run build:staging` frisch gebaut (124 vorkomprimierte Dateien). Unit-Tests `backend-api-fixes` und `server-http`: 53/53 grün.
- **Umgebung:** `node server/server.mjs` mit Test-Secrets (ohne `.env`), A auf `:18480` mit `TRUST_PROXY=false`, B auf `:18481` mit `TRUST_PROXY=true` (wechselnde Client-Adressen per XFF). Kein Docker und kein Mailpit: SMTP zeigt auf einen geschlossenen Port, **502 heißt also „alle Prüfungen bestanden, nur der Versand scheitert"**. ALTCHA wurde mit `altcha-lib` `solveChallenge` gelöst. HEIC-Testbilder kamen aus pillow-heif 1.8.1 (Scratch-venv). Speicher gemessen als VmHWM/VmRSS des Serverprozesses (`/proc/<pid>/status`), Latenz über `/healthz` alle 50 ms. Für jede Messung wurde B neu gestartet.

#### Gesamturteil

**Nicht bestanden, knapp.** M-1, L-1, L-2, L-3 und L-4 sind behoben (belegt). Die ursprünglichen Reproduktionen zu H-1 und M-2 schlagen nicht mehr an. Der Event-Loop bleibt frei, und ein Client ohne Token sperrt niemanden mehr. Es gibt aber zwei neue, belegte Wege zur Sperre (N-1, N-2, je Medium). Außerdem liegt der Spitzenspeicher bei HEIC über dem Nachtest-Ziel (M-2-Rest). Alle drei Fixes sind klein und lokal. Danach ist ein kurzer Nachtest nötig.

| ID | Status | Kurz |
|---|---|---|
| H-1 | **teilweise** (Repro behoben, Rest = N-1, N-2) | Flut ohne Token und Slowloris mit 1 B/2 s sperren nicht mehr |
| M-1 | **behoben** (belegt) | XFF, `Forwarded`, `X-Real-IP` und `x-raumstrom-client-ip` vom Client wirken nicht mehr |
| M-2 | **teilweise** (belegt) | Event-Loop frei, 40 MP abgewiesen, Dekodierung seriell; Spitze 690–850 MB statt < 600 MB |
| L-1 | **behoben** (belegt) | keine protokoll-relative Weiterleitung |
| L-2 | **behoben** (belegt) | TRACE und andere Methoden → 405, kein Stack im Log |
| L-3 | **behoben** (belegt, Header) | `=?`/`?=`, Bidi und Zero-Width werden entfernt |
| L-4 | **behoben** (Code und Unit-Test; ohne SMTP nicht dynamisch geprüft) | 20 Bestätigungen/h gesamt |
| Kompression | **ohne Befund** (belegt) | `.br`/`.gz` nicht direkt abrufbar, Vary korrekt, API unkomprimiert |
| N-1 | **neu · Medium · belegt** | globales Budget mit gelösten ALTCHA ohne einzige Mail aufbrauchbar |
| N-2 | **neu · Medium · belegt** | `ANNAHME`-Slots (8) gelten für die ganze Anfrage; 4 Adressen sperren das Formular für 55 s je Runde |
| N-3 | neu · Info · belegt | libheif schreibt Fehlerobjekte per `console.log` ins Server-Log |

#### H-1 · teilweise behoben

- **Belegt (Server B):** 70 × `POST /api/contact` ohne Token von `203.0.113.7` → 5 × 403, 65 × 429. Danach eine gültige Anfrage von `198.51.100.99` → **502** (früher 429, `Retry-After: 3526`).
- **Belegt, Slowloris wie im Original (1 Byte alle 2 s, 4 Verbindungen von 2 Adressen):** Eine gleichzeitige gültige Anfrage → **502 nach 15 ms**. Die Slowloris-Verbindungen erhalten **408 nach 10,0 s** (`src/lib/security/body.ts:18-19`, Mindestrate nach Schonfrist).
- Das globale Limit steht jetzt hinter CSRF und ALTCHA (`src/lib/security/kontakt-ablauf.ts:148`). Das entspricht dem Fix-Vorschlag. Es steht aber noch **vor** der Bildprüfung und vor dem Versand, siehe N-1. Die Slot-Logik lässt sich mit regelkonformer Rate weiter belegen, siehe N-2.

#### N-1 · Medium · Globales Budget ohne Mailversand aufbrauchbar (belegt)

- **Ort:** `src/lib/security/kontakt-ablauf.ts:148` (`kontaktGesamt.pruefe` verbraucht das Budget). Bilder werden erst danach geprüft (`:160-171`, `erkenneBildTyp`/`kodiereNeu`), der Versand folgt bei `:182`. Limit 60/h in `src/lib/security/api.ts:53`.
- **Reproduktion (Server B):** 12 Adressen (`192.0.2.120–131`) × 5 Anfragen mit gültigem CSRF, gelöstem ALTCHA und einem „Foto" `kein bild` als `image/jpeg`. Ergebnis: 422 „Foto" für jede Anfrage, **keine Mail**, Dauer **31,7 s**. Danach eine gültige Anfrage eines anderen Clients → **429, `Retry-After: 3321`**. Das Formular ist rund 55 min für alle gesperrt. Im Log stehen nur `foto abgelehnt typ` und `WARNUNG globales limit erreicht`.
- **Wirkung:** Die Annahme im Fix-Bericht („dabei gehen aber 60 echte Mails beim Betreiber ein") stimmt nicht. Die Sperre bleibt still und kostet 60 ALTCHA-Lösungen (rund 1 s je Lösung) sowie 12 Adressen. Mit IPv6 genügt ein /56, weil jedes /64 einen eigenen Bucket bekommt (`src/lib/security/schluessel.ts:25`). Bei 3 Adressen dauert es eine Stunde. CVSS etwa 5.3 (AV:N/AC:L/PR:N/UI:N/A:L).
- **Fix-Vorschlag (backend-api):** Das Budget vor der teuren Arbeit nur **lesen** (z. B. `RateLimiter.reicht()` ohne Zählung). **Verbrauchen** erst unmittelbar vor `d.sende` (`:182`), also nachdem alle Bilder neu kodiert sind, oder erst nach erfolgreichem Versand. Unit-Test: 60 gültige Anfragen mit defektem Foto, danach eine gültige Anfrage → 200 bzw. 502. Optional bei IPv6 zusätzlich ein Bucket je /48 mit höherem Limit.

#### N-2 · Medium · `ANNAHME`-Slots über die ganze Anfrage, Mindestrate erlaubt 55 s Belegung (belegt)

- **Ort:** `src/lib/security/kontakt-ablauf.ts:92` belegt `ANNAHME` (8, `src/lib/security/api.ts:66`). Freigegeben wird erst in `finally` (`:200`), also nach Bildbearbeitung und SMTP, obwohl der Kommentar (`:85`) und `api.ts` „Body lesen" sagen. Die Mindestrate von 16 KB/s (`src/lib/security/body.ts:19`) erlaubt jeder Verbindung bis zu 55 s (`:18`).
- **Reproduktion 1 (Server B, ohne Token):** 4 Adressen × 2 Verbindungen senden je 20 KB/s (`Content-Length: 20000000`). Eine gültige Anfrage einer fünften Adresse → **503 nach 21 ms** (`Retry-After: 60`). Die 8 Verbindungen enden erst nach **55,1 s** mit 408. Bandbreite insgesamt rund 160 KB/s.
- **Reproduktion 2 (mit ALTCHA):** 8 Anfragen (4 Adressen) mit je 5 × HEIC 24 MP, Rauschen, 0,7 MB je Bild. Eine legitime Anfrage **ohne Foto** 1 s später → **503 nach 0,0 s**. Die Anfragen 5–8 erhalten nach 20,3 s ebenfalls 503 (`PARALLEL`-Wartezeit).
- **Wirkung:** Jede Adresse hat 5 Versuche je 15 min. Für eine dauerhafte Sperre braucht es rund 26 Adressen (8 Slots × 900 s / (5 × 55 s)), mit IPv6 ein einziges /56. Für Runden von 55 s genügen 4 Adressen. In Produktion (`TRUST_PROXY=false`) müssen es echte Adressen sein (Nachstellung per XFF auf B). CVSS etwa 5.3 (A:L).
- **Fix-Vorschlag (backend-api):**
  1. `freiAnnahme()` direkt nach `leseBody`/`formDataAus` aufrufen. Der Speicher danach ist durch `PARALLEL` (4 + 8 Wartende) begrenzt.
  2. `ANNAHME` deutlich erhöhen (z. B. 32) und stattdessen ein **globales Byte-Budget** für Bodys im Lesen führen. Ist es voll, wird die langsamste Verbindung abgebrochen statt die neue abgewiesen.
  3. Die Mindestrate nach der Schonfrist erhöhen (z. B. 64 KB/s, das sind 0,5 Mbit/s) oder an `Content-Length` koppeln: Höchstdauer = Länge / Mindestrate.
  4. IPv6-Bucket wie bei N-1.
  - **Nachtest:** Reproduktion 1 und 2 → die legitime Anfrage erhält 502/200.

#### M-1 · behoben (belegt)

- **Code:** `server/proxy.mjs` löscht bei `TRUST_PROXY=false` alle `x-forwarded-*` und `forwarded` und setzt `x-raumstrom-client-ip` immer neu (`server/server.mjs:82`). Astro baut die Request-Header aus `req.headers` (`node_modules/astro/dist/core/app/node.js:304-318`), also wirkt das Löschen. Kein Code unter `src/` nutzt `clientAddress` (grep). Die Routen lesen nur den Server-Header (`src/lib/security/anfrage.ts:19`).
- **Server A (`TRUST_PROXY=false`), je 8 × `POST /api/contact`:**
  - XFF wechselnd mit `Host: raumstrom.de`, `Origin: https://raumstrom.de`, `X-Forwarded-Proto: https` → 5 × 403, 3 × 429.
  - XFF wechselnd, `x-raumstrom-client-ip` wechselnd, `Forwarded: for=` wechselnd, `X-Real-IP` wechselnd, XFF-Kette mit wechselndem letzten Eintrag → jeweils 8 × 429 (gemeinsamer Socket-Bucket).
  - `GET /api/altcha` 40 × mit XFF und `x-raumstrom-client-ip` wechselnd → 30 × 200, 10 × 429. `GET /api/csrf` ebenso → 30/10.
- **Server B (`TRUST_PROXY=true`):** Erster XFF-Eintrag wechselnd, letzter fest → 5 × 403, 3 × 429. Fester XFF und `x-raumstrom-client-ip` wechselnd → 5/3. Zwei XFF-Header → 5/3. Ungültiger letzter Eintrag → Socket-Bucket. Wechselt der **letzte** Eintrag, entsteht je Eintrag ein eigener Bucket. Das ist gewollt (der eigene Proxy hängt an) und nur sicher, wenn der Port ausschließlich über den Proxy erreichbar ist. Hinweis für Phase 6: Container-Port nicht öffentlich binden, wenn `TRUST_PROXY=true`.

#### M-2 · teilweise behoben (belegt)

| Szenario (Server B, frisch gestartet, Basis ~81 MB) | Ergebnis | Dauer | `/healthz` max | VmHWM | RSS danach |
|---|---|---|---|---|---|
| 1 × 5 × `flach-40mp.heic` (8000 × 5000, 24 KB) | 422 „zu hohe Auflösung" | 0,2 s | 28 ms | 127 MB | 116 MB |
| 1 × 1 × 5000 × 5001 (knapp über 25 MP) | 422 „zu hoch" | 0,2 s | 37 ms | 126 MB | 115 MB |
| 1 × 1 × `flach-24mp` (5712 × 4284) | 502 | 1,3 s | 51 ms | 394 MB | 233 MB |
| 1 × 1 × 10-Bit-RGBA 24 MP | 502 | 1,4 s | 27 ms | **511 MB** | 234 MB |
| 1 × 1 × 30 Top-Level-Bilder à 24 MP (174 KB) | 502 | 1,1 s | 14 ms | 394 MB | 233 MB |
| 1 × 5 × `flach-24mp` | 502 | 5,5 s | 39 ms | 672 MB | 397 MB |
| 1 × 5 × `rausch-24mp` (0,7 MB je Bild) | 502 | 12,0 s | 26 ms | 689 MB | 430 MB |
| 4 × 5 × `flach-24mp` | 4 × 502 | 13,9 s | 39 ms | 715 MB | 438 MB |
| 4 × 5 × `rausch-24mp` | 4 × 502 | 37,6 s | 28 ms | 770 MB | 488 MB |
| 8 × 5 × `flach-25mp` (5000²) | 8 × 502 | 28,6 s | 64 ms | **828 MB** | 462 MB |
| 8 × 5 × `rausch-24mp` | 4 × 502, 4 × 503 (20,3 s) | 38,1 s | – | 821 MB | – |
| defektes / abgeschnittenes HEIC | 422 „nicht gelesen" | 0,1–0,2 s | – | – | – |

- **Behoben:**
  - Der Event-Loop bleibt frei: höchstens 64 ms statt 1,6 s.
  - 40-MP-Bomben werden vor dem Puffer abgewiesen.
  - Die Dekodierung läuft seriell. Beleg: 20 Bilder in 37,6 s, das entspricht rund 1,8 s je Bild nacheinander; dazu der Code `HEIC_SLOT = Parallelitaet(1, 4)`, `src/lib/uploads/heic.ts:19`.
  - Die Spitze ist gegenüber 1,78 GB mehr als halbiert, der Restspeicher sinkt von 1,63 GB auf etwa 0,45 GB.
- **Offen (belegt):** Das Ziel „VmHWM < 600 MB" wird verfehlt. Schon **eine** Anfrage mit 5 HEIC erreicht 672–689 MB, die Spitze liegt bei 828 MB. Bei einem Container-Limit von 1 GB bleibt wenig Reserve, sobald gleichzeitig PNG/JPEG mit bis zu 40 MP über sharp laufen (`MAX_PIXEL`, nicht nachgemessen).
- **Ursachen:**
  - **Vermutung, aus Code und Messung abgeleitet:**
    1. `resourceLimits` (`heic.ts:95`) begrenzen nur den V8-Heap des Workers. WASM-Speicher und ArrayBuffer-Backing-Stores zählen nicht dazu. Ein einzelnes 10-Bit-RGBA-Bild hebt den Spitzenwert um rund 430 MB.
    2. `void worker.terminate()` (`heic.ts:102`) wartet nicht. Der Slot wird in `:129` freigegeben, bevor der WASM-Speicher des alten Workers tatsächlich frei ist. Der nächste Worker startet also überlappend.
    3. Nach dem Slot liegen bis zu 4 RGBA-Puffer à ~100 MB gleichzeitig bei sharp (`PARALLEL` 4), weil der HEIC-Slot nur die Dekodierung umfasst, nicht die Neukodierung.
  - **Belegt:** Die Allokator-Fragmentierung lässt RSS dauerhaft bei 400–490 MB.
- **Fix-Vorschlag (backend-api):**
  - `await worker.terminate()` vor `frei()`.
  - Den HEIC-Slot bis nach `toBuffer()` halten, also Dekodieren und Neukodieren zusammen seriell.
  - Optional `MAX_PIXEL_HEIC` auf 24 MP senken (iPhone 24 MP = 24,47 MP passt weiterhin).
  - Für Phase 6: Container-Limit ≥ 1,5 GB, `MALLOC_ARENA_MAX=2` oder jemalloc prüfen, Neustart-Richtlinie.
  - **Nachtest:** Zeilen „1 × 5 × rausch" und „8 × 5 × flach-25mp".

#### L-1 · behoben (belegt, Server A, `curl --path-as-is`)

- `/%2Fkontakt`, `/%2fkontakt`, `/%2F%2Fkontakt`, `/%5Ckontakt`, `/kontakt%2F`, `/kontakt/%2F`, `/%252Fkontakt`, `/%09/kontakt`, `/%E2%80%AE/kontakt`, `/%40evil.example`, `/kontakt;/` → **404 ohne `Location`** (`server/static.mjs:55`).
- `/kontakt` → `308 /kontakt/`. `/kontakt?x=//evil.example` → `308 /kontakt/?x=//evil.example` (relativ, harmlos). `/%2e%2e/kontakt` → `308 /kontakt/` (WHATWG normalisiert). Die Weiterleitung hat immer genau einen führenden `/` und kodierte Segmente (`:75`).
- **I-6 (Info, belegt):** `//kontakt`, `///kontakt`, `/\kontakt` → **200 Startseite**. `new URL('//x', base)` (`server/server.mjs`, `handle`) liest die Request-Target als Authority, der Pfad wird `/`. Es gibt keine Weiterleitung und keine fremde Ressource, also kein Risiko. Optional: `req.url` mit `//` am Anfang auf 404 setzen.

#### L-2 · behoben (belegt, Server A)

- `TRACE`, `PROPFIND`, `MKCOL`, `LOCK`, `SEARCH`, `PURGE`, `QUERY` auf `/api/contact`, `/api/csrf`, `/api/x` → **405 `Allow: GET, HEAD, POST`**. Auf `/kontakt/` → 405 `Allow: GET, HEAD` (`server/server.mjs:52`, `:79`). `TRACK` → 400 (Node). `CONNECT` → Verbindung ohne Antwort beendet (Node).
- `OPTIONS`/`PUT`/`DELETE`/`PATCH`/`HEAD` erreichen die Routen und erhalten dort 405 mit eigenem `Allow`. Das Server-Log von A enthält **0** Zeilen mit `error`/Stack.
- **I-7 (Info):** `HEAD /api/altcha` → 405 `Allow: GET`. Das ist uneinheitlich mit dem Server-`Allow`, aber kein Risiko.
- **Keystatic (Regression):** `/keystatic`, `/api/keystatic/github/login`, `/%6Beystatic`, `/api/%6Beystatic`, `/api//keystatic`, `/api/./keystatic`, `/API/keystatic` → 404. `dist/server` enthält keine Keystatic-Route.

#### L-3 · behoben (belegt am erzeugten Header, nodemailer MailComposer)

- Der Original-Payload ergibt `Reply-To: "Eve Boss ceo firma.de x y.de utf-8?B?QmNjOiB2QHguZGU =" <e@f.de>`, ohne `=?…?=`.
- `==??utf-8?B?QQ==?==?=` → `"= ?utf-8?B?QQ= = ="`. Zero-Width zwischen `=` und `?` → entfernt, kein neues Paar. Bidi-Override (U+202E) → entfernt.
- Umlaute werden von nodemailer selbst kodiert (`=?UTF-8?Q?J=C3=BCrgen…?=`), wie erwartet. `src/lib/mail/kontakt-mails.ts:21-26`.

#### L-4 · behoben (Code, Unit-Test)

- `darfBestaetigen` (`src/lib/security/kontakt-ablauf.ts:206-211`): erst das Limit je Adresse, dann gesamt 20/h (`api.ts:62`). Bestätigt wird nur nach erfolgreichem Versand der Anfrage. Ohne SMTP wurde das nicht dynamisch geprüft. Die Unit-Tests sind grün.

#### Kompression · ohne Befund (belegt, Server A)

- **Pfade:** `/index.html.br`, `.gz`, `/_astro/*.js.br`/`.gz`, `/index.html.BR`, `/index.html.br/`, `/index.html%2ebr`, `/index.html.b%72`, `/index.html.br.`, `/sitemap-index.xml.gz`, `/kontakt/index.html.br` → 404 (`server/static.mjs:66`, Prüfung nach dem Dekodieren).
- **Aushandlung:**
  - `br, gzip` → br; `gzip` → gzip; ohne Header, `identity` oder `br;q=0, gzip;q=0` → unkomprimiert; `*` → br; `*, br;q=0` → gzip.
  - Content-Type kommt immer vom Original. CSP der Seite auch bei br; 404 auch als br mit 404.
  - `Vary: Accept-Encoding` bei 200 und 304 (`:152`). Ein br-ETag liefert bei `If-None-Match` 304, bei `gzip` nicht (eigenes ETag).
  - woff2/png ohne Vary und ohne Kodierung.
- **Integrität:** Alle 124 Varianten in `dist/client` dekomprimieren byte-gleich zum Original, es gibt keine Variante ohne Original.
- **API:** `/api/csrf` und `/api/altcha` mit `Accept-Encoding: br, gzip` → kein `Content-Encoding`. Die Token-Antworten sind damit nicht BREACH-anfällig. Statische Dateien enthalten keine Geheimnisse.
- **Fremd-Fallback:** Nicht-HTML-Antworten behalten `default-src 'none'`.

#### N-3 · Info · libheif-Ausgaben im Server-Log (belegt)

- **Ort:** Im Worker-Code (`src/lib/uploads/heic.ts:36-66`) werden `print`/`printErr` stummgeschaltet, `console.log` aber nicht. Der JS-Wrapper von libheif-js loggt damit selbst.
- **Reproduktion:** Ein abgeschnittenes HEIC erzeugt 5 Zeilen `Decoding image failed heif_image_handle {} { … message: 'Invalid input: … file position 381' }` je Bild.
- **Wirkung:** Keine personenbezogenen Daten, aber Interna und Zeilen, die ein Client auslöst (begrenzt durch ALTCHA und Limits). Das widerspricht der Vorgabe „Log nur Ereignisnamen".
- **Fix:** Am Anfang des Worker-Codes `console.log = console.warn = console.error = () => {};` setzen.

#### Nicht geprüft / Grenzen

- Ohne Mailpit und Docker gab es keinen erfolgreichen Versand. Mail-Inhalt, Anhänge und L-4 dynamisch sowie der volle E2E-Lauf fehlen (CI oder Docker).
- Kein Produktions-Build (`check:launch` offen). Die Produktions-Hosts wurden über `Host`/`Origin` nachgestellt.
- Kein IPv6-Socket-Test (Server nur auf 127.0.0.1). PNG/JPEG-Speicher unter gleichzeitiger HEIC-Last wurde nicht gemessen.
- Ein Neustart von Server B schlug im Messlauf einmal ohne Logzeile fehl, das ließ sich in 8 Wiederholungen nicht reproduzieren. Ich werte das als Effekt des Test-Harness (Neustart nach 1 s), nicht als Befund.

#### Rückgabe

- **backend-api:** N-1 (Budget erst vor `sende` verbrauchen), N-2 (`ANNAHME` nach dem Lesen freigeben, Byte-Budget bzw. Mindestrate), M-2-Rest (`await terminate`, Slot bis nach sharp), N-3.
- **architect (Phase 6):** Container-Speicher und Allokator (M-2), Port nicht öffentlich bei `TRUST_PROXY=true` (M-1), optional I-6.
- Nach den Fixes prüft der security-auditor N-1, N-2 und M-2 mit den obigen Reproduktionen erneut.
