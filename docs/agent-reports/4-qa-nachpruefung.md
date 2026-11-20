# Phase 4 · qa-verifier · Nachprüfung der Fixes

Stand: 20.11.2026, `main` @ `22ef5e7`. Frischer Klon im Scratchpad, darin `npm ci`. `dist/` nicht neu gebaut: zwei `cp -a`-Kopien des vom Orchestrator gebauten `build:staging` (eine für E2E, eine für meinen Server auf 127.0.0.1:4540). E2E auf Port 4530/4531.
Mailpit-Stub auf 127.0.0.1:8025 (eigenes Skript, liefert `/api/v1/info` und für `/api/v1/search` `{"messages":[],"messages_count":0,…}`), kein SMTP auf 1025. Auf 8025 lief noch ein liegengebliebener Stub eines früheren Agenten (ohne `messages_count`, PID 1231, kein laufender Testlauf), den habe ich beendet und ersetzt. Nach der Prüfung habe ich meinen Stub und meinen Server wieder beendet.

Geprüfte Grundlagen: `4-qa-verifier.md`, `4-a11y-perf-tester.md`, `4-planner-geometry-fixes.md`, `4-motion-3d-lcp.md` (Nachtrag), `4-content-writer.md`.

## 1. Befehle und Ausgaben (wörtlich, gekürzt auf die Summen)

