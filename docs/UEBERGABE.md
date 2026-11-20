# Übergabe an die nächste Session

Stand: 20.11.2026. Phase 0–3 abgeschlossen (`docs/agent-reports/3-zusammenfassung.md`). **Nächste Phase: 4 (Planer Teil 1, `planner-geometry`).** Nach Abschluss von Phase 4 diese Datei neu schreiben.

## Arbeitsweise (vom Betreiber festgelegt)
- Der Orchestrator delegiert an `.claude/agents/`, wer baut, prüft nicht. Höchstens 2–3 bauende Agenten laufen parallel, dann mit `isolation: worktree`. Worktree-Branches nach dem Merge entfernen.
- Nach jeder Phase: Build und Tests grün, unabhängige Abnahme, Fixes durch die bauenden Agenten, Nachprüfung, Commit und Push auf `main`, Zusammenfassung `docs/agent-reports/<phase>-zusammenfassung.md`.
- **Jede neue Phase läuft in einer eigenen, neuen Session** (Wunsch des Betreibers, spart Tokens). Am Ende einer Phase: diese Datei neu schreiben, pushen, dann mit `create_session` (claude-code-remote) eine neue Session für die nächste Phase eröffnen, mit dem Auftrag „Übergabe lesen, Phase N zu Ende führen, neue Übergabe, neue Session für Phase N+1", und die eigene Arbeit anhalten.
- Nur anhalten bei Kosten, externen Konten, neuen Skills/Plugins, rechtlich offenen Entscheidungen oder echten Blockern.
- Agenten melden ≤ 15 Zeilen, Details in `docs/agent-reports/`. Am Nutzungslimit per SendMessage fortsetzen. **Halbfertiges pushen** (der Container ist flüchtig).
- Im Container fehlen Docker und Mailpit. E2E laufen mit `E2E_MAILPIT=extern`. Die 4 Mail-Tests (`kontakt-api.spec.ts:96/:206`) schlagen hier fehl, die CI deckt sie ab.
- E2E-Läufe sind isoliert (freier Port, eigene dist-Kopie). Trotzdem nicht bauen, während ein Prüf-Agent `dist/` misst. Wer `dist` kopiert, nutzt `cp -a` (sonst fehlen die vorkomprimierten Dateien).
- Prüf-Agenten parallel nur mit getrennten Ports. Bisher bewährt: Orchestrator baut einmal `build:staging`, Prüfer bauen nicht neu.

## Phase 4: Schritte
1. **Kleinauftrag vorab (aus Phase 3, LCP `/kontakt/` Lab 2,10 s, Ziel < 2,0 s):** parallel in Worktrees
   - motion-3d: GSAP nur laden, wenn ein `[data-leitung]`-Element sichtbar wird bzw. nicht auf Formularseiten (`src/lib/motion/index.ts:23-25`, `Section.astro:39`).
   - design-system: Schriften vor dem LCP reduzieren (`BaseLayout.astro:27/:41`, nur die eine Schrift für den LCP-Text vorladen, `font-display` prüfen).
   - Messung durch a11y-perf-tester in der Abnahme von Phase 4 mitprüfen. Wenn der Gewinn nicht reicht: ALTCHA-Widget erst bei Fokus aufs Formular laden (backend-api).
2. **planner-geometry** (Briefing Abschnitt 7.1 und 7.5, Agent-Datei `.claude/agents/planner-geometry.md`): Upload (Bild, PDF über selbst gehosteten pdf.js-Worker, HEIC), EXIF entfernen, Maßstab kalibrieren, Wand-Editor Modus A mit Snapping, Raumerkennung, Türen/Fenster, 3D-Extrusion mit CSG, Vorlagen, Geometrie-Unit-Tests. Projektmodell (versioniert, serialisierbar) ist der Vertrag für Phase 5/6 und gehört in `CLAUDE.md` (architect trägt ein, ≤ 80 Zeilen).
   - Eigener Chunk nur auf `/raumplaner/`; dort `Astro.csp?.insertScriptResource("'wasm-unsafe-eval'")` bzw. Worker/blob nur seitenweise.
   - Die bestehende Platzhalterseite `/raumplaner/` wird ersetzt; noscript- und No-WebGL-Fallback mit Verweis aufs Kontaktformular.
   - Neue Abhängigkeiten (z. B. pdfjs-dist, zustand, CSG-Bibliothek, heic-to schon freigegeben) exakt pinnen, Lizenz prüfen (`npm run licenses -- --check`), nicht freigegebene Lizenzen dem Betreiber vorlegen.
   - Wording im Planer: „Ansicht" statt Kamera.
3. **Prüfen:** `npm ci`, `npm test`, `npx vitest run`, `npm run check`, `npm run build:staging`, `npm run licenses -- --check`, `npm run platzhalter` (geänderte `PLATZHALTER.md` mitcommitten).
4. **Abnahme:** qa-verifier (DoD Phase 4: Grundriss → 3D-Modell, Unit-Tests, Maus/Touch/Tastatur, Screenshots Desktop/Mobil). Zusätzlich a11y-perf-tester für den Planer-Chunk (nicht auf anderen Seiten geladen) und den LCP-Kleinauftrag.
5. Fixes, Nachprüfung, `4-zusammenfassung.md`, Push, neue Übergabe, **neue Session für Phase 5** eröffnen.

## Offen aus Phase 3
- 60 fps, LCP und INP auf echtem Gerät mit GPU nicht gemessen (Betreiber).
- „Raumplaner öffnen" (`src/pages/index.astro:47/:90`, `CtaBand.astro:23`) und „Skizze aus dem Raumplaner" (`start.md:31`) versprechen bis Phase 6 mehr, als der Planer kann. In Phase 6 prüfen.
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

## Offen beim Betreiber (die Arbeit läuft mit Platzhaltern weiter)
- **Sanitär/Heizung und Parkett:** als Partner-Gewerk aufnehmen oder weglassen?
- **Rechtliches** (`docs/agent-reports/2-legal-compliance.md`): Vertragsmodell (Generalunternehmer oder Direktvertrag), HWK-Abgrenzung und § 7 Abs. 2 HwO, Eintragung und Meister je Partnerbetrieb, eGbR/Register, Kleinunternehmerregelung, Beschäftigtenzahl, Hoster/SMTP/Mistral samt Auftragsverarbeitungsverträgen.
- **Echte Logo-Datei** und **Kontakt in `security.txt`**.
- **Angebotsfrist** für „So läuft's ab".
- **Deployment** (`docs/DEPLOYMENT.md`): Reverse-Proxy setzt Host und `X-Forwarded-Proto: https`, hinter TLS-Proxy `TRUST_PROXY=true`. Rate-Limit und Replay-Schutz wirken nur bei einer Instanz.

## Weiter verschoben
- SEO-Skills aus claude-seo: zu Beginn von Phase 7, siehe `CLAUDE.md`.
- Dependabot-Branch `origin/dependabot/npm_and_yarn/test-tools-…`: prüfen und als PR-Lauf behandeln, nicht blind mergen.
