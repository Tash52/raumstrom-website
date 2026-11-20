# Übergabe an die nächste Session

Stand: 20.11.2026. Phase 0–4 abgeschlossen (`docs/agent-reports/4-zusammenfassung.md`). **Nächste Phase: 5 (Planer Teil 2, `planner-design` ∥ `trend-researcher`).** Nach Abschluss von Phase 5 diese Datei neu schreiben.

## Arbeitsweise (vom Betreiber festgelegt)
- Der Orchestrator delegiert an `.claude/agents/`, wer baut, prüft nicht. Höchstens 2–3 bauende Agenten laufen parallel, dann mit `isolation: worktree`. Worktree-Branches nach dem Merge entfernen.
- Nach jeder Phase: Build und Tests grün, unabhängige Abnahme, Fixes durch die bauenden Agenten, Nachprüfung, Commit und Push auf `main`, Zusammenfassung `docs/agent-reports/<phase>-zusammenfassung.md`.
- **Jede neue Phase läuft in einer eigenen, neuen Session** (Wunsch des Betreibers, spart Tokens). Am Ende einer Phase: diese Datei neu schreiben, pushen, dann mit `create_session` (claude-code-remote) eine neue Session für die nächste Phase eröffnen, mit dem Auftrag „Übergabe lesen, Phase N zu Ende führen, neue Übergabe, neue Session für Phase N+1", und die eigene Arbeit anhalten.
- **Offene Fragen an den Betreiber werden gesammelt und erst am Ende der letzten Phase (9) geklärt**, außer sie blockieren den laufenden Prozess (Wunsch des Betreibers vom 20.11.2026). Neue Fragen unten unter „Offen beim Betreiber" ergänzen statt zu fragen.
- Nur anhalten bei Kosten, externen Konten, neuen Skills/Plugins, nicht freigegebenen Lizenzen oder echten Blockern.
- Agenten melden ≤ 15 Zeilen, Details in `docs/agent-reports/`. Am Nutzungslimit per SendMessage fortsetzen. **Halbfertiges pushen** (der Container ist flüchtig).
- Im Container fehlen Docker und Mailpit. E2E laufen mit `E2E_MAILPIT=extern`. Für E2E einen kleinen Mailpit-Stub auf 127.0.0.1:8025 starten, der `/api/v1/info` und `messages_count` beantwortet (sonst wird ein fünfter Kontakt-Test rot). Die 4 Mail-Tests (`kontakt-api.spec.ts:96/:206`) schlagen hier fehl, die CI deckt sie ab.
- E2E-Läufe sind isoliert (freier Port, eigene dist-Kopie). Trotzdem nicht bauen, während ein Prüf-Agent `dist/` misst. Wer `dist` kopiert, nutzt `cp -a` (sonst fehlen die vorkomprimierten Dateien).
- Prüf-Agenten parallel nur mit getrennten Ports. Bisher bewährt: Orchestrator baut einmal `build:staging`, Prüfer bauen nicht neu.

