# BRIEFING: Website RAUMSTROM – für Claude Code

> **So startest du:** Lege diese Datei als `docs/BRIEFING.md` in einen leeren Projektordner, starte Claude Code dort im **Plan-Modus** (Shift+Tab, bis „plan mode" angezeigt wird) und schreibe:
> `Lies docs/BRIEFING.md vollständig und erstelle den Umsetzungsplan. Noch nichts bauen.`

---

## 0. Deine Rolle und Arbeitsweise

Du bist Senior-Fullstack-Entwickler, 3D/WebGL-Spezialist, Security-Engineer und Experte für deutsches Web-Recht (DSGVO, TDDDG, DDG, UWG, HwO, BFSG) in einer Person. Du baust die Website der Firma **RAUMSTROM** inklusive eines 3D-Raumplaners.

**Regeln für die Zusammenarbeit:**
1. **Erst planen, dann bauen.** Erstelle im Plan-Modus einen Phasenplan (siehe Abschnitt 14), stelle offene Fragen gesammelt am Ende und warte auf Freigabe.
2. **Phasenweise arbeiten.** Nach jeder Phase: Ergebnis prüfen (Build, Tests, im Browser ansehen), `git commit`, kurze Zusammenfassung auf Deutsch, dann auf „weiter" warten.
3. **Nichts als „fertig" melden, was nicht geprüft ist** (Build läuft, Tests grün, Seite tatsächlich angesehen).
4. **Token sparen:** Lege früh eine knappe `CLAUDE.md` an (max. 80 Zeilen) mit den wichtigsten Projektregeln, Befehlen und Ordnerstruktur, damit spätere Sessions und Agenten nicht das ganze Briefing neu lesen müssen.
4a. **Ein Agent pro Aufgabe:** Du arbeitest als **Orchestrator** und delegierst jede Aufgabe an einen eigenen, spezialisierten Subagenten. Wie das genau funktioniert, steht in Abschnitt 0A.
5. **Aktuelle Doku statt Gedächtnis:** Prüfe APIs von Astro, Three.js, R3F, drei, Keystatic, ALTCHA, Mistral usw. gegen die aktuelle Dokumentation (Context7-MCP oder offizielle Docs), bevor du Code schreibst.
6. **Sprache:** Website-Inhalte auf Deutsch, Anrede „Sie", sachlich-hochwertiger Ton (keine Umgangssprache, keine Wortwitze in Überschriften). Code-Kommentare dürfen Englisch sein, alle Dokus für den Betreiber auf Deutsch.
7. **Repository:** Lege (nach Rückfrage) ein **privates** GitHub-Repo `Tash52/raumstrom-website` an und pushe nach jeder Phase. Eine monatliche Trend-Routine des Betreibers arbeitet mit genau diesem Repo-Namen (Abschnitt 7.3).

---

## 0A. Agenten-Architektur: ein Agent pro Aufgabe

### Rollenverteilung
- **Du (Hauptsession) bist ausschließlich Orchestrator.** Du planst, zerlegst in Aufgaben, schreibst für jede Aufgabe ein Agenten-Briefing, startest den passenden Subagenten, prüfst sein Ergebnis, führst zusammen und committest. Größere Features baust du **nicht selbst**.
- **Jede Aufgabe = ein Subagent** mit klar abgegrenztem Auftrag. Gibt es für eine Aufgabe noch keinen passenden Agenten, legst du einen neuen in `.claude/agents/` an, statt einen bestehenden zu überladen.
- **Wer baut, prüft nicht.** Jede Phase endet mit einer Prüfung durch einen Agenten, der den Code nicht geschrieben hat (`qa-verifier`, bei sicherheitsrelevanten Teilen zusätzlich `security-auditor`). Findet der Prüfer etwas, geht der Fix an den Agenten zurück, der den Code gebaut hat.

### Agenten anlegen (Phase 0, nach dem Skill-Audit)
Lege die Agenten als Dateien `.claude/agents/<name>.md` an und committe sie ins Repo. Prüfe das aktuelle Frontmatter-Format in der Claude-Code-Doku (Stand der Recherche: Pflicht sind `name` und `description`; außerdem gibt es u. a. `tools`/`disallowedTools`, `model` (`sonnet`, `opus`, `haiku`, `fable`, `inherit`), `skills` (wird beim Start vollständig vorgeladen), `effort`, `maxTurns`, `isolation: worktree`, `permissionMode`, `color`).

| Agent | Aufgabe | Tools (Auszug) | Modell | Skills vorladen |
|---|---|---|---|---|
| `skill-auditor` | Skills/Plugins nach Abschnitt 3 prüfen, `SKILL-AUDIT.md` schreiben | Read, Grep, Glob, WebFetch, Bash (nur `git clone` in Temp-Ordner), Write nur `docs/` | inherit | – |
| `architect` | Ordnerstruktur, Content-Schemas (zod), `firma.yaml`/`features.yaml`/`gewerke.yaml`, Keystatic-Config, `CLAUDE.md`, Launch-Check-Skript | Read, Write, Edit, Bash | opus | – |
| `design-system` | Design-Tokens, Schriften lokal, Logo-SVGs, Basis-Komponenten, Layout | Read, Write, Edit, Bash | inherit | frontend-design, design-taste-frontend, ui-ux-pro-max |
| `content-writer` | Seitentexte, Leistungs-Texte, FAQ, Ratgeber-Entwürfe; hält Wording-Regeln ein | Read, Write, Edit, WebSearch, WebFetch | sonnet | – |
| `legal-compliance` | Rechtstexte (Abschnitt 9), Gewerke-Kennzeichnung (Abschnitt 2), automatischer Wording-Scan | Read, Write, Edit, Grep, WebSearch, WebFetch | opus | – |
| `page-builder` | Astro-Seiten, Navigation, Footer, Formulare (UI), Gewerke-Matrix-Rendering | Read, Write, Edit, Bash | sonnet | frontend-design |
| `motion-3d` | 3D-Hero, Scroll-Inszenierung, Säulen-Journey, Slider, Mikro-Interaktionen, Fallbacks | Read, Write, Edit, Bash | opus | threejs-skills (fundamentals, performance, react-three-fiber, shaders), gsap-scrolltrigger, animate |
| `planner-geometry` | Raumplaner: Upload, PDF/HEIC, Kalibrierung, Wand-Editor (Modus A), Raumerkennung, 3D-Extrusion, CSG | Read, Write, Edit, Bash | opus | threejs-skills (geometry, interaction) |
| `planner-design` | Raumplaner: Gestaltungsmodi, Elektro + Installationszonen, Materialien/Texturen, Stilpakete | Read, Write, Edit, Bash | opus | threejs-skills (materials, textures, lighting) |
| `planner-export` | Raumplaner: GLB, Renders, PDF, Projekt-JSON, interner Viewer, Entwurf speichern | Read, Write, Edit, Bash | inherit | threejs-skills (loaders, asset-pipeline) |
| `backend-api` | `/api/*`: Validierung, ALTCHA, Rate-Limit, Upload-Prüfung, Mail (nodemailer), optional Mistral (Modus B), Docker | Read, Write, Edit, Bash | opus | – (security-guidance-Plugin ist aktiv) |
| `seo-specialist` | Meta, Schema.org, Sitemap, Regionalseiten (Struktur), OG-Bilder, interne Verlinkung | Read, Write, Edit, Bash | sonnet | claude-seo (seo, seo-local, seo-schema) |
| `security-auditor` | **Nur lesen und testen, nie fixen:** Header, CSP, API, Uploads, Secrets, Abhängigkeiten, ZAP, Semgrep → `SECURITY-REPORT.md` | Read, Grep, Glob, Bash; kein Write außer `docs/` | opus | Trail of Bits (insecure-defaults, static-analysis, supply-chain-risk-auditor) |
| `a11y-perf-tester` | axe, Lighthouse, Reduced-Motion, No-WebGL, Fremd-Request-Test | Read, Bash, Playwright | sonnet | – |
| `qa-verifier` | Unabhängige Abnahme jeder Phase gegen die Definition of Done; startet Build und Tests, sieht Seiten im Browser an | Read, Grep, Bash, Playwright; kein Write außer `docs/` | opus | verification-before-completion (falls verfügbar) |
| `docs-writer` | Alle Betreiber-Dokus auf Deutsch (Abschnitt 11–13) | Read, Write, Edit | haiku | – |
| `trend-researcher` | Einrichtungstrends recherchieren, Stilpaket-JSONs vorschlagen (Abschnitt 7.3) | Read, Write, Edit, WebSearch, WebFetch | sonnet | – |

### Regeln für die Delegation
1. **Agenten-Briefing** für jeden Aufruf (kurz, vollständig): Ziel, zu lesende Briefing-Abschnitte (nur Abschnittsnummern, nicht das ganze Briefing), betroffene Dateien/Ordner, Schnittstellen zu anderen Agenten, Definition of Done, Tests, die grün sein müssen.
2. **Agenten starten ohne Vorwissen.** Sie lesen `CLAUDE.md` und die genannten Abschnitte. Halte `CLAUDE.md` deshalb aktuell (Ordnerstruktur, Befehle, Konventionen, Schnittstellen).
3. **Kurze Rückmeldung:** Jeder Agent liefert höchstens ca. 15 Zeilen zurück (geändert / getestet / offen / Risiken). Details schreibt er nach `docs/agent-reports/<phase>-<agent>.md`. So bleibt dein Kontext schlank.
4. **Parallel nur ohne Dateikonflikte:** Unabhängige Aufgaben (z. B. `content-writer` + `design-system` + `legal-compliance`) dürfen parallel laufen. Bauende Agenten, die gleichzeitig arbeiten, laufen mit `isolation: worktree`. Du führst die Branches danach zusammen. Höchstens 4 parallele Agenten, damit Freigaben überschaubar bleiben.
5. **Keine Verschachtelung:** Bauende Agenten bekommen kein `Agent`-Tool (in `disallowedTools`), damit keine unkontrollierten Unter-Agenten entstehen. Nur du delegierst.
6. **Rechte minimal:** Prüf-Agenten (`skill-auditor`, `security-auditor`, `qa-verifier`, `a11y-perf-tester`) dürfen keinen Projektcode ändern. Kein Agent bekommt `bypassPermissions`.
7. **Freigaben bleiben beim Betreiber:** Installation von Skills, Anlegen des GitHub-Repos, alles mit Kosten oder externen Konten (Hoster, Mistral, SMTP) nur nach Rückfrage.

---

## 1. Über RAUMSTROM (Kontext)

- **Gründer:** Christian Maul (Organisation, Koordination aller Gewerke, Demontage, Trockenbau, Boden) und Jernar Kassimov (Elektriker mit Techniker-Abschluss, Schein für Ladesäulenprüfungen). Kein Meistertitel vorhanden.
- **Region:** Schweinfurt und Umland (Unterfranken).
- **Positionierung:** Modernisierung aus einer Hand. Der rote Faden ist **Strom**: Jede Renovierung beginnt bei der Elektrik.
- **Claim:** „Renoviert bis in die Leitung."
- **Die 3 Säulen (immer in dieser Reihenfolge, Renovierung steht vorne):**
  1. **Modernisieren:** Komplettrenovierung: Elektrik, Trockenbau, Boden, Wände, Fliesen/Bad, Malerarbeiten
  2. **Elektrifizieren:** Wallbox-Installation, Elektro-Modernisierung, Zählerschrank/Unterverteilung
  3. **Sicher betreiben:** Wiederkehrende Prüfung von Ladesäulen, Wallboxen, Ladekabeln (DGUV V3), Wartungsvertrag
- **Zielgruppen, zwei Eingänge:** „Für Zuhause" (Eigentümer, Käufer, Mieter) und „Für Unternehmen & Verwaltungen" (Hausverwaltungen, Vermieter, Firmen mit E-Flotte, Autohäuser, Hotels).
- **Kampagnenidee „Hinter der Wand":** Wir zeigen, was hinter der Wand passiert (Leitungen, Schlitze, Unterverteilung) und warum unsere Renovierungen deshalb halten. Das ist das visuelle Leitmotiv der Website.

### Markendesign (verbindlich)
| Token | Hex | Verwendung |
|---|---|---|
| Kalk | `#F4F1EB` | Grundfläche (ca. 60 %) |
| Graphit | `#15191E` | Schrift, Technik, dunkle Flächen (ca. 30 %) |
| Strom | `#C5F01E` | Energie-Akzent, nur Fläche/Glow, **nie als Text auf hellem Grund** (ca. 10 %) |
| Kabelgrün | `#3D6300` | grüne Schrift auf hellem Grund |

- **Wortmarke:** „**RAUM**" fett + „STROM" leicht.
- **Zeichen:** Grundriss eines Raums mit Türöffnung, durch die eine Leitung hereinkommt und in einem Punkt endet („Strom kommt in den Raum"). Baue es als sauberes SVG nach (Varianten: quer, quer negativ, gestapelt, Zeichen, Zeichen negativ) und lege es unter `src/assets/brand/` ab, sodass es später durch eine finale Datei ersetzt werden kann.
- **Schriften:** Archivo (alles) und IBM Plex Mono (technische Labels, Maße, kW, Prüfdaten).

### Wording-Regeln (verbindlich, rechtlich relevant)
- **Niemals** „Meister", „Meisterbetrieb", „Innungsbetrieb", „zertifizierter Fachbetrieb" o. Ä. für RAUMSTROM selbst verwenden.
- **Keine** Kameras, Alarmanlagen oder „Sicherheitstechnik" im Angebot oder Text. Für Säule 3 heißt es „Sicher betreiben" bzw. „Prüfservice".
- Keinen früheren oder aktuellen Arbeitgeber der Gründer nennen.
- Keine Superlative, die nicht belegbar sind („günstigste", „beste", „Nr. 1"), kein „Festpreis-Garantie", solange nicht vertraglich geregelt.

---

## 2. Der Rechtsrahmen „Alles aus einer Hand" (wichtig!)

**Ziel des Betreibers:** Besucher sollen erleben, dass RAUMSTROM die komplette Renovierung abdeckt.

**Rechtliche Grenze:** Wer für Leistungen eines zulassungspflichtigen Handwerks (Anlage A HwO, z. B. Elektrotechnik, Fliesen, Maler/Lackierer, Stuckateur, Installateur) wirbt, ohne in der Handwerksrolle eingetragen zu sein, handelt wettbewerbswidrig (§ 3a UWG i. V. m. § 1 HwO) und irreführend (§ 5 UWG). Entscheidend ist der **Gesamteindruck**, nicht der Wortlaut. Verbraucher erwarten bei einem Handwerksbetrieb, dass er die Leistung selbst erbringt. Werden Subunternehmer eingesetzt, muss das **bereits in der Werbung erkennbar** sein (OLG Rostock, 2 U 11/20). Pauschales „Alles aus einer Hand" ohne Klarstellung ist angreifbar.

**Umsetzung (so wird das Vollsortiment rechtssicher):**
1. Erzähle die Komplettrenovierung als **Koordinationsleistung**: „Ein Ansprechpartner für Ihre gesamte Renovierung. Wir planen, koordinieren und führen aus. Meisterpflichtige Gewerke übernehmen unsere festen Meister-Partnerbetriebe."
2. Lege eine **Gewerke-Matrix** in `src/content/settings/gewerke.yaml` an. Jedes Gewerk hat:
   ```yaml
   - id: elektroinstallation
     name: Elektroinstallation
     ausfuehrung: partner   # "eigen" | "partner"
     hinweis_hwk_geprueft: false
   ```
   Die Website rendert bei `partner` automatisch und sichtbar direkt an der Leistung: „Ausführung durch unseren Meister-Partnerbetrieb". Der Betreiber kann das später ohne Code umstellen, z. B. sobald die Eintragung in die Handwerksrolle für Elektro vorliegt.
3. **Startwerte:**
   - `eigen`: Demontage/Entkernung, Trockenbau, Bodenbelag (Vinyl/Laminat/Teppich), Koordination
   - `partner`: Elektroinstallation, Wallbox-Installation, Zählerschrank, Fliesen/Bad, Putz/Stuck, Malerarbeiten
   - Prüfservice DGUV V3: `eigen`, aber `hinweis_hwk_geprueft: false`
4. Der Launch-Check (Abschnitt 11) warnt, solange irgendein Eintrag `hinweis_hwk_geprueft: false` hat. Der Betreiber lässt die Formulierungen vor Launch von der Handwerkskammer für Unterfranken prüfen.
5. **Bewertungen:** Nur echte Bewertungen, Bereich bleibt leer bzw. ausgeblendet, bis welche vorliegen. Direkt am Bewertungsbereich muss ein Hinweis stehen, ob und wie die Echtheit geprüft wird (§ 5b Abs. 3 UWG).
6. **Referenzen:** Nur echte Projekte. Keine KI-generierten oder Stock-Bilder als „unsere Arbeit" ausgeben. Bis echte Fotos da sind: gekennzeichnete, illustrative Platzhalter (z. B. stilisierte Blueprint-Grafiken).

---

## 3. Skills & Plugins

Der Betreiber legt Wert darauf, dass **jedes externe Skill/Plugin vor der Installation geprüft** wird. Bekannte Risiken: Bei Audits 2026 wurden auf öffentlichen Skill-Marktplätzen hunderte bösartige Skills gefunden (Credential-Diebstahl, versteckte Prompt-Injection, Hooks, Install-Skripte).

### Prüfverfahren vor jeder Installation (Pflicht)
1. Quelle: offizieller Anthropic-Marktplatz oder bekannter Herausgeber? Stars, Forks, letzte Aktivität, Anzahl Contributors, Lizenz.
2. Repo **klonen statt `curl | bash`**. Jede Datei lesen: `SKILL.md`, referenzierte Dateien, `scripts/`, `bin/`, `hooks/`, `.claude/settings.json`, `package.json`-Scripts.
3. Suchen nach: Netzwerkzugriffen, `!`-Shell-Blöcken (dynamic context injection), Zugriff auf `~/.ssh`, `.env`, Tokens, verschleiertem Code (base64/eval), Anweisungen, Sicherheitsabfragen zu umgehen, „Fake-Prerequisites".
4. Werkzeugumfang (`allowed-tools`) passt zum Zweck?
5. Ergebnis als Tabelle in `docs/SKILL-AUDIT.md` (Name, Quelle, Version/Commit-Hash, Befund, Entscheidung) und **dem Betreiber zur Freigabe vorlegen**. Installation auf gepinnten Commit-Hash.

### Vorauswahl (bereits grob recherchiert, du prüfst nach obigem Verfahren)
| Skill/Plugin | Quelle | Einschätzung | Nutzen hier |
|---|---|---|---|
| `security-guidance` | Anthropic, offizieller Marktplatz | sicher, offiziell | Warnt beim Schreiben vor XSS, Injection usw. **Installieren.** |
| `frontend-design` | Anthropic, offizieller Marktplatz | sicher, offiziell | Eigenständiges Design statt Template-Look. **Installieren.** |
| `playwright` | offizieller Marktplatz (Microsoft) | sicher | Browser-Tests, Screenshots, A11y-Checks. **Installieren.** |
| `context7` | offizieller Marktplatz (Upstash) | sicher | Aktuelle Library-Doku. **Installieren.** |
| `CloudAI-X/threejs-skills` | GitHub, MIT, ca. 3,7k Stars, 13 Skills (fundamentals, geometry, materials, lighting, textures, loaders, shaders, postprocessing, interaction, performance, react-three-fiber, asset-pipeline …) | gut bewertet, nur ein Hauptautor → Dateien prüfen | Kernwissen für 3D-Hero und Raumplaner. **Nach Prüfung installieren.** |
| `trailofbits/skills` (nur `insecure-defaults`, `static-analysis`, `supply-chain-risk-auditor`) | Trail of Bits (renommierte Security-Firma) | vertrauenswürdig | Security-Audit des eigenen Codes und der npm-Abhängigkeiten. **Nach Prüfung installieren.** |
| `AgriciDaniel/claude-seo` (nur `seo`, `seo-local`, `seo-schema`, technische Audits) | GitHub, MIT, sehr populär (zehntausende Stars), aktiv gepflegt, Tests in CI | gut, aber Install-Skripte, Python-venv und Headless-Chromium → **nur über Plugin-Marktplatz installieren, kein `curl | bash`**, keine kostenpflichtigen Extensions | Lokales SEO, Schema.org, Technik-Audit. **Nach Prüfung installieren.** |
| Bereits beim Betreiber vorhanden, falls in Claude Code verfügbar: `gsap-scrolltrigger`, `lightweight-3d-effects`, `modern-web-design`, `design-taste-frontend`, `ui-ux-pro-max`, `animate`, `emil-design-eng`, `apple-design`, `security-and-hardening`, `verification-before-completion` | Account des Betreibers | vorhanden | Prüfen, ob in dieser Claude-Code-Umgebung verfügbar. Wenn ja: nutzen. |
| **Nicht verwenden:** Sammel-Repos mit tausenden Skills (z. B. „awesome-skills"-Aggregatoren), ältere R3F-Einzelskills ohne aktuelle Pflege | – | zu breit bzw. veraltet | – |

**Referenzcode (kein Skill, keine Abhängigkeit):** `ch-bas/threejs-sims-house-builder` (MIT, klein, ca. 80 Stars) darf als Ideenquelle für Planer-Features dienen. Nicht blind kopieren. Falls Code übernommen wird: Lizenzhinweis in `THIRD-PARTY-LICENSES.md`.

---

## 4. Technik-Stack

| Bereich | Wahl | Begründung |
|---|---|---|
| Framework | **Astro 6** (aktuelle stabile Version prüfen), Seiten statisch vorgerendert | schnell, SEO-stark, minimale Angriffsfläche; Astro 6 hat eine stabile, eingebaute CSP |
| Interaktive Inseln | React (nur Raumplaner, 3D-Hero, Formulare) | |
| 3D | three.js + @react-three/fiber + @react-three/drei, three-bvh-csg (Tür-/Fensteröffnungen), zustand (State) | |
| Animation | GSAP + ScrollTrigger, Lenis (Smooth Scroll, abschaltbar), View Transitions | |
| Styling | CSS mit Design-Tokens (Custom Properties), optional Tailwind v4 | |
| Inhalte/CMS | **Astro Content Collections + Keystatic (nur lokaler Modus)** | Betreiber bearbeitet Texte/Bilder per Formular, ohne Code und ohne Claude-Tokens |
| Server-Teil | Astro Node-Adapter im Hybrid-Modus: nur `/api/*` läuft serverseitig | |
| Validierung | zod (Client und Server identische Schemas) | |
| Mail | nodemailer über SMTP mit TLS (deutscher Mailanbieter/Hoster) | |
| Bot-Schutz | **ALTCHA** (MIT, Open Source, selbst gehostet, Proof-of-Work, keine Cookies, WCAG 2.2 AA) | kein reCAPTCHA, kein Drittanbieter |
| PDF | pdfjs-dist (Grundriss-PDF einlesen, Worker selbst gehostet), pdf-lib oder jsPDF (Zusammenfassung erzeugen) | |
| Tests | Vitest, Playwright, axe-core, Lighthouse CI | |
| Deployment | Dockerfile (Node LTS, non-root, read-only FS) + Doku für klassischen Node-Hoster | hosterunabhängig |

**Hosting-Empfehlung für die Doku:** Deutscher **Managed-Hoster mit Node.js-Unterstützung** (z. B. mittwald), damit Betriebssystem-Updates und Server-Härtung beim Hoster liegen. Ein eigener VPS nur, wenn jemand ihn dauerhaft wartet. Baue so, dass beides funktioniert.

**Lizenzen:** Nur Abhängigkeiten unter MIT/Apache-2.0/BSD/ISC; Schriften unter OFL; Texturen unter CC0. Erzeuge `THIRD-PARTY-LICENSES.md`.

### Schriften: keine Google Fonts
- **Kein einziger Request an Google** (fonts.googleapis.com, fonts.gstatic.com) und auch keine anderen Font-CDNs.
- Archivo von Omnibus-Type (offizielles GitHub-Repo), IBM Plex Mono von IBM (offizielles Repo/npm `@ibm/plex-mono`). Beide unter OFL.
- Als WOFF2 lokal unter `public/fonts/` bzw. über die Astro-Fonts-API mit **lokaler** Quelle. Subsetting (Latin + Latin-Ext), `font-display: swap`, Preload der zwei wichtigsten Schnitte. OFL-Lizenztext beilegen.

---

## 5. Design: extravagant, aber schnell und barrierefrei

**Anspruch:** Award-Niveau (Awwwards/CSSDA-Richtung), keine Template-Optik. Leitmotiv „Hinter der Wand": Oberflächen öffnen sich und geben den Blick auf Leitungen frei, durch die Strom (`#C5F01E`) fließt.

**Pflicht-Elemente:**
1. **3D-Hero (R3F):** Eine Wand im Querschnitt, die sich beim Scrollen schichtweise öffnet (Farbe → Putz → Mauerwerk → Leitungen → Dose). Eine leuchtende Leitung zieht sich als Linie durch die Seite und verbindet die Abschnitte, gesteuert per ScrollTrigger.
2. **Die 3 Säulen als Kundenreise:** Gepinnter, horizontal scrollender Abschnitt (Modernisieren → Elektrifizieren → Sicher betreiben) mit 3D-Objekten (Raum, Wallbox, Prüfgerät/Protokoll).
3. **Vorher/Hinter-der-Wand/Nachher-Slider:** Drei Zustände statt zwei.
4. **Tilt-Karten mit Tiefe** für Leistungen, magnetische Buttons, eigener Cursor auf Desktop (nicht auf Touch).
5. **Seitenübergänge** per View Transitions API mit Leitungs-Animation.
6. **Prozess „So läuft's ab"** in 4 Schritten (Anfrage → Vor-Ort-Termin → Angebot → Umsetzung aus einer Hand) als animierte Leitung mit Knotenpunkten.
7. Prominenter Einstieg in den **3D-Raumplaner** („Planen Sie Ihre Wohnung selbst – in 3D").

**Leitplanken:**
- **Performance-Budget:** LCP < 2,0 s, CLS < 0,05, INP < 200 ms auf Mittelklasse-Smartphone. JS auf Inhaltsseiten < 150 kB gz (ohne 3D-Chunk). 3D-Szenen erst laden, wenn sie in Sichtweite kommen. Vorher statisches, optimiertes Standbild (AVIF/WebP) als Poster.
- **Fallbacks:** Ohne WebGL, bei schwachen Geräten (z. B. `navigator.hardwareConcurrency`, FPS-Messung) und bei `prefers-reduced-motion`: statische bzw. ruhige Variante. Alle Inhalte müssen ohne 3D voll nutzbar sein.
- **Barrierefreiheit WCAG 2.2 AA** (ob das BFSG für RAUMSTROM als Kleinstunternehmen greift, ist offen; wir bauen trotzdem konform): Kontraste (Strom-Grün nie als Text auf Hell), Tastaturbedienung, Fokus sichtbar, Skip-Link, Alt-Texte, ARIA nur wo nötig, Animationen pausierbar, Formulare mit Labels und Fehlermeldungen. Seite „Barrierefreiheit" mit Erklärung und Feedback-Kontakt.
- Mobile-first. Die 3D-Effekte auf Mobile reduziert, aber vorhanden.

---

## 6. Seitenstruktur

```
/                                  Startseite
/fuer-zuhause/                     Eingang Privatkunden
/fuer-unternehmen/                 Eingang Unternehmen & Verwaltungen
/leistungen/                       Übersicht, darunter je eine Seite:
  komplettrenovierung/
  wohnung-bezugsfertig/            („Wohnung gekauft? Wir machen sie bezugsfertig")
  renovierung-mieterwechsel/       (für Vermieter/Hausverwaltungen)
  elektro-modernisierung/
  trockenbau/
  boden/
  waende-decken/                   (Putz, Malerarbeiten, Tapete)
  bad-fliesen/
  wallbox/
  ladepunkte-unternehmen/
  pruefservice-ladesaeulen/        (DGUV V3, Wartungsvertrag)
/raumplaner/                       3D-Raumplaner (Abschnitt 7)
/referenzen/                       Projekte (Platzhalter, bis echte da sind)
/ueber-uns/                        Team (Platzhalterfotos, Abschnitt 11)
/partner/                          Für Makler, Hausverwaltungen & Partnerbetriebe
/ratgeber/                         SEO-Fachartikel (Markdown-Collection)
/region/<ort>/                     Regionale Seiten (Abschnitt 10)
/kontakt/                          Formular mit Foto-Upload, Einzugsgebiet
/impressum/  /datenschutz/  /agb/  /widerruf/  /cookie-einstellungen/  /barrierefreiheit/
/404
```
Jede Leistungsseite zeigt die Gewerke-Kennzeichnung aus der Matrix (Abschnitt 2), FAQ, Ablauf, CTA zum Raumplaner und zur Anfrage.

---

## 7. Der 3D-Raumplaner (Kernfeature)

**Ziel:** Kunden laden einen ungefähren Grundriss hoch (JPG, PNG, WebP, HEIC, PDF), erhalten ein 3D-Modell und gestalten ihre Wohnung bzw. ihr Haus selbst, so intuitiv wie in „Die Sims". Am Ende senden sie das Ergebnis mit ihren Kontaktdaten an RAUMSTROM.

**Rechtlicher Hinweis im Tool:** Visualisierung, unverbindlich, Maße ohne Gewähr, kein Angebot.

### 7.1 Ablauf
1. **Upload:** Datei wird **im Browser** verarbeitet. PDF über pdf.js gerendert (Seitenauswahl bei mehrseitigen PDFs), HEIC konvertiert, EXIF/Metadaten entfernt. Max. 20 MB. Alternativ: „Ohne Grundriss starten" (leeres Raster) oder Vorlagen (1-Zimmer, 2-Zimmer, 3-Zimmer, EFH-Erdgeschoss).
2. **Maßstab kalibrieren:** Kunde markiert eine bekannte Strecke (z. B. Maßkette oder Türbreite 88,5 cm) und gibt die Länge ein.
3. **Wände erfassen, zwei Modi:**
   - **Modus A, Standard, funktioniert immer ohne KI:** Grundriss liegt halbtransparent unter einem Raster. Kunde zeichnet Wände per Klick nach. Einrasten bei 90°/45°, magnetisches Andocken an Wandenden, Längen numerisch editierbar, Wandstärke (innen/außen) wählbar. Geschlossene Räume werden automatisch erkannt und benannt (Wohnzimmer, Bad …). Türen und Fenster per Drag & Drop in Wände setzen.
   - **Modus B, Feature-Flag `FLOORPLAN_AI=false` (standardmäßig aus):** Nach ausdrücklicher Einwilligung im Tool (Checkbox mit Datenschutz-Hinweis) wird das Bild an `/api/floorplan/analyze` gesendet. Der Server schickt es an die **Mistral-API über den EU-Endpunkt** (`api.eu.mistral.ai`, aktuelles Vision-Modell mit strukturierter JSON-Ausgabe prüfen) und erhält Wände, Türen, Fenster und Räume als JSON-Schema. Das Ergebnis wird als **Vorschlag** in Modus A geladen und vom Kunden korrigiert. Server speichert nichts. Timeout und sauberer Fallback auf Modus A. Die Aktivierung erfolgt erst, wenn der Betreiber einen AVV mit Mistral hat. Das steht in der Launch-Checkliste.
4. **3D-Generierung:** Wände extrudieren (Standardhöhe 2,50 m, pro Raum änderbar), Öffnungen per CSG, Böden und Decken pro Raum, Sockelleisten.
5. **Gestalten** (Abschnitt 7.2).
6. **Absenden** (Abschnitt 7.4).

### 7.2 Gestaltungsmodi (Sims-artige Werkzeugleiste)
Modi: **Bauen · Elektro · Wände · Boden · Fliesen · Decke · Türen & Fenster · Einrichtung · Ansicht**. Jeder Modus hat eine visuelle Kachel-Auswahl mit Vorschau. Alles ist pro Wand, pro Fläche oder pro Raum anwendbar, mit Pipette (Material übernehmen) und Undo/Redo.

- **Elektro** (Herzstück, passt zur Marke):
  - Steckdosen: einfach, 2-fach, 3-fach, mit USB-A/C, Außensteckdose IP44, Herdanschluss 400 V, Waschmaschine/Trockner, Bodensteckdose
  - Schalter: Aus-, Wechsel-, Kreuzschalter, Taster, Dimmer, Smart-Schalter, Bewegungsmelder
  - Daten/Medien: LAN-Dose Cat.7 (1-/2-fach), TV/SAT, Glasfaser-Anschluss, WLAN-Access-Point, Einbaulautsprecher
  - Licht: Deckenauslass, Einbauspots, Wandleuchte, LED-Streifen/Lichtvoute, Außenleuchte
  - Sonstiges: Rauchwarnmelder, Raumthermostat, Klingel/Sprechanlage (nur Audio, keine Kameras), Wallbox-Vorbereitung, Unterverteilung
  - Einrasten an Wänden mit Standardhöhen (z. B. Schalter 1,05 m, Steckdosen 0,30 m, Küche über Arbeitsplatte 1,15 m), editierbar
  - **Overlay „Installationszonen"** nach DIN 18015-3: zeigt, wo Leitungen in der Wand verlaufen dürfen. Das ist „Hinter der Wand" als Feature.
  - Automatische **Elektro-Stückliste** pro Raum
- **Wände:** Farbe (Farbrad + kuratierte Paletten mit eigenen Farbnamen, keine geschützten Farbsystem-Namen), Tapete (Raufaser, Vlies glatt, Strukturvlies, Glasfaser, Mustertapete in mehreren Designs), Putz (Glattputz Q3/Q4, Rauputz, Kalkputz, Lehmputz, Spachteltechnik/Betonoptik, Mikrozement), Akzentwand, Wand- und Akustikpaneele, Holzverkleidung, Trockenbau-Elemente (Vorsatzschale, Nische, Raumteiler)
- **Boden:** Designboden/Vinyl, Laminat, Parkett (Landhausdiele, Fischgrät, Chevron), Fliese, Teppich, Mikrozement. Verlegemuster und -richtung, Farbe/Holzton, Fugen, Sockelleisten-Stil
- **Fliesen** (Bad, Küche, Boden): Formate (30×60, 60×60, 60×120, 120×120, 7,5×15 Metro, Hexagon, Mosaik, Zellige-Optik), Muster (Halbverband, Drittelverband, Kreuzfuge, Diagonal, Fischgrät, Chevron, vertikal gestapelt), Oberfläche (matt, glänzend, Marmor-, Beton-, Holz-, Terrazzo-Optik), Fugenfarbe und -breite, Fliesenhöhe (raumhoch, halbhoch, Spritzschutz)
- **Decke:** Farbe, abgehängte Decke, Lichtvoute, Stuckleiste
- **Türen & Fenster:** Türblatt-Stil und -Farbe, Zarge, Glasausschnitt, Schiebetür, Fensterbank-Material
- **Einrichtung** (nur zur Visualisierung, klar so gekennzeichnet): einfache, stilisierte Low-Poly-Möbel (Sofa, Bett, Tisch, Küchenzeile, Waschtisch, WC, Dusche, Wanne, Schrank)
- **Ansicht:** Orbit, Draufsicht 2D, Rundgang in Ich-Perspektive (WASD + Touch-Joystick), Tageszeit/Licht, Wände ausblenden, Maße einblenden, Screenshot

**Texturen:** CC0-Materialien (z. B. ambientCG, Poly Haven), selbst gehostet, als KTX2/Basis komprimiert, Mipmaps, Lazy Loading pro Kategorie. Kein Hotlinking.

### 7.3 Stil-Vorlagen & Trends („Ideenlos? Lassen Sie sich inspirieren")
- **Stilpakete** als JSON in `src/content/trends/` (Keystatic-editierbar), z. B. „Japandi", „Modern Warm Minimal", „Skandinavisch hell", „Industrial Loft", „Landhaus modern", „Dark & Moody", „Hotelbad", „Mid-Century". Jedes Paket enthält Wandfarben, Putz/Tapete, Boden, Fliesen, Deckenlicht und einen Elektro-Vorschlag (z. B. „Komfort-Paket": mehr Steckdosen mit USB-C, LAN in jedem Raum, dimmbare Spots).
- Ein Klick wendet das Paket auf einen Raum oder die ganze Wohnung an. Danach ist alles einzeln änderbar.
- Felder `gueltig_ab`, `saison`, `trend_quelle_notiz`, `aktiv`. Die Website zeigt „Trends 2026/27" automatisch nach Datum.
- **Aktualität:** (a) Betreiber pflegt Pakete per Keystatic. (b) Der Betreiber richtet eine **monatliche geplante Aufgabe** ein: Sie öffnet das Repo `Tash52/raumstrom-website`, recherchiert Trends und legt neue bzw. aktualisierte Pakete als **Pull Request zur Freigabe** an. Damit das funktioniert: Stilpakete exakt unter `src/content/trends/*.json` ablegen, ein JSON-Schema `src/content/trends/_schema.json` bereitstellen und in `docs/TREND-UPDATE.md` die Feldbedeutungen erklären. Den `trend-researcher`-Agenten so anlegen, dass die Routine ihn nutzen kann. Nie automatisch veröffentlichen. Keine geschützten Marken- oder Farbsystem-Namen übernehmen, Farben neutral benennen.

### 7.4 Absenden
- **Formular im Planer:** Name*, E-Mail*, Telefon (optional), PLZ/Ort des Objekts*, Objektart (Wohnung/Haus/Gewerbe), gewünschter Zeitraum (optional), **Nachricht (optional, Freitext)**, Hinweis auf Datenschutzerklärung (Verarbeitung zur Anfragebearbeitung, Art. 6 Abs. 1 lit. b DSGVO), ALTCHA.
- **Vor dem Senden:** Zusammenfassung zeigen (was wird übertragen?) mit Button „Absenden".
- **Client erzeugt:**
  1. **GLB** des Modells (komprimiert, z. B. meshopt, ohne hochauflösende Texturen. Materialien als IDs, damit RAUMSTROM sie im eigenen Viewer wieder anwendet)
  2. **4 Renderbilder** als PNG/WebP (Iso-Ansicht, Draufsicht, 2 Raumperspektiven)
  3. **PDF-Zusammenfassung:** Raumliste mit Flächen, gewählte Materialien je Raum, Elektro-Stückliste je Raum, Grundriss mit Elektro-Symbolen, Kundennachricht
  4. **Projekt-JSON** (versioniertes Schema, wieder einlesbar)
- **Server (`/api/planner/submit`):** Same-Origin-/CSRF-Prüfung, ALTCHA-Verifikation, Rate-Limit, zod-Validierung, Größenlimit gesamt 25 MB, MIME-Prüfung anhand der Datei-Signatur (nicht der Endung), Bilder serverseitig neu kodieren (sharp), GLB/JSON strukturell validieren. Mail per SMTP/TLS an die RAUMSTROM-Adresse aus der Konfiguration: Kundendaten im Mailtext, Anhänge GLB, Bilder, PDF, JSON. Danach temporäre Dateien sofort löschen. Keine Datenbank, keine Speicherung, Logs ohne personenbezogene Daten.
- **Eingangsbestätigung an den Kunden** (nur PDF-Zusammenfassung, keine Werbung).
- **Interner Viewer** `/planer/ansehen` (noindex, nicht verlinkt): RAUMSTROM zieht die JSON/GLB-Datei per Drag & Drop hinein und sieht das Kundenmodell in 3D mit Original-Materialien. Läuft komplett lokal im Browser, kein Upload.
- **Entwurf speichern:** Nur nach aktivem Klick auf „Entwurf auf diesem Gerät speichern" in localStorage (vom Nutzer ausdrücklich gewünschte Funktion). Kein automatisches Speichern ohne Zustimmung. Button „Entwurf löschen". Zusätzlich Export/Import als Datei.

### 7.5 Technische Qualität des Planers
- Eigener Code-Split-Chunk, nur auf `/raumplaner/` geladen. Ladeanzeige mit Fortschritt.
- 60 fps auf Mittelklasse-Laptop bei einer 4-Zimmer-Wohnung, auf Mobile reduzierte Qualität (Schatten, Auflösung).
- Bedienung per Maus, Touch und Tastatur. Onboarding-Tour beim ersten Start (überspringbar).
- Unit-Tests für Geometrie (Raumerkennung, Flächenberechnung, Snapping), E2E-Test des gesamten Flows mit Playwright inklusive Mail-Versand gegen einen lokalen SMTP-Testserver (z. B. Mailpit).

---

## 8. Sicherheit (höchster Standard)

**Ziel:** OWASP Top 10 (aktuelle Version) abgedeckt, Orientierung an **OWASP ASVS Level 2**, keine Drittanbieter-Requests.

- **Keine externen Ressourcen:** keine CDNs, keine Google-Dienste (Fonts, Maps, reCAPTCHA, Analytics), keine eingebetteten YouTube-/Maps-iframes. Einzugsgebiet als eigene SVG-Karte. Ein Playwright-Test schlägt fehl, sobald ein Request an eine fremde Domain geht.
- **Security-Header** (serverseitig gesetzt, zusätzlich Astro-CSP):
  - `Content-Security-Policy` streng: `default-src 'self'`, Skripte/Styles nur per Hash (Astro `security.csp`), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `worker-src 'self' blob:` nur falls für pdf.js/Draco nötig, `upgrade-insecure-requests`
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains` (Preload erst nach Launch-Test)
  - `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` restriktiv (Kamera, Mikrofon, Geolocation, Payment usw. aus), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-origin`
- **API-Härtung:** Nur POST mit `Content-Type`-Prüfung, Origin-Check, CSRF-Token, Body-Size-Limits, Rate-Limiting pro IP (im Speicher, IP nicht loggen), ALTCHA mit Replay-Schutz, zod-Validierung, generische Fehlermeldungen ohne Stacktraces, Timeouts.
- **Uploads:** Signaturprüfung, Re-Encoding, keine SVG-Uploads, Dateinamen serverseitig neu vergeben, nur temporäres Verzeichnis außerhalb des Webroots, sofort löschen.
- **Mail-Injection verhindern:** Header-Felder nie aus Nutzereingaben ohne Bereinigung. Absender immer die eigene Domain, Kunde nur als `Reply-To`.
- **Secrets** nur in Umgebungsvariablen. `.env.example` mit Platzhaltern, `.env` in `.gitignore`. Startprüfung: Fehlt ein Pflicht-Secret, startet die App nicht (fail-secure).
- **Keystatic-Admin darf nicht öffentlich sein:** Integration nur im Entwicklungsmodus aktiv. Test: `/keystatic` und `/api/keystatic` liefern im Produktions-Build 404.
- **Abhängigkeiten:** Minimal halten, Versionen gepinnt, Lockfile committen, `npm audit` ohne High/Critical, Renovate- oder Dependabot-Konfiguration, Trail-of-Bits-`supply-chain-risk-auditor` laufen lassen.
- **Container:** Non-root-User, read-only Dateisystem (außer tmp), keine Dev-Dependencies im Image, Healthcheck.
- **`/.well-known/security.txt`** mit Kontakt (Platzhalter).
- **Prüfungen vor Abschluss:** Semgrep/Trail-of-Bits-Audit, OWASP ZAP Baseline-Scan (Docker) gegen den lokalen Produktions-Build, Header-Check (Ziel: Mozilla Observatory A+). Ergebnisse in `docs/SECURITY-REPORT.md`.

---

## 9. Datenschutz, Cookies & Rechtstexte

**Grundsatz:** Datensparsamkeit by Design. Die rechtlich sauberste Lösung ist, **gar keine einwilligungspflichtigen Cookies oder Tracker** zu verwenden. Dann ist nach § 25 Abs. 2 TDDDG kein Cookie-Banner nötig.

- **Cookies:** In v1 keine Cookies außer technisch zwingend notwendigen (falls überhaupt: CSRF, ALTCHA ohne Cookie-Modus). Seite `/cookie-einstellungen/` listet transparent, was gespeichert wird (z. B. Planer-Entwurf in localStorage nur auf Klick).
- **Vorbereiteter Consent-Manager:** Eigene, schlanke Komponente ohne Drittanbieter, standardmäßig **deaktiviert**. Wird nur aktiv, wenn später etwas Einwilligungspflichtiges hinzukommt (z. B. Analyse). Anforderungen dann: „Alle ablehnen" gleichwertig zu „Alle akzeptieren" auf erster Ebene, granular, vor Einwilligung wird nichts geladen, Widerruf jederzeit über Footer-Link, Einwilligung protokolliert.
- **Kein Analytics in v1.** In `docs/` dokumentieren, wie man später datenschutzfreundliche, selbst gehostete Analyse ergänzt und was rechtlich dann zu beachten ist.
- **Impressum (§ 5 DDG, § 18 Abs. 2 MStV):** Struktur mit Platzhaltern aus `src/content/settings/firma.yaml`:
  - Rechtsform (z. B. GbR → Name der Gesellschaft **und** vollständige Namen beider Gesellschafter, vertretungsberechtigt), ladungsfähige Anschrift (kein Postfach), Telefon, E-Mail
  - USt-IdNr. (falls vorhanden), **Wirtschafts-Identifikationsnummer** (falls zugeteilt; wird laut Handwerkspresse ab Dezember 2026 Pflicht)
  - Handwerkskammer (HWK für Unterfranken), Eintragung Handwerksrolle/Verzeichnis (falls vorhanden), Berufsbezeichnung und Staat der Verleihung, berufsrechtliche Regelungen (HwO) mit Link
  - Angaben zur Betriebs-/Berufshaftpflicht (Versicherer, Geltungsraum), soweit nach DL-InfoV erforderlich
  - Verantwortlicher für redaktionelle Inhalte (Ratgeber) nach § 18 Abs. 2 MStV
  - Verbraucherstreitbeilegung nach § 36 VSBG (z. B. „Wir sind nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.")
  - **Kein Link und kein Hinweis auf die EU-OS-Plattform.** Die Plattform wurde am 20.07.2025 abgeschaltet, ein Verweis darauf ist selbst abmahnfähig.
- **Datenschutzerklärung** (Entwurf, vollständig): Verantwortliche, Hosting und Server-Logfiles (Speicherdauer, AVV mit Hoster), Kontaktformular und Raumplaner (Zwecke, Rechtsgrundlagen, Speicherdauer), Datei-Uploads, optionale KI-Analyse über Mistral AI (EU, eigene Einwilligung, nur wenn Flag aktiv), E-Mail-Versand (SMTP-Anbieter), ALTCHA, lokale Speicherung im Browser, keine Cookies/kein Tracking, keine automatisierte Entscheidungsfindung, Betroffenenrechte, Beschwerderecht beim **BayLDA** (Bayerisches Landesamt für Datenschutzaufsicht), Stand-Datum.
- **AGB** (Entwurf, B2C und B2B getrennt kenntlich): Geltungsbereich, Angebote/Kostenvoranschläge (Hinweis auf § 649 BGB bei Überschreitung), Vertragsschluss, Preise (für Verbraucher Gesamtpreise inkl. USt), Abschlagszahlungen (§ 632a BGB, bei Verbraucherbauverträgen § 650m BGB), **Einsatz von Partner-/Nachunternehmern (transparent!)**, Mitwirkungspflichten, Abnahme, Gewährleistung (bei Verbrauchern keine unzulässige Verkürzung), Haftung (keine Beschränkung bei Leben/Körper/Gesundheit, Vorsatz, grober Fahrlässigkeit), Eigentumsvorbehalt, Gerichtsstand nur B2B, Hinweis auf Widerrufsrecht.
- **Widerrufsbelehrung + Muster-Widerrufsformular** (`/widerruf/`): Verträge mit Verbrauchern werden oft beim Kunden vor Ort oder per E-Mail geschlossen (außerhalb von Geschäftsräumen bzw. Fernabsatz). Dann besteht ein 14-tägiges Widerrufsrecht. Belehrung inkl. Hinweis auf vorzeitigen Arbeitsbeginn auf ausdrücklichen Wunsch und Wertersatz.
- **KI-Hinweis:** Nur dort, wo KI eingesetzt wird (optionale Grundriss-Analyse), klar im Tool kennzeichnen. Keine KI-generierten fotorealistischen Bilder als echte Projekte ausgeben (UWG; Transparenzpflichten Art. 50 EU AI Act gelten seit 02.08.2026).
- **Bildrechte:** Nur eigene Fotos oder CC0/selbst erstellte Grafiken. Keine Stockfotos mit erkennbaren Personen.
- **Alle Rechtstexte als Markdown in `src/content/legal/`**, jeweils mit Kopfvermerk:
  `<!-- ENTWURF – vor Veröffentlichung durch Rechtstexte-Service mit Abmahnschutz oder Anwalt prüfen lassen -->`
  Der Launch-Check (Abschnitt 11) erinnert daran.

---

## 10. SEO (lokal + technisch)

**Ehrlicher Rahmen:** Platz 1 kann niemand garantieren. Wir bauen die technisch und inhaltlich beste Grundlage. Ranking entsteht über Monate durch Inhalte, Google-Unternehmensprofil und echte Bewertungen.

- **Technik:** Statisches HTML, semantisch korrekt (eine H1 pro Seite, Überschriftenhierarchie), individuelle `<title>` (≤ 60 Zeichen) und Meta-Descriptions (≤ 155), Canonicals, `sitemap.xml` (@astrojs/sitemap), `robots.txt`, Open-Graph-Bilder (selbst generiert im Markendesign), sprechende URLs, Breadcrumbs, interne Verlinkung zwischen Leistungen, Ratgeber und Regionen, 404 mit Navigation, Bilder über `astro:assets` (AVIF/WebP, Größenangaben, Lazy Loading).
- **Strukturierte Daten (JSON-LD):** `HomeAndConstructionBusiness` mit `areaServed` (Liste der Orte), `Service` pro Leistung, `FAQPage`, `BreadcrumbList`, `Organization` mit Logo. **Keine** Schema-Typen oder Angaben, die eine nicht vorhandene Qualifikation behaupten. Validierung mit dem claude-seo-Skill.
- **Keyword-Cluster** (als Grundlage für Texte, natürlich formuliert, kein Keyword-Stuffing): Wohnung renovieren Schweinfurt · Renovierung Schweinfurt · Komplettrenovierung Wohnung · Wohnung sanieren Altbau · Renovierung nach Mieterwechsel · Wohnung bezugsfertig machen · Elektroinstallation Altbau erneuern · Steckdosen nachrüsten · Trockenbau Schweinfurt · Vinylboden verlegen lassen · Badrenovierung Schweinfurt · Wände spachteln und streichen · Wallbox installieren Schweinfurt · Wallbox Förderung/Anmeldung Netzbetreiber · Ladesäule prüfen lassen · DGUV V3 Prüfung Wallbox · Ladepunkte Firmenparkplatz
- **Regionale Seiten** für Orte, die tatsächlich bedient werden (Startliste als Platzhalter in `firma.yaml`, z. B. Schweinfurt, Gochsheim, Grafenrheinfeld, Bergrheinfeld, Niederwerrn, Werneck, Haßfurt, Gerolzhofen, Bad Kissingen). **Jede mit individuellem Inhalt** (Besonderheiten Bausubstanz, Anfahrt, ggf. Referenz vor Ort). Keine austauschbaren Doorway-Pages. Seiten ohne eigenen Inhalt werden nicht generiert.
- **Ratgeber:** 6 Startartikel als Entwürfe mit echtem Fachwissen (E-E-A-T), z. B. „Was hinter der Wand im Altbau steckt", „Installationszonen nach DIN 18015-3 einfach erklärt", „Wohnung gekauft – Renovierungsreihenfolge", „Wallbox anmelden: Was Netzbetreiber verlangen", „DGUV V3: Wie oft müssen Ladepunkte geprüft werden?", „Vinyl, Laminat oder Parkett?". Fakten vorher recherchieren und Quellen in einem Kommentar im Markdown vermerken.
- **AI-Search/GEO:** Klare FAQ-Blöcke, präzise Antworten am Abschnittsanfang, optional `llms.txt`.
- **Doku für den Betreiber** (`docs/SEO-START.md`): Google-Unternehmensprofil und Bing Places anlegen, NAP (Name/Adresse/Telefon) überall identisch, Google Search Console verifizieren (DNS-Methode, kein Tracking-Code nötig), Bewertungen nach jedem Projekt einholen, Fotos hochladen.

---

## 11. Bearbeitbarkeit vor dem Launch (ohne Claude-Tokens)

Der Betreiber hat noch **keine Teamfotos** und **keine Impressumsdaten**. Alles muss trotzdem fertig eingebaut sein und sich **ohne Code und ohne KI** ergänzen lassen.

1. **Zentrale Konfiguration** `src/content/settings/firma.yaml`: Firmenname, Rechtsform, Gesellschafter, Adresse, Telefon, E-Mail(s), Empfängeradresse für Anfragen, USt-IdNr., W-IdNr., HWK-Angaben, Versicherung, Einzugsgebiet/Orte, Öffnungs-/Erreichbarkeitszeiten, Social-Media-Links, Domain. Impressum, Footer, Kontakt, Schema.org und Mails lesen **nur** von hier.
2. **Feature-Flags** `src/content/settings/features.yaml`: `floorplan_ai`, `bewertungen_anzeigen`, `referenzen_anzeigen`, `ratgeber_anzeigen`, `consent_manager`.
3. **Team** `src/content/team/*.yaml` (Name, Rolle, Kurztext, Foto optional). Ohne Foto erscheint eine hochwertige Blueprint-Illustration im Markendesign, sodass die Seite auch ohne Fotos launchfähig aussieht. Fotos einfach in `src/assets/team/` legen bzw. per Keystatic hochladen.
4. **Alle Texte** (Seiten, Leistungen, FAQ, Ratgeber, Referenzen, Trends, Rechtstexte) als Markdown/YAML in `src/content/`, alle in **Keystatic** als Formulare abgebildet.
5. **Platzhalter-Konvention:** Jeder fehlende Wert ist `[[PLATZHALTER: Beschreibung]]`.
6. **Launch-Check** `npm run check:launch`: listet alle Platzhalter, Rechtstext-Entwurfsvermerke, `hinweis_hwk_geprueft: false`, fehlende SMTP-Variablen und schlägt fehl, solange etwas offen ist. Der Produktions-Build ruft ihn auf, Override nur mit `--allow-placeholders` für Staging.
7. **`docs/ANLEITUNG-BEARBEITEN.md`** auf Deutsch, für Nicht-Programmierer, mit Screenshots: Projekt starten (`npm run dev`), Keystatic öffnen (`http://localhost:4321/keystatic`), Texte und Bilder ändern, Gewerke-Matrix umstellen, Trendpakete pflegen, Änderungen speichern und veröffentlichen.
8. **`PLATZHALTER.md`** im Projektstamm: Checkliste aller offenen Inhalte, gruppiert (Rechtliches, Fotos, Kontaktdaten, Texte).

---

## 12. Definition of Done

- [ ] Lighthouse (Mobile) auf allen Inhaltsseiten: Performance ≥ 90, Accessibility 100, Best Practices 100, SEO 100. Raumplaner-Seite: Performance ≥ 70, Accessibility ≥ 95.
- [ ] axe-core: 0 Verstöße (WCAG 2.2 AA) auf allen Seiten
- [ ] 0 Requests an fremde Domains (automatisierter Test)
- [ ] Security-Header vollständig. ZAP-Baseline ohne High/Medium, `npm audit` ohne High/Critical
- [ ] `/keystatic` im Produktions-Build nicht erreichbar
- [ ] E2E: Kontaktformular und kompletter Raumplaner-Flow inkl. Mail mit allen Anhängen (gegen Mailpit)
- [ ] Ohne WebGL und mit `prefers-reduced-motion` voll bedienbar
- [ ] Alle Wording-Regeln eingehalten (automatischer Textscan auf verbotene Begriffe wie „Meister" außerhalb von „Meister-Partnerbetrieb", „Sicherheitstechnik" usw.)
- [ ] Docs vollständig: `CLAUDE.md`, `ANLEITUNG-BEARBEITEN.md`, `PLATZHALTER.md`, `SEO-START.md`, `SECURITY-REPORT.md`, `SKILL-AUDIT.md`, `TREND-UPDATE.md`, `DEPLOYMENT.md`, `LAUNCH-CHECKLISTE.md`, `THIRD-PARTY-LICENSES.md`

---

## 13. Launch-Checkliste für den Betreiber (`docs/LAUNCH-CHECKLISTE.md`)

1. Domain sichern (z. B. raumstrom.de, Verfügbarkeit prüfen), vorher Marken- und Namensrecherche (DPMA, Handelsregister, Google Maps)
2. Rechtsform klären, Gewerbe anmelden, HWK: Eintragungen und **Prüfung der Werbeformulierungen** (Gewerke-Matrix)
3. Hoster (deutscher Managed-Node-Hoster) buchen, AVV abschließen
4. SMTP-Postfach einrichten, DNS: **SPF, DKIM, DMARC** setzen (sonst landen Anfragen im Spam)
5. Impressumsdaten, Teamfotos, Referenzfotos per Keystatic eintragen
6. **Rechtstexte** (Impressum, Datenschutz, AGB, Widerruf) durch einen Rechtstexte-Service mit Abmahnschutz und Update-Service oder einen Anwalt prüfen bzw. ersetzen lassen. Hinweis: Mitglieder der Handwerkskammer erhalten dort oft Muster-AGB.
7. Optional KI-Grundriss-Erkennung: Mistral-Konto, AVV, API-Key setzen, Flag aktivieren, Datenschutzerklärung-Abschnitt einblenden
8. `npm run check:launch` grün, Deployment, HTTPS prüfen, HSTS-Preload erwägen
9. Google-Unternehmensprofil, Search Console, Bing Places

---

## 14. Vorgeschlagene Phasen (im Plan-Modus verfeinern)

| Phase | Inhalt | Agenten (∥ = parallel) | Abnahme durch |
|---|---|---|---|
| 0 | Skill-/Plugin-Audit (Abschnitt 3) → `SKILL-AUDIT.md` → **Freigabe durch Betreiber** → Installation → Agenten-Dateien anlegen (Abschnitt 0A) | `skill-auditor`, danach du (Agenten-Dateien) | Betreiber |
| 1 | Projekt-Setup, Repo, `CLAUDE.md`, Schemas, Configs, Keystatic (dev-only), Launch-Check ∥ Design-Tokens, Schriften lokal, Logo-SVGs, Layout | `architect` → dann `design-system` | `qa-verifier` |
| 2 | Seiteninhalte ∥ Rechtstexte + Gewerke-Kennzeichnung → danach Seiten bauen, Kontaktformular-UI | `content-writer` ∥ `legal-compliance` → `page-builder` | `qa-verifier`, `a11y-perf-tester` |
| 3 | 3D-Hero, Scroll-Inszenierung, Säulen-Journey, Slider, Mikro-Interaktionen, Fallbacks | `motion-3d` | `a11y-perf-tester`, `qa-verifier` |
| 4 | Raumplaner: Upload, Kalibrierung, Modus A, 3D-Generierung | `planner-geometry` | `qa-verifier` |
| 5 | Raumplaner: Gestaltungsmodi, Elektro inkl. Installationszonen, Texturen ∥ Stilpakete (Inhalte) | `planner-design` ∥ `trend-researcher` | `a11y-perf-tester`, `qa-verifier` |
| 6 | Raumplaner-Export und interner Viewer ∥ API, Mail, ALTCHA, Uploads, optional Modus B (Mistral) hinter Flag, Docker | `planner-export` ∥ `backend-api` | `security-auditor`, `qa-verifier` (E2E mit Mailpit) |
| 7 | SEO: Schema, Sitemap, Regionen, OG-Bilder ∥ Ratgeber-Entwürfe | `seo-specialist` ∥ `content-writer` | `qa-verifier` |
| 8 | Security-Gesamtaudit (ZAP, Semgrep, Supply-Chain, Header) → Fixes durch die jeweils bauenden Agenten → Re-Audit | `security-auditor` → Fix-Agenten → `security-auditor` | `security-auditor` |
| 9 | Betreiber-Dokus, Abschlussprüfung gegen Definition of Done | `docs-writer` → `qa-verifier` | `qa-verifier`, dann Betreiber |

**Jetzt:** Plan erstellen (inkl. konkreter Agenten-Briefings für Phase 0 und 1), offene Fragen sammeln, auf Freigabe warten.
