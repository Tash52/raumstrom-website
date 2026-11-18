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
