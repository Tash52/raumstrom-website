# Phase 2 · architect · Server-Fixes (Security-Report M-1 Server-Teil, L-1, L-2, Kompression)

## Geändert
- `server/proxy.mjs` (neu): `prepareProxyHeaders(req, { trustProxy })`, `clientIp`, `normalizeIp`, `CLIENT_IP_HEADER = 'x-raumstrom-client-ip'`.
  - Der Server löscht immer einen vom Client mitgeschickten `x-raumstrom-client-ip` und setzt ihn neu: Socket-Adresse, bei `TRUST_PROXY=true` der letzte gültige `X-Forwarded-For`-Eintrag (sonst Socket). IPv4-mapped (`::ffff:a.b.c.d`) wird zu IPv4, damit IPv4-Clients bei Dual-Stack nicht alle im selben /64 landen.
  - Bei `TRUST_PROXY=false` entfernt er alle `x-forwarded-*` und `forwarded`, bevor Astro den Request baut. Damit fällt auch Astros `clientAddress` auf die Socket-Adresse zurück, und Protokoll und Host kommen nicht mehr aus Client-Headern.
- `server/server.mjs`: `/api/*` nur mit GET, HEAD, POST, PUT, PATCH, DELETE und OPTIONS an Astro. Die Routen antworten selbst mit 405 und eigenem `Allow`. Alle anderen Methoden (TRACE, PROPFIND …) erhalten 405 mit `Allow: GET, HEAD, POST`, ohne Stacktrace im Log (L-2). Danach folgt `prepareProxyHeaders`.
- `server/static.mjs`:
  - L-1: Ein Pfad mit `%2F`/`%5C` ergibt 404. Die Weiterleitung entsteht aus den Segmenten (`encodeURIComponent`) mit genau einem führenden `/`.
  - `.br`/`.gz` sind nicht direkt abrufbar (404).
  - Kompression: `acceptedEncodings` beachtet `q=0` und `*`. Bevorzugt wird br, dann gzip. Eine Variante wird nur genutzt, wenn sie nicht älter als das Original ist. Content-Type kommt vom Original. Das ETag trägt ein Suffix `-br`/`-gzip`. `Vary: Accept-Encoding` gilt für alle komprimierbaren Typen, auch bei 304. `If-None-Match` akzeptiert Listen.
- `scripts/lib/precompress.mjs` (neu) und die Integration `raumstrom:precompress` in `astro.config.mjs`:
  - Die Integration steht als letzte, damit Sitemap und Staging-Bereinigung vorher laufen.
  - Behandelt werden html/css/js/mjs/json/svg/xml/txt ab 512 B, Brotli q11 und gzip 9. Eine Variante wird nur geschrieben, wenn sie kleiner ist. Alte Varianten werden vorher entfernt.
  - Benutzt nur `node:zlib`. Staging-Build: 124 Dateien aus 62 Quellen, 1630 KB → br 303 KB.
- `CLAUDE.md` (66 Zeilen): Schnittstellen um Client-IP-Header, Methoden und Kompression ergänzt.
- `tests/unit/server-http.test.ts` (neu, 30 Tests):
  - Unit-Tests für proxy, L-1, Accept-Encoding und Vorkomprimierung.
  - Integration gegen `server/server.mjs` mit Fake-dist, in dem ein Echo-Handler statt Astro läuft. Zwei Server: `TRUST_PROXY` false und true.

## Geprüft
- `npm test`: 14 Dateien, 260 Tests, Hook-Test 7/7. `npm run check`: 0 Fehler. `npm run build:staging`: ok.
- `npm start` (Staging-dist, `TRUST_PROXY=false`) mit curl:
  - `/%2Fkontakt` → 404 ohne Location; `/kontakt` → 308 `/kontakt/`.
  - `TRACE /api/contact` → 405 mit `Allow: GET, HEAD, POST`, kein Stack im Log.
  - `/` mit `br, gzip` → `Content-Encoding: br`, `text/html`, `Vary`, ETag `…-br`. Die Sitemap kommt als gzip, `_astro/*.js` als br. `/index.html.br` → 404.
  - `/api/csrf` ohne Content-Encoding.
  - M-1-Repro: `GET /api/altcha` 40 × mit wechselndem XFF, `Host: raumstrom.de` und `X-Forwarded-Proto: https` → 30 × 200, dann 429.

## Offen / Hinweise
- backend-api: Routen sollen die Adresse nur aus `x-raumstrom-client-ip` lesen. In `astro dev` fehlt der Header, dort gilt der Fallback `clientAddress`. Bei `TRUST_PROXY=true` liefert Astros `clientAddress` weiterhin den ersten (vom Client gesetzten) XFF-Eintrag und darf deshalb nicht verwendet werden.
- Bei `TRUST_PROXY=false` hinter einem TLS-Proxy fehlt jetzt `X-Forwarded-Proto`. Dann ist `TRUST_PROXY=true` zu setzen, wie in `.env.example` beschrieben.
- CONNECT erreicht den Request-Handler nicht (Node beendet die Verbindung). TRACK und andere unbekannte Tokens lehnt Node mit 400 ab.
- security-auditor: L-1, L-2 und M-1 bitte erneut prüfen. E2E läuft mit `TRUST_PROXY=true`, die eigenen XFF-Adressen der Tests bleiben wirksam.