- Am 5-Stunden-Nutzungslimit brechen Agenten ab; nach dem Reset per SendMessage fortsetzen (Worktree bleibt erhalten). Vorher committete Worktree-Stände als Sicherung pushen.
- Löschen von Remote-Branches klappt aus dem Container nicht (Push meldet „Everything up-to-date"); Sicherungs-Branches dem Betreiber zum Löschen nennen.

## Phase 5: Schritte
1. **Vorab klein (planner-geometry, eigener Worktree, parallel zu Schritt 2 möglich):** gewählten Raum im Plan selbst kennzeichnen (Kontrast ≥ 3:1, `src/islands/planner/planer.css:484`) und Kurzanleitung bei 390 px nicht über Zoomknopf/Status legen (`Planer.tsx:167`, `planer.css:669`). Siehe `4-qa-nachpruefung.md`.
2. **planner-design** (Briefing 7.2 und 7.3, `.claude/agents/planner-design.md`): Werkzeugleiste mit allen Gestaltungsmodi, Elektro mit Installationszonen nach DIN 18015-3 und Stückliste, Materialien/Texturen (CC0, KTX2, selbst gehostet, Herkunft je Textur), Stilpakete anwenden, Ansichten, Undo/Redo. Am Projektmodell nur über die in `CLAUDE.md` dokumentierten Aktionen; Modelländerungen (neue Felder für Elektro/Material) mit planner-geometry abstimmen, Vertrag erhöht `version` mit Migration, architect trägt in `CLAUDE.md` nach. Mobil reduzierte Qualität. Wording: „Ansicht" statt Kamera, Klingel nur Audio, keine geschützten Farbsystem-/Markennamen, Einrichtung „nur Visualisierung".
3. **trend-researcher** (parallel, Briefing 7.3): 8 Stilpakete als `src/content/trends/*.json`, gültig gegen `_schema.json` (`npm run trend-schema -- --check`). Hier direkt auf `main` (Phasenarbeit); nur die spätere monatliche Routine läuft als PR.
4. **Prüfen:** `npm ci`, `npm test`, `npm run check`, `npm run build:staging`, `npm run licenses -- --check`, `npm run trend-schema -- --check`, `npm run platzhalter`, `npm run scan:wording`.
5. **Abnahme:** a11y-perf-tester (Planer-Chunk-Größe und Nachladen der Texturen, Tastatur in allen Modi, Kontraste, Mobil-Qualität, 0 Fremd-Requests) und qa-verifier (DoD Phase 5: gestaltbarer Planer, 8 Stilpakete, Screenshots Desktop/Mobil). Orchestrator baut einmal `build:staging`, Prüfer bauen nicht, getrennte Ports (4500–4599 / 4600–4699).
6. Fixes über die bauenden Agenten, Nachprüfung, `5-zusammenfassung.md`, Push, neue Übergabe, **neue Session für Phase 6** eröffnen.

## Offen aus Phase 4
- Startseite LCP Lab 2027 ms (knapp über 2,0 s): GSAP für die Journey später laden (motion-3d, Pin-Verhalten bei Ankersprung beachten), Mono-Labels über dem Falz (page-builder). Niedrig.
- ALTCHA-Widget auf `/kontakt/` erst bei Fokus laden (backend-api, optional, Ziel erreicht). Gut mit Phase 6 (backend-api) zu bündeln.
- Nicht rechtwinklige Wandecken in 3D ohne Gehrung (planner-geometry, bei Bedarf).
- WASM-Decoder (JPX/JBIG2) im pdf.js-Worker nicht mit echtem PDF belegt; Test-PDF mit JPX-Bild nachreichen (planner-geometry).
- Remote-Branch `wip/phase4-planner` kann gelöscht werden (Inhalt in `main`).
- Texte zu `/raumplaner/` und Start nach Phase 5/6 wieder erweitern (content-writer).

## Offen aus Phase 3 (Rest)
- 60 fps, LCP und INP auf echtem Gerät mit GPU nicht gemessen (Betreiber).
- „Raumplaner öffnen" (`src/pages/index.astro:47/:90`, `CtaBand.astro:23`): Texte in Phase 4 entschärft, in Phase 6 erneut prüfen.
- `THREE.Clock`-Deprecation-Warnung aus R3F beobachten (motion-3d).
- Texte von Slider und Journey stehen in den Komponenten, nicht im CMS. Falls über Keystatic pflegbar gewünscht: Schemafelder (architect) und Umzug (motion-3d). Nicht entschieden, bei Bedarf Betreiber fragen.
- `WandSchnitt.astro` wird nicht mehr verwendet und kann entfernt werden (page-builder, nebenbei).
- Schritt 3 von „So läuft's ab" zeigt `[[PLATZHALTER: Frist …]]` (Betreiber).

## Offen aus Phase 2 (später)
- Phase 6 (architect): `MALLOC_ARENA_MAX=2`, Container-Limit ≥ 1 GB, Socket nach frühem 408 schneller schließen, SPF/DKIM/DMARC im Launch-Check.
- Phase 6 (backend-api): Fotos im Browser auf 2560 px verkleinern und den Upload-Fortschritt anzeigen (schwaches Mobilnetz). N-4: Byte-Budget pro Client.

## Bereits entschieden (nicht erneut fragen)
- **Lizenzen:** lightningcss und y-provider freigegeben, GSAP freigegeben, libheif/heic-to und sharp (LGPL) freigegeben. picomatch ist Audit-Ausnahme bis 31.12.2026.
- **Partner-Hinweis:** Plural bei mehreren Partner-Gewerken.
- **Pflicht-Häkchen im Formular:** bedeutet Kenntnisnahme (Art. 6 Abs. 1 lit. b/f), keine Einwilligung.
- **Keystatic:** Rechtstexte bleiben drin, Inhalte ohne GFM-Tabellen.
- **Layout:** Header und Footer gehören design-system, page-builder darf sie erweitern.
- **Upload-Mindestrate:** 64 KB/s nach 5 s bleibt (Empfehlung security-auditor).
- **3D-Hero:** Software-Renderer bekommen das Poster, der Start erfolgt erst nach Interaktion bzw. 2 s nach `load`.
- **CSS bis 20 KB inline** mit CSP-Hash (kein `'unsafe-inline'`).

## Offen beim Betreiber (gesammelt, Klärung am Ende von Phase 9; die Arbeit läuft mit Platzhaltern weiter)
- **Sanitär/Heizung und Parkett:** als Partner-Gewerk aufnehmen oder weglassen?
- **Rechtliches** (`docs/agent-reports/2-legal-compliance.md`): Vertragsmodell (Generalunternehmer oder Direktvertrag), HWK-Abgrenzung und § 7 Abs. 2 HwO, Eintragung und Meister je Partnerbetrieb, eGbR/Register, Kleinunternehmerregelung, Beschäftigtenzahl, Hoster/SMTP/Mistral samt Auftragsverarbeitungsverträgen.
- **Echte Logo-Datei** und **Kontakt in `security.txt`**.
- **Angebotsfrist** für „So läuft's ab".
- **Deployment** (`docs/DEPLOYMENT.md`): Reverse-Proxy setzt Host und `X-Forwarded-Proto: https`, hinter TLS-Proxy `TRUST_PROXY=true`. Rate-Limit und Replay-Schutz wirken nur bei einer Instanz.

## Weiter verschoben
- SEO-Skills aus claude-seo: zu Beginn von Phase 7, siehe `CLAUDE.md`.
- Dependabot-Branch `origin/dependabot/npm_and_yarn/test-tools-…`: prüfen und als PR-Lauf behandeln, nicht blind mergen.
