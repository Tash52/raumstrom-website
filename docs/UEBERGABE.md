# Übergabe an die nächste Session

Stand: 21.11.2026. Phase 0–5 abgeschlossen (`docs/agent-reports/5-zusammenfassung.md`). **Nächste Phase: 6 (Planer-Export und Versand, `planner-export` ∥ `backend-api`).** Nach Abschluss von Phase 6 diese Datei neu schreiben.

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

- Am 5-Stunden-Nutzungslimit brechen Agenten ab; nach dem Reset per SendMessage fortsetzen (Worktree bleibt erhalten). Vorher committete Worktree-Stände als Sicherung pushen (`git push origin <worktree-branch>:wip/…`). Worktrees erst nach dem Merge entfernen, sonst lässt sich der Agent nicht fortsetzen.
- Vorab-Kleinaufträge, die das Datenmodell bzw. eine Schnittstelle festlegen, vor dem parallelen Bauen erledigen (in Phase 5 bewährt).
- Löschen von Remote-Branches klappt aus dem Container nicht (Push meldet „Everything up-to-date"); Sicherungs-Branches dem Betreiber zum Löschen nennen.

## Phase 6: Schritte (Briefing 7.4, `.claude/agents/planner-export.md`, `.claude/agents/backend-api.md`)
1. **planner-export ∥ backend-api** (je eigener Worktree):
   - planner-export: GLB-Export (meshopt, Materialien als IDs), 4 Renderbilder, PDF-Zusammenfassung (Raumliste mit Flächen, `raumMaterialien`/`beschreibeRef`, `elektroStueckliste` je Raum, Grundriss mit Elektro-Symbolen, Kundennachricht), versioniertes Projekt-JSON (v2, Import mit Migration), Zusammenfassung vor dem Absenden, Planer-Formular (Felder laut 7.4), interner Viewer `/planer/ansehen` (noindex, lokal), Entwurf speichern nur auf Klick (localStorage, löschen, Export/Import als Datei).
   - backend-api: `/api/planner/submit` (CSRF/Origin, ALTCHA, Rate-Limit, zod, gesamt ≤ 25 MB, Signaturprüfung, sharp-Neukodierung, GLB/JSON strukturell prüfen, Mail mit Anhängen, Eingangsbestätigung nur mit PDF, temporäre Dateien sofort löschen), Modus B Mistral (EU-Endpunkt) hinter `FLOORPLAN_AI=false`, Dockerfile. Dazu aus früheren Phasen: Fotos im Browser auf 2560 px verkleinern + Upload-Fortschritt, Byte-Budget pro Client (N-4), ALTCHA-Widget erst bei Fokus laden.
   - **Vertrag zuerst festlegen:** Feldnamen und Dateiteile von `/api/planner/submit` als Schnittstellen-Datei (analog `kontakt-schnittstelle.ts`), bevor beide parallel bauen. Am einfachsten: backend-api legt sie in einem kurzen Vorab-Schritt an.
   - architect (klein, parallel möglich): `MALLOC_ARENA_MAX=2`, Container-Limit ≥ 1 GB, Socket nach frühem 408 schneller schließen, SPF/DKIM/DMARC im Launch-Check; CLAUDE.md um Planer-Versand ergänzen.
2. **Prüfen:** wie bisher (`npm ci`, `npm test`, `npm run check`, `npm run build:staging`, `licenses -- --check`, `trend-schema -- --check`, `platzhalter`, `scan:wording`). Neue Abhängigkeiten (z. B. PDF-Erzeugung, meshopt-Encoder) nur MIT/Apache/BSD/ISC, sonst anhalten und fragen.
3. **Abnahme:** security-auditor (API, Uploads, Docker) und qa-verifier (kompletter Planer-Flow inkl. Mail-E2E; hier nur mit Stub, CI deckt echtes Mailpit ab). Orchestrator baut einmal `build:staging`, getrennte Ports.
4. Fixes über die bauenden Agenten, Nachprüfung, `6-zusammenfassung.md`, Push, neue Übergabe, **neue Session für Phase 7**.

## Offen aus Phase 5
- Maßlabels überdecken sich bei 390 px untereinander; Pipette meldet bei Bodenfliesen „halbhoch" (planner-design, niedrig). Gut mit planner-export zu bündeln, falls planner-design ohnehin gebraucht wird.
- Hero nutzt noch die alte Kern-Schwelle ≤ 4 für reduzierte Qualität, Planer nutzt jetzt `src/islands/planner/leistung.ts` (motion-3d, niedrig).
- Farbe `#8c5c00` (senkrechte Installationszonen) als Token übernehmen oder ersetzen (design-system).
- Raum-Knöpfe in der Seitenleiste unter 44 px; optionale Prop `erweiterung` in `Editor2D.tsx` gegenlesen (planner-geometry).
- Elektro-Vorschlag eines Stilpakets setzt keine Punkte automatisch; Möbel in 3D nicht ziehbar; keine Deckenzonen (planner-design, bei Bedarf).
- 60 fps des Planers auf echter GPU messen (Betreiber, zusammen mit Phase 3).
- Remote-Branches `wip/phase4-planner` und `wip/phase5-planner-design` können gelöscht werden (Inhalt in `main`).

## Offen aus Phase 4
- Startseite LCP Lab ~2030 ms (knapp über 2,0 s): GSAP für die Journey später laden (motion-3d), Mono-Labels über dem Falz (page-builder). Niedrig.
- Nicht rechtwinklige Wandecken in 3D ohne Gehrung (planner-geometry, bei Bedarf).
- WASM-Decoder (JPX/JBIG2) im pdf.js-Worker nicht mit echtem PDF belegt; Test-PDF mit JPX-Bild nachreichen (planner-geometry).
- Texte zu `/raumplaner/` und Start nach Phase 6 wieder erweitern (content-writer): Gestaltung und Versand sind jetzt bzw. nach Phase 6 vorhanden.

## Offen aus Phase 3 (Rest)
- 60 fps, LCP und INP auf echtem Gerät mit GPU nicht gemessen (Betreiber).
- „Raumplaner öffnen" (`src/pages/index.astro:47/:90`, `CtaBand.astro:23`): Texte in Phase 4 entschärft, in Phase 6 erneut prüfen.
- `THREE.Clock`-Deprecation-Warnung aus R3F beobachten (motion-3d).
- Texte von Slider und Journey stehen in den Komponenten, nicht im CMS. Falls über Keystatic pflegbar gewünscht: Schemafelder (architect) und Umzug (motion-3d). Nicht entschieden, bei Bedarf Betreiber fragen.
- `WandSchnitt.astro` wird nicht mehr verwendet und kann entfernt werden (page-builder, nebenbei).
- Schritt 3 von „So läuft's ab" zeigt `[[PLATZHALTER: Frist …]]` (Betreiber).

## Bereits entschieden (nicht erneut fragen)
- **Lizenzen:** lightningcss und y-provider freigegeben, GSAP freigegeben, libheif/heic-to und sharp (LGPL) freigegeben. picomatch ist Audit-Ausnahme bis 31.12.2026.
- **Partner-Hinweis:** Plural bei mehreren Partner-Gewerken.
- **Pflicht-Häkchen im Formular:** bedeutet Kenntnisnahme (Art. 6 Abs. 1 lit. b/f), keine Einwilligung.
- **Keystatic:** Rechtstexte bleiben drin, Inhalte ohne GFM-Tabellen.
- **Layout:** Header und Footer gehören design-system, page-builder darf sie erweitern.
- **Upload-Mindestrate:** 64 KB/s nach 5 s bleibt (Empfehlung security-auditor).
- **3D-Hero:** Software-Renderer bekommen das Poster, der Start erfolgt erst nach Interaktion bzw. 2 s nach `load`.
- **CSS bis 20 KB inline** mit CSP-Hash (kein `'unsafe-inline'`).
- **Texturen WebP statt KTX2** (Basis-Transcoder bräuchte `'unsafe-eval'`). Projektmodell v2 ist Vertrag für Phase 6.
- **Trend-Pakete** nutzen feste Begriffe (`docs/TREND-UPDATE.md`); monatliche Routine nur als PR.

## Offen beim Betreiber (gesammelt, Klärung am Ende von Phase 9; die Arbeit läuft mit Platzhaltern weiter)
- **Sanitär/Heizung und Parkett:** als Partner-Gewerk aufnehmen oder weglassen?
- **Rechtliches** (`docs/agent-reports/2-legal-compliance.md`): Vertragsmodell (Generalunternehmer oder Direktvertrag), HWK-Abgrenzung und § 7 Abs. 2 HwO, Eintragung und Meister je Partnerbetrieb, eGbR/Register, Kleinunternehmerregelung, Beschäftigtenzahl, Hoster/SMTP/Mistral samt Auftragsverarbeitungsverträgen.
- **Echte Logo-Datei** und **Kontakt in `security.txt`**.
- **Angebotsfrist** für „So läuft's ab".
- **Deployment** (`docs/DEPLOYMENT.md`): Reverse-Proxy setzt Host und `X-Forwarded-Proto: https`, hinter TLS-Proxy `TRUST_PROXY=true`. Rate-Limit und Replay-Schutz wirken nur bei einer Instanz.

## Weiter verschoben
- SEO-Skills aus claude-seo: zu Beginn von Phase 7, siehe `CLAUDE.md`.
- Dependabot-Branch `origin/dependabot/npm_and_yarn/test-tools-…`: prüfen und als PR-Lauf behandeln, nicht blind mergen.
