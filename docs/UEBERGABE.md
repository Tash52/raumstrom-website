# Übergabe an die nächste Session

Stand: 20.11.2026. Phase 0–2 abgeschlossen (`docs/agent-reports/2-zusammenfassung.md`). **Phase 3 ist gebaut, aber noch nicht gemergt und nicht abgenommen.** Nach Abschluss von Phase 3 diese Datei löschen.

## Arbeitsweise (vom Betreiber festgelegt)
- Der Orchestrator delegiert an `.claude/agents/`, wer baut, prüft nicht. Höchstens 2–3 bauende Agenten laufen parallel, dann mit `isolation: worktree`.
- Nach jeder Phase: Build und Tests grün, unabhängige Abnahme, Commit und Push auf `main`, Zusammenfassung `docs/agent-reports/<phase>-zusammenfassung.md`. Danach **ohne Warten** weiter.
- Nur anhalten bei Kosten, externen Konten, neuen Skills/Plugins, rechtlich offenen Entscheidungen oder echten Blockern.
- Agenten melden ≤ 15 Zeilen, Details in `docs/agent-reports/`. Am Nutzungslimit per SendMessage fortsetzen. **Halbfertiges pushen** (der Container ist flüchtig).
- Token sparen: Der Betreiber wünscht pro Phase eine eigene Session. Vor dem Sessionwechsel diese Datei neu schreiben.
- Im Container fehlen Docker und Mailpit. E2E laufen mit `E2E_MAILPIT=extern` ohne Mail-Tests, die Mail-Tests deckt nur die CI ab.

## Phase 3: nächste Schritte
1. **Mergen:** `git fetch origin phase-3-motion && git merge origin/phase-3-motion` auf `main`. Der Branch enthält:
   - motion-3d: 3D-Hero, Säulen-Journey, 3-Zustands-Slider, Leitungs- und Prozess-Leitung, Tilt, Cursor, magnetische Buttons, View Transitions, Pause-Schalter und alle Fallbacks.
   - content-writer und page-builder: Startseiten-Abschnitt „So läuft's ab" (`start.md` id `ablauf`, Parser `src/components/sections/ablauf.ts`).
   - Neue Abhängigkeiten: three 0.187.0, @react-three/fiber 9.8.2, gsap 3.15.1.
   - Berichte: `3-motion-3d.md`, `3-content-writer.md`, `3-page-builder.md`.
2. **Prüfen:** `npm ci`, `npm test`, `npm run check`, `npm run build:staging`, `npm run licenses -- --check`, `npm run platzhalter`. Wenn `PLATZHALTER.md` sich ändert, die Datei mitcommitten.
3. **Abnahme parallel:**
   - **a11y-perf-tester:** axe, Lighthouse Mobil, LCP < 2,0 s, CLS < 0,05, INP < 200 ms, JS-Budget, 3D im eigenen Chunk, Reduced Motion, No-WebGL, Tastatur, 0 Fremd-Requests. Eine lange Task von ca. 300 ms beim 3D-Start ist bekannt und zu bewerten.
   - **qa-verifier:** Definition of Done Phase 3, „Website ohne Planer startfähig", Screenshots Desktop und Mobil. Dazu der flakige E2E-Lauf: Einmal war der Testserver nicht erreichbar, außerdem `design-system.spec.ts:108/:130`.
4. Fixes an die bauenden Agenten, Nachprüfung, `3-zusammenfassung.md`, Push. Dann Phase 4 (`planner-geometry`), am besten wieder in einer neuen Session.

## Offen aus Phase 3 (beim Merge beachten)
- Texte von Slider und Journey stehen in den Komponenten, nicht im CMS. Falls sie über Keystatic pflegbar sein sollen: Schemafelder (architect) und Umzug (motion-3d). Bisher nicht entschieden, bei Bedarf den Betreiber fragen.
- `WandSchnitt.astro` wird nicht mehr verwendet und kann entfernt werden (page-builder).
- Die 60 fps auf echter GPU sind nicht gemessen (hier gibt es keine GPU).
- Schritt 3 von „So läuft's ab" zeigt `[[PLATZHALTER: Frist …]]`. Die Frist muss der Betreiber angeben.

## Offen aus Phase 2 (später)
- Phase 6 (architect): `MALLOC_ARENA_MAX=2`, Container-Limit ≥ 1 GB, Socket nach frühem 408 schneller schließen, SPF/DKIM/DMARC im Launch-Check.
- Phase 6 (backend-api): Fotos im Browser auf 2560 px verkleinern und den Upload-Fortschritt anzeigen (schwaches Mobilnetz). N-4: Byte-Budget pro Client.

## Bereits entschieden (nicht erneut fragen)
- **Lizenzen:** lightningcss und y-provider freigegeben, GSAP freigegeben. picomatch ist Audit-Ausnahme bis 31.12.2026.
- **Partner-Hinweis:** Plural bei mehreren Partner-Gewerken.
- **Pflicht-Häkchen im Formular:** bedeutet Kenntnisnahme (Art. 6 Abs. 1 lit. b/f), keine Einwilligung.
- **Keystatic:** Rechtstexte bleiben drin, Inhalte ohne GFM-Tabellen.
- **Layout:** Header und Footer gehören design-system, page-builder darf sie erweitern.
- **Upload-Mindestrate:** 64 KB/s nach 5 s bleibt (Empfehlung security-auditor).

## Offen beim Betreiber (die Arbeit läuft mit Platzhaltern weiter)
- **Sanitär/Heizung und Parkett:** Sanitär/Heizung bei Bad & Fliesen und Parkett bei Boden als Partner-Gewerk aufnehmen oder weglassen?
- **Rechtliches** (`docs/agent-reports/2-legal-compliance.md`):
  - Vertragsmodell: Generalunternehmer oder Direktvertrag.
  - HWK-Abgrenzung und § 7 Abs. 2 HwO.
  - Eintragung und Meister je Partnerbetrieb.
  - eGbR/Register, Kleinunternehmerregelung, Beschäftigtenzahl.
  - Hoster, SMTP und Mistral samt Auftragsverarbeitungsverträgen.
- **Echte Logo-Datei** und **Kontakt in `security.txt`**.
- **Angebotsfrist** für „So läuft's ab".
- **Deployment** (`docs/DEPLOYMENT.md`): Der Reverse-Proxy setzt Host und `X-Forwarded-Proto: https`, hinter einem TLS-Proxy gilt `TRUST_PROXY=true`. Rate-Limit und Replay-Schutz wirken nur bei einer Instanz.

## Weiter verschoben
- SEO-Skills aus claude-seo: zu Beginn von Phase 7, siehe `CLAUDE.md`.
- Dependabot-Branch `origin/dependabot/npm_and_yarn/test-tools-…`: prüfen und als PR-Lauf behandeln, nicht blind mergen.