- `npm ci`: `added 521 packages, and audited 522 packages in 13s` · `found 0 vulnerabilities`
- `npm test`: `Test Files  25 passed (25)` · `Tests  404 passed (404)`; Hook-Test `# tests 7 # pass 7 # fail 0`
- `npm run check`: `Result (208 files): - 0 errors - 0 warnings - 0 hints`
- `npm run scan:wording`: `Wording-Scan: keine verbotenen Begriffe gefunden.`
- `npm run licenses -- --check`: `Lizenzen ok (599 Pakete).`
- `npm run platzhalter`: keine Änderung (`git status` im Klon leer)
- `E2E_MAILPIT=extern E2E_PORT=4530 npx playwright test tests/e2e/raumplaner.spec.ts --repeat-each=10`: `200 passed (5.3m)`, Exit 0 (10 Tests × 10 × 2 Projekte, darin der neue Regressionstest `raumplaner.spec.ts:154` „Maus über dem Editor …")
- `E2E_MAILPIT=extern E2E_PORT=4531 npx playwright test` (gesamt): `4 failed · 5 skipped · 213 passed (3.3m)`
  - rot nur `kontakt-api.spec.ts:96` (Erfolg mit Foto) und `:206` (Nativer POST → Danke-Seite), je chromium und mobile. Ursache: kein SMTP, Versand scheitert (`#kontakt-erfolg` nicht fokussiert bzw. `Received: "/kontakt/fehler/"`). Das sind genau die 4 echten Mail-Tests. „Ohne JavaScript …" und alle `keineMails`-Tests sind mit dem `messages_count`-Stub grün.
  - 5 skipped = bewusste Projekt-Weichen (`design-system.spec.ts`, `motion-3d.spec.ts`), wie in Phase 4.

## 2. Browserprüfung (Playwright, 1440 × 900 und 390 × 844 Touch)

Skripte: Scratchpad `qa.mjs`, `ts2.mjs`, `ts3.mjs`, `raum.mjs`, `efh.mjs`, `kontrast.mjs`. Screenshots: `docs/agent-reports/screenshots/4-qa-nachpruefung/` (01 Start, 02 Kurzanleitung, 03 nach „Verstanden" per Tastatur, 04 Raum gewählt, 05 3D, 06 Startseite/Kontakt, 07 Kurzanleitung über Zoomknöpfen, 08 Raum angetippt, 09 3D EFH).

| Seite / Profil | Konsolenfehler | CSP (Konsole + `securitypolicyviolation`) | Fremd-Requests | `scroll.*.js` |
|---|---|---|---|---|
| `/raumplaner/` Desktop (Start → Vorlage → Raum → bis Seitenende → 3D → bis Seitenende) | 0 | 0 / 0 | 0 | 0 |
| `/raumplaner/` Mobil (gleich) | 0 | 0 / 0 | 0 | 0 |
| `/` Desktop / Mobil | 0 / 0 | 0 / 0 | 0 / 0 | 1 / 1 (GSAP wie zuvor genau einmal) |
| `/kontakt/` Desktop / Mobil | 0 / 0 | 0 / 0 | 0 / 0 | 0 / 0 |

Warnungen auf `/raumplaner/`: nur `THREE.Clock … deprecated` (R3F, bekannt) und SwiftShader „GPU stall due to ReadPixels" (Folge der Screenshots). Startseite und Kontakt: 0 Warnungen. Startseite und `/kontakt/` damit unverändert.

## 3. Bewertung je Befund

| Befund | Ergebnis | Beleg |
|---|---|---|
| QA B1 – `raumplaner.spec.ts` stabil | **bestanden** | `--repeat-each=10` beide Projekte 200/200; Gesamtlauf: kein Fehlschlag außerhalb der 4 Mail-Tests. Regressionstest `raumplaner.spec.ts:154` vorhanden und grün. |
| QA B2 – Fokus nach „Verstanden" | **bestanden** | Vorher Fokus auf „Verstanden"-Knopf; nach Enter und nach Klick/Tap `activeElement` = `DIV[data-planer-editor]` „Grundriss-Editor" (Desktop und Mobil). scrollY bleibt gleich (Desktop 0→0, Mobil 397→397 bzw. 632→632). Kurzanleitung geschlossen. E2E `raumplaner.spec.ts:108` `toBeFocused()`. |
| QA B3 – keine Versprechen künftiger Funktionen | **bestanden** | `src/content/pages/raumplaner.md:3-4,9,13` nennt nur Vorhandenes (Upload Bild/PDF/HEIC, Maßstab, Wände, Räume, Türen/Fenster, 3D, Vorlagen) und sagt ausdrücklich, dass Absenden und Steckdosen/Schalter/Lichtpunkte „nicht enthalten" sind, Verweis aufs Kontaktformular. `start.md:31,38` (Ablauf, Teaser) ohne Elektro-/Absende-Versprechen. Gerendertes HTML `/raumplaner/` und `/`: keine Treffer für bald/demnächst/künftig/in Kürze; „Steckdose/Schalter" auf `/` nur in der Vorher/Nachher-Illustration. Planer-Inseln (`src/islands/planner/*.tsx`) ohne solche Texte. |
| QA B4 – keine `maxLeafSize`-Warnung | **bestanden** | 0 Warnungen `maxLeafSize` beim 3D-Aufbau 2-Zimmer (Desktop, Mobil) und EFH-EG (vorher 32×). Unit `tests/unit/geometry/szene-bauen.test.ts` grün. |
| QA B5 – `check` 0 Hinweise | **bestanden** | `0 errors - 0 warnings - 0 hints` |
| a11y B1 – axe `heading-order` | **bestanden** | axe (wcag2a/aa, 21a/aa, 22aa, best-practice) in den Zuständen Start, Editor + Kurzanleitung, Editor + Raum + Wandliste, 3D: `heading-order` in allen als „pass", Desktop und Mobil. Gliederung: H1 3D-Raumplaner → H2 (visually-hidden) Grundriss bearbeiten → H3 Räume (5) → H2 … |
| a11y B2 – Tippziele | **bestanden** | Mobil (`pointer: coarse` = true): Summary 44 px, `.planer-link` 17 × 44 px. Desktop: Summary 24 px, `.planer-link` 26 px. Hinweis H1 unten (Kurzanleitung überdeckt Zoomknopf teilweise). |
| a11y B3 – 0 Requests `scroll.*.js` auf `/raumplaner/` | **bestanden** | 0 Requests nach Scrollen bis Seitenende, in Editor- und 3D-Zustand, Desktop und Mobil; `.leitung-aktiv` 0. Gegenprobe `/`: genau 1 Request. |
| a11y B4 – Kontraste | **bestanden** (Stichprobe), Raumfüllung siehe unten | Nachgerechnet (WCAG-Formel, Werte aus `tokens.css`, berechnete Farben aus dem Browser): Graphit/Kalk 15,66, Graphit/Kalk-hell 16,91; Grau-Text auf Kalk 6,20 / Kalk-tief 5,46 / Kalk-hell 6,69 / Raumfüllung 6,22 / gewähltem Raum 6,12; Kabelgrün auf Kalk 6,24 / Kalk-hell 6,74 / Kalk-tief 5,50; Fehler #b42318 auf Kalk 5,83; `--line-strong` 3,58 / 3,87 / 3,15; Meldung Kalk auf Graphit .88 11,11; Eckpunkt-Ring Kabelgrün 6,74 (Strom allein 1,27). Alle Angaben im Fix-Bericht bestätigt. axe `color-contrast` bleibt „incomplete" (Canvas/Overlay), manuell wie oben. |

### Raumfüllung 1,1:1 – reicht die Kennzeichnung im Seitenpanel?

Nachgerechnet: gewählte Füllung `rgba(197,240,30,.32)` auf Kalk-hell = 1,09:1, gegen einen benachbarten nicht gewählten Raum nur 1,02:1. Als Zustandsanzeige im Plan erfüllt sie WCAG 1.4.11 (3:1) für sich allein nicht.

Ausgleich im Panel (gemessen): Listeneintrag `aria-pressed="true"`, Graphit-Rand auf Kalk-tief 13,8:1 (der Strom-Balken mit 1,03:1 zählt nicht). Außerdem erscheint das Fieldset „Raum" mit dem Namen. Für Screenreader und für das Erkennen am Panel reicht das. Visuell aber nur eingeschränkt: Nach Klick/Tipp auf einen Raum liegt der markierte Listeneintrag auf beiden Viewports außerhalb des Sichtbereichs (Desktop top 1083 px bei 900 px Fensterhöhe, Mobil 1362 bei 844). Sichtbar ist nur das Namensfeld des Fieldsets, auf Mobil genau an der Unterkante (Screenshot `mobil-08-raum-angetippt.png`).

Urteil: **bestanden mit Einschränkung (niedrig).** Der Zustand ist als Text wahrnehmbar (Fieldset mit Name, `aria-pressed`). Die Füllung ist deshalb nicht die einzige Information, und das reicht für die Abnahme Phase 4. Empfehlung für Phase 5 (planner-geometry): Eine kontrastreiche Kennzeichnung im Plan selbst, die nicht unter den Wänden liegt, z. B. `.raum.ist-ausgewaehlt ~ .raum-text .raum-name` in Kabelgrün mit Unterstreichung oder Markierung (Kabelgrün auf gewähltem Raum ca. 6,1:1). Stellen: `src/islands/planner/planer.css:484-488`, `src/islands/planner/Seitenleiste.tsx:341-342`.

## 4. Neue Hinweise (keine Blocker)

- **H1 (niedrig, belegt) – planner-geometry.** Bei 390 px überdeckt die Kurzanleitung den oberen Rand des Zoomknopfs „Vergrößern": Unterkante Kurzanleitung 501,3 px, Oberkante Knopf 492,75 px, also etwa 8,5 px. Sichtbar bleiben 44 × 35,5 px, nach dem Einschwingen ist WCAG 2.5.8 erfüllt. Während des weichen Scrollens direkt nach der Vorlagenwahl meldet axe aber kurzzeitig `target-size` (serious): „partially obscured, 44px by 12.8px". Das trat in 6 von 8 Läufen dieser Abfolge auf, mit Wartezeit in 0 von 6. Außerdem verdeckt die Kurzanleitung die Statusmeldung „Vorlage … geladen". Stellen: `src/islands/planner/Planer.tsx:167`, `src/islands/planner/planer.css:669`. Screenshots `mobil-07-kurzanleitung-zoomknoepfe-*.png`. Mögliche Abhilfe: Kurzanleitung rechts bzw. unten frei lassen (Abstand zur Zoomleiste) oder Zoomleiste unter die Kurzanleitung legen.
- **H2 (Hinweis).** axe `label-content-name-mismatch` „incomplete" (3 Knoten) im Editor, keine Verstöße. Nicht weiter geprüft.

## 5. Stichproben Wording und Gewerke

- `scan:wording` grün. Gerenderte Texte auf `/raumplaner/` ohne Kamera, Meister (außer „Meister-Partnerbetrieb"), Fachbetrieb, Festpreis oder Superlative. Die 3D-Bedienknöpfe heißen „Draufsicht/Schrägansicht/Näher/Weiter weg" (Screenshot `desktop-09-3d-efh.png`).
- Gewerke: `start.md:9,26,34` nennt die Partner-Gewerke nur als „Meister-Partnerbetriebe". An den Leistungsseiten wurde seit der Phase-4-Abnahme nichts geändert (Fix-Commits betreffen Planer, Motion und die Texte raumplaner/start).

## 6. Nicht prüfbar (unverändert)

- 4 Mail-E2E-Tests: brauchen echtes Mailpit mit SMTP (Docker), die CI prüft sie.
- 60 fps auf echter Hardware (nur SwiftShader).
- JPX/JBIG2 im pdf.js-Worker (kein passendes Test-PDF).

## Gesamturteil Phase 4

**Abnahme erteilt.** Alle nachzuprüfenden Befunde sind bestanden: QA B1 bis B5 und a11y B1 bis B4, wobei die Raumfüllung nur mit Einschränkung besteht (Empfehlung für Phase 5). Rot sind nur die 4 Mail-Tests, und zwar in dieser Umgebung erwartungsgemäß. Unit 404/404, Typen 0/0/0, Wording und Lizenzen grün. Auf `/raumplaner/`, `/` und `/kontakt/` gibt es 0 Konsolenfehler, 0 CSP-Verstöße und 0 Fremd-Requests. Offen bleiben die Hinweise H1 und H2 und die Empfehlung zur Raumfüllung, alle bei planner-geometry, keiner davon blockiert.
