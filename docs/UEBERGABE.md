# Übergabe an die nächste Session

Stand: 19.11.2026, `main` @ 40b5423. Phase 0 und 1 abgeschlossen. Phase 2 gebaut und dreifach geprüft, **Fixes aus den Abnahmen offen**. Nach Abschluss von Phase 2 diese Datei löschen.

## Arbeitsweise (vom Betreiber festgelegt)
- Orchestrator delegiert an `.claude/agents/`, wer baut, prüft nicht; max. 2–3 bauende Agenten parallel (dann `isolation: worktree`).
- Nach jeder Phase: Build und Tests grün, unabhängige Abnahme, Commit und Push auf `main`, Zusammenfassung `docs/agent-reports/<phase>-zusammenfassung.md`, dann **ohne Warten** weiter.
- Nur anhalten bei Kosten, externen Konten, neuen Skills/Plugins, rechtlich offenen Entscheidungen, echten Blockern.
- Agenten melden ≤ 15 Zeilen, Details in `docs/agent-reports/`. Bei Nutzungslimit: per SendMessage fortsetzen. **Halbfertiges vor Sessionende pushen** (Container ist flüchtig, Worktrees gehen verloren).

## Phase 2: offene Fixes (Befunde in den Berichten)
Bisher erledigt sind Texte, Rechtstexte, alle Seiten, Kontakt-API, Datenschutz-Abgleich, Gewerke-Zuordnung und der kaputte Link.
1. **backend-api** (`src/lib/{security,uploads,mail}/`, `src/pages/api/`, `src/components/forms/*.ts|css`), Quelle `docs/SECURITY-REPORT.md` Abschnitt Phase 2:
   - **H-1:** Das globale Limit zählt auch abgewiesene Anfragen. Außerdem werden Parallel-Slots vor dem Lesen des Body vergeben, ohne Lese-Timeout.
   - **M-1, Route-Teil:** `clientAddress` nur aus dem Header `x-raumstrom-client-ip`, den der Server setzt.
   - **M-2:** HEIC: niedrigeres Pixellimit, höchstens eine HEIC-Dekodierung gleichzeitig, möglichst in einem Worker mit Speichergrenze.
   - **L-3:** `=?…?=` und Steuerzeichen im Anzeigenamen neutralisieren.
   - **L-4:** Limit der Eingangsbestätigungen bewerten.
   - **QA B1:** `.altcha{display:none}` versteckt das Widget und den noscript-Hinweis. Sichtbar und barrierefrei machen, E2E-Test auf Sichtbarkeit.
   - **A11y 1:** `labelText()` in `kontakt-formular.ts:51` nimmt nur den ersten Textknoten.
   - **A11y 2:** Nach Fehlern Fokus auf das erste Fehlerfeld.
2. **architect** (`server/*`, `astro.config.mjs`, `scripts/`):
   - **M-1, Server-Teil:** Bei `TRUST_PROXY=false` alle `X-Forwarded-*`/`Forwarded`-Header vor Astro entfernen. Immer `x-raumstrom-client-ip` setzen und Client-Werte davon entfernen. In `CLAUDE.md` eintragen.
   - **L-1:** `/%2Fkontakt` leitet auf `//kontakt/` um (`server/static.mjs:70`).
   - **L-2:** TRACE auf `/api/*` ergibt 500 statt 405.
   - **Kompression:** Vorab erzeugte `.br`/`.gz` für statische Texte ausliefern, mit `Vary`; API-Antworten nicht komprimieren.
3. **page-builder:**
   - **QA B2:** `/partner/` nirgends verlinkt (`navigation.ts`, `Footer.astro`).
   - Doppelte Nummerierung in `AblaufListe.astro:21`.
   - Brotkrumen-Einzug in `Breadcrumbs.astro:22`.
   - E2E-Test: jede indexierbare Seite intern verlinkt.
4. Danach **security-auditor**: Nachprüfung H-1/M-1/M-2 (und Lows). **qa-verifier**: Kurz-Nachprüfung der QA-/A11y-Befunde. Dann `2-zusammenfassung.md`, diese Datei löschen, Phase 3 (`motion-3d`, Briefing im Plan Abschnitt 3 und Briefing Abschnitt 5) starten.

## Bereits entschieden (nicht erneut fragen)
- **Lizenzen:** lightningcss und y-provider vom Betreiber freigegeben. picomatch als Audit-Ausnahme bis 31.12.2026.
- **Partner-Hinweis:** Plural bei mehreren Partner-Gewerken.
- **Pflicht-Häkchen im Formular:** Es bedeutet Kenntnisnahme (Art. 6 Abs. 1 lit. b/f), keine Einwilligung.
- **Keystatic:** Rechtstexte bleiben drin, Inhalte ohne GFM-Tabellen.
- **Layout-Komponenten:** Header und Footer gehören design-system, page-builder darf sie erweitern.

## Offen beim Betreiber (Arbeit läuft mit Platzhaltern weiter)
- **Sanitär/Heizung** bei Bad & Fliesen und **Parkett** bei Boden: als Partner-Gewerk aufnehmen oder weglassen?
- **Rechtliches** (Details in `docs/agent-reports/2-legal-compliance.md`):
  - Vertragsmodell: Generalunternehmer oder Direktvertrag zwischen Kunde und Partner.
  - HWK-Fragen: Abgrenzung der eigenen Gewerke, § 7 Abs. 2 HwO.
  - Eintragung und Meister je Partnerbetrieb bestätigen.
  - eGbR/Register, Kleinunternehmerregelung, Beschäftigtenzahl.
  - Hoster, SMTP und Mistral samt Auftragsverarbeitungsverträgen.
- **Echte Logo-Datei** und **Kontakt in `security.txt`**.
- **Deployment-Hinweis** für `docs/DEPLOYMENT.md`: Der Reverse-Proxy muss Host und `X-Forwarded-Proto: https` setzen. Rate-Limit und Replay-Schutz wirken nur bei einer Instanz.

## Weiter verschoben
- SEO-Skills aus claude-seo: zu Beginn von Phase 7, siehe `CLAUDE.md`.
- Ein Dependabot-Branch liegt auf origin (`dependabot/npm_and_yarn/test-tools-…`). Prüfen und ggf. als PR-Lauf behandeln, nicht blind mergen.
