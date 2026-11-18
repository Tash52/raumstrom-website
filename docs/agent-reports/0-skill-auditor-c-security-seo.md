# Skill-Audit Teil C: Trail of Bits (Security) und claude-seo

Prüfer: `skill-auditor` (Teil C), Phase 0. Grundlage: BRIEFING Abschnitt 3 (Prüfverfahren) und 0A Regeln 6/7.
Methode: flache Klone (`git clone --depth 1`) im Scratchpad, **nichts ausgeführt** (kein npm/pip/uv/Python/Hook aus den Klonen). Gelesen mit Read/Grep/sed/wc.
Kennzeichnung: **[belegt]** = gelesen, mit `Datei:Zeile`. **[Vermutung]** = nicht im Repo oder in der Umgebung nachgewiesen.
Klonpfade (für Stichproben): `/tmp/claude-0/-home-user/4de6bfe2-8089-5731-8e90-77052bdcc979/scratchpad/skill-audit/tob` und `.../skill-audit/seo`.

## 1. Repo-Steckbriefe

| | trailofbits/skills | AgriciDaniel/claude-seo |
|---|---|---|
| Commit (HEAD) | `149d7b21f4067765b82e67029730b42d228ef4b4` | `468ed5b0d9e3249394783710e54abb02837e326b` |
| Letzter Commit | 2026-11-12 12:48:47 -0500 („Add Trailmark taint-trace skill …“) | 2026-11-15 11:53:01 +0200 („test: runtime and certifi tests pass on Windows“) |
| Dateien (git ls-files) | 1660 | 575 |
| Lizenz | **CC BY-SA 4.0** (`LICENSE:1`, `LICENSE:57-58`, `README.md:167`) | **MIT** (`LICENSE:1-21`, Copyright 2026 agricidaniel); jeder Skill hat `LICENSE.txt` mit Verweis auf die Root-Lizenz |
| Stars / Forks / Contributors | aus dieser Umgebung nicht abrufbar (api.github.com: HTTP 403); Contributor-Zahl wegen `--depth 1` nicht aus git ermittelbar | aus dieser Umgebung nicht abrufbar (HTTP 403); ebenso |
| Plugin-Version | insecure-defaults 2.0.3, static-analysis 1.5.1, supply-chain-risk-auditor 2.0.4 (`.claude-plugin/marketplace.json:220-364`) | claude-seo 2.6.2 (`.claude-plugin/plugin.json:3`) |

## 2. Ergebnistabelle

| Name | Quelle (Repo + Pfad) | Commit | Lizenz | Befund (kurz) | Empfehlung |
|---|---|---|---|---|---|
| `insecure-defaults` | trailofbits/skills `plugins/insecure-defaults/` | 149d7b2 | CC BY-SA 4.0 | **Kein Skill** (keine SKILL.md), sondern Slash-Command + Workflow-Skript, das 8+ Subagenten (Sonnet/Opus) startet. Inhalte harmlos: keine Netzwerkzugriffe, keine Hooks. | **Mit Einschränkung:** nur `references/` (Prüfkorpus) als eigener Skill mit selbst geschriebener SKILL.md, Workflow nicht übernehmen |
| `semgrep` (aus `static-analysis`) | `plugins/static-analysis/skills/semgrep/` | 149d7b2 | CC BY-SA 4.0 | Sauber. `--metrics=off` im Skript erzwungen. Braucht semgrep, jq, uv. semgrep.dev-Registry hier gesperrt → nur per git geklonte Regel-Repos nutzbar | **Mit Einschränkung** als Kopie (Ausgabeordner, Freigabe-Gate, Regel-Repos anpassen) |
| `codeql` (aus `static-analysis`) | `plugins/static-analysis/skills/codeql/` | 149d7b2 | CC BY-SA 4.0 | Braucht `codeql`-Binary (nicht vorhanden, GitHub-Releases gesperrt, gh nicht angemeldet); Build-Fixes führen `pip/npm install` im Zielprojekt aus | **Ablehnen** (vorerst) |
| `sarif-parsing` (aus `static-analysis`) | `plugins/static-analysis/skills/sarif-parsing/` | 149d7b2 | CC BY-SA 4.0 | Harmloses Nachschlagewerk; für uns nicht nötig, `merge_sarif.py` reicht | Nicht übernehmen (optional) |
| `supply-chain-risk-auditor` | `plugins/supply-chain-risk-auditor/skills/supply-chain-risk-auditor/` | 149d7b2 | CC BY-SA 4.0 | Python nur mit Standardbibliothek, liest nur Manifeste/Lockfiles, installiert nichts. Sendet Paketnamen/-versionen an OSV, deps.dev, Scorecard, npm, PyPI, GitHub; liest `gh auth token`. Kern-Hosts hier gesperrt | **Mit Einschränkung:** erst nutzbar nach Freigabe der Hosts durch den Betreiber (Regel 7); bis dahin `npm audit` |
| `seo` (Orchestrator) | AgriciDaniel/claude-seo `skills/seo/` | 468ed5b | MIT | Hängt an Launcher-Skripten, Python-venv, Chromium, 20 Subagenten und 28 Sub-Skills. **Werbe-Footer** mit skool.com-Links in Berichten | **Ablehnen** (nur Quality Gates/Scoring in die Agentendefinition `seo-specialist` übernehmen) |
| `seo-local` | `skills/seo-local/` + `skills/seo/references/local-*.md` | 468ed5b | MIT | Reines Markdown, keine Skripte. Stark US-zentriert (BBB, Yelp, FTC, HIPAA). Statistiken aus Marketingquellen | **Übernehmen als Kopie** mit Anpassung (Pfade, DataForSEO/FLOW raus, DE-Verzeichnisse und UWG-Hinweis ergänzen) |
| `seo-schema` | `skills/seo-schema/` + `skills/seo/references/schema-types.md` | 468ed5b | MIT | Fast reines Markdown, ein optionaler Skriptaufruf. Gute Regeln gegen Fake-Reviews | **Übernehmen als Kopie** (kleine Anpassung) |
| `seo-technical` | `skills/seo-technical/` | 468ed5b | MIT | Checklisten brauchbar. Etwa 1/4 des Inhalts sind Skriptaufrufe (Python/Chromium) und Proxy-Konfiguration. CVE-Abschnitt nicht verifizierbar | **Mit Einschränkung** als gekürzte Kopie |

## 3. Trail of Bits: je Skill

### 3.1 insecure-defaults
**Vollständig gelesen:** `.claude-plugin/plugin.json` (10), `README.md` (104), `commands/audit.md` (35), `references/*.json` (6 Dateien, 73), `references/*.md` (6 Dateien, 424), `workflows/audit.js` (713), `tests/README.md` (93), `tests/run_seeds.sh` (18), `tests/seed-coverage.js` (193). **Teilweise:** `tests/harness.js` (1347; Z. 1-260 und Treiber 1270-1347 gelesen, Rest per grep geprüft).

Befunde [belegt]:
- Es gibt **keine SKILL.md**. Die Funktion ist der Command `/insecure-defaults:audit` (`commands/audit.md:1-35`, `allowed-tools: Bash Workflow` in Z. 4), der das Workflow-Skript `insecure-defaults:audit-pipeline` startet (`commands/audit.md:18-23`).
- Das Workflow-Skript startet 1 Recon-, 6 Sweep-, N Verify- und 1 Report-Agenten. Verify läuft mit **Opus**, der Rest mit Sonnet (`workflows/audit.js:31-36`, `181-199`, `253-304`, `496-568`, `635-691`). Das kollidiert mit BRIEFING 0A Regel 5 (keine Verschachtelung) und verursacht Kosten.
- Keine Netzwerkzugriffe, kein eval/base64 im Workflow. Die Agenten bekommen nur `grep -rE` und Lesezugriffe als Arbeitsanweisung (`audit.js:271`, `286-294`).
- `tests/harness.js:39-51` und `static-analysis/tests/*.js` nutzen `new Function(...)`, um das Workflow-Skript offline mit Stubs zu testen. Das ist Testcode, nicht Teil einer Kopie.
- Die Korpora (`references/*.md`) sind gut gemacht: Je Kategorie steht „Report when / Skip when“ mit verwundbaren und sicheren Beispielpaaren (z. B. `references/fallback-secrets.md:3-7`). Die Seeds sind POSIX-ERE und laufen mit jedem `grep -E`.

Voraussetzungen: Workflow-Tool von Claude Code (siehe Abschnitt 7), Agent-Tool.
Risiken: Ein `security-auditor` ohne Agent-Tool kann den Workflow nicht ausführen. Wird das Plugin installiert, entstehen unkontrollierte Subagenten.
Begründung: Der Wert liegt im Korpus, nicht in der Pipeline. **Empfehlung:** eigener Skill `.claude/skills/insecure-defaults/` mit selbst geschriebener, kurzer SKILL.md. Diese beschreibt die 4 Phasen (Recon → Grep-Sweep je Kategorie → Widerlegung in 5 Schritten nach `audit.js:539-563` → Bericht) **sequenziell im selben Agenten**. Dazu kommen `references/*.md` und `*.json` unverändert. Das ist eine Bearbeitung („Adapted Material“), daher Lizenzhinweis nach Abschnitt 5.

### 3.2 static-analysis → semgrep
**Vollständig gelesen:** `README.md` (107), `skills/semgrep/SKILL.md` (273), `references/rulesets.md` (162), `references/scan-modes.md` (172), `workflows/scan-workflow.md` (478), `scripts/run-scans.sh` (786), `scripts/merge_sarif.py` (339), `workflows/semgrep-scan.js` (529). **Nicht gelesen:** `scripts/test_merge_sarif.py`, `tests/*` (nur grep), `agents/openai.yaml` (6, Codex-Metadaten), `assets/*.svg`.

Befunde [belegt]:
- `allowed-tools: Bash Read Glob AskUserQuestion TaskCreate TaskList TaskUpdate` (`SKILL.md:14`). Das passt zum Zweck.
- Telemetrie wird abgeschaltet: `--metrics=off` steht fest im Skript (`run-scans.sh:8`, `551`) und als Pflicht im Text (`SKILL.md:23`).
- Netzwerk: semgrep-Registry `p/*` (semgrep.dev) und `git clone --depth 1` der Drittanbieter-Regel-Repos (`run-scans.sh:409`), **ungepinnt (HEAD)**. Laut `rulesets.md:124-139` sind die Drittanbieter-Regeln „NOT optional“: 12 Repos verschiedener Organisationen. Die URLs werden auf `https://` geprüft (`run-scans.sh:279-282`).
- `eval` in `run-scans.sh:352-355` (bash-3.2-Ersatz für `mapfile`). Der Name ist immer ein fester Literal-Bezeichner, der Wert wird escaped. Unbedenklich.
- Löschbefehle bleiben im Ausgabeordner: `rm -rf "$RAW_DIR"` (`run-scans.sh:387`), `rm -rf "$dest"` (`408`), `rm -rf "$OUTPUT_DIR/repos"` mit Leer-Guard (`scan-workflow.md:392`). Der Ausgabeordner darf nicht das Ziel sein (`run-scans.sh:244-245`).
- **Standard-Ausgabeordner ist `./static_analysis_semgrep_N` im aktuellen Verzeichnis** (`SKILL.md:49-66`), also im Projekt. Für den `security-auditor` muss ein Pfad außerhalb des Projektcodes vorgegeben werden (Scratchpad oder `docs/`).
- Harte Freigabe per `AskUserQuestion` vor dem Scan (`SKILL.md:24`, `scan-workflow.md:176-239`). Die ursprüngliche Anfrage gilt dabei nicht als Freigabe (`SKILL.md:224`). Als Subagent ohne Nutzerdialog kann das blockieren. Lösung in der Kopie: Der Orchestrator holt die Freigabe des Regelsatz-Plans beim Betreiber ein und übergibt sie als `rulesets.json`.
- `SKILL.md:157-174` verweist auf den Workflow `/static-analysis:semgrep-scan`, der in einer Kopie nicht existiert. Diesen Abschnitt in der Kopie streichen.
- `merge_sarif.py`: reine Standardbibliothek, kein Netzwerk, kein Subprozess (`merge_sarif.py:28-36`, `38-42`).

Voraussetzungen und Umgebung (geprüft mit `command -v` / `curl`):
- semgrep: **nicht installiert**. PyPI ist erreichbar (HTTP 200), `pip install semgrep` also möglich [Vermutung: Das Wheel funktioniert ohne weitere Downloads].
- jq vorhanden (`/usr/bin/jq`), uv vorhanden (`/root/.local/bin/uv`), Python 3.13.18.
- `semgrep.dev` → **CONNECT 403** (Proxy). Registry-Regelsätze (`p/javascript`, `p/typescript`, `p/secrets` …) und die Pro-Prüfung (`SKILL.md:97`) **funktionieren hier nicht**.
- `git clone` von github.com funktioniert (beide Klone hier erfolgreich). Geklonte Regel-Repos unter `third_party` sind also nutzbar. Ein Plan nur mit `third_party` ist zulässig: `baseline` darf leer sein, die Repos werden als Scan-Einheit „all“ angelegt (`run-scans.sh:469-476`, `539`).
- Hinweis: trailofbits/semgrep-rules steht unter AGPLv3 (`rulesets.md:128`). Die Regeln werden nur zur Laufzeit geklont und danach gelöscht, sie landen nicht im Projekt-Repo.

Risiken: ungepinnte Regel-Repos (Inhalt kann sich ändern; Regeln sind YAML, [Vermutung: keine Codeausführung durch Regeln]); Schreiben ins Projekt bei falschem Ausgabeordner.
Begründung: Sauber gebaut, Fehlerfälle werden ehrlich gemeldet. **Empfehlung: mit Einschränkung übernehmen.** In der Kopie anpassen: Ausgabeordner, Freigabe-Gate, Workflow-Verweis entfernen, `third_party` auf `trailofbits/semgrep-rules` (+ ggf. `elttam`, `kondukto` für JS/TS) beschränken und, wenn möglich, auf Commit pinnen.

### 3.3 static-analysis → codeql (nicht empfohlen)
**Gelesen:** `skills/codeql/SKILL.md` (295) vollständig, `workflows/codeql-build.js` Z. 1-60. Übrige 30 Dateien (Referenzen, Skripte, Tests) nur per grep auf Netzwerk, Subprozess, eval, Installationen geprüft.
Befunde [belegt]: Voraussetzung `codeql` mit den Installationswegen `gh extension install github/gh-codeql`, brew, GitHub-Releases (`SKILL.md:141-147`). Die Build-Fixes führen `pip install -r requirements.txt`, `pip install -e .` und `npm install` **im Zielprojekt** aus (`references/build-fixes.md:46-54`, `references/quality-assessment.md:167-175`); das widerspricht „nur lesen“. `allowed-tools` umfasst Write/Edit (`SKILL.md:13`). `codeql-build.js:31` durchsucht `~/.claude ~/.codex` nach dem Skill-Ordner (nur `find`, kein Auslesen).
Umgebung: codeql fehlt, `github.com/github/codeql-action/releases` → HTTP 403, gh nicht angemeldet. **Nicht nutzbar.**

### 3.4 supply-chain-risk-auditor
**Vollständig gelesen:** `SKILL.md` (122), `README.md` (67), `.claude-plugin/plugin.json` (9), `scripts/pyproject.toml` (20). **Gezielt gelesen:** `scripts/sources.py` Z. 195-235, 515-683 (HTTP-Client, gh-Token, GitHub, Scorecard, pip-audit). **Nur per grep** (Netzwerk, Subprozess, Dateizugriffe, Umgebungsvariablen): `collect.py` (1568), `render.py` (809), `model.py` (402; ohne Treffer bei Netzwerk/Subprozess). Tests und `evals/` nicht gelesen.

Befunde [belegt]:
- `allowed-tools: Read Write Bash Glob Grep` (`SKILL.md:4`). Write wird für `findings.json` und `report.md` gebraucht, die laut `SKILL.md:41-46` außerhalb des Repos liegen sollen.
- Keine Fremdabhängigkeiten (`pyproject.toml:6-9`, `dependencies = []`). Der Collector installiert und baut nichts (`SKILL.md:117-120`). pip-audit wird nur mit `--no-deps --disable-pip` aufgerufen, damit kein setup.py läuft (`sources.py:98-133`, Ausschnitt).
- Netzwerkziele: `api.osv.dev` (`sources.py:304`), `registry.npmjs.org` (353), `api.npmjs.org` (376), `pypi.org` (396), `proxy.golang.org` (440), `api.deps.dev` (461), `api.github.com` (559, 590), `api.scorecard.dev` (614). Gesendet werden **Namen und Versionen der Abhängigkeiten** und die GitHub-Repo-Namen. User-Agent `trailofbits-supply-chain-risk-auditor/0.1` (`sources.py:43`).
- **Token:** `gh auth token` wird per Subprozess gelesen (`sources.py:517-531`) und nur als `Authorization: Bearer` an `api.github.com` gesendet (`sources.py:557-559`, `590`). Auf einem Rechner mit angemeldetem gh hat der Collector damit Zugriff auf den GitHub-Token. Er nutzt ihn belegt nur lesend für Repo-Metadaten.
- Cache im Temp-Ordner (`collect.py:1544`) mit Modus 0700 und Eigentümerprüfung (`sources.py:97-136`).
- Kein eval/base64/exec.

Umgebung (curl-Statuscodes): `registry.npmjs.org` 200, `pypi.org` 200; `api.osv.dev`, `api.deps.dev`, `api.scorecard.dev`, `api.npmjs.org` → **CONNECT 403**; `api.github.com` 403.
Folge: Das Kernkriterium „Advisories“ (OSV) und alle Repo-/Scorecard-/Download-Kriterien sind hier nicht bewertbar. Messbar bleiben „deprecated“, Publisher-Konzentration und Install-Skripte aus der npm-Registry. Der Collector bricht ab, wenn nichts gemessen wurde (`SKILL.md:26-27`, `50-52`).
Empfehlung: **Mit Einschränkung.** Kopie ist unbedenklich. Sinnvoll erst, wenn der Betreiber die Hosts `api.osv.dev`, `api.deps.dev`, `api.scorecard.dev`, `api.npmjs.org` freigibt (Regel 7, externe Dienste). Übergangsweise `npm audit` [Vermutung: funktioniert hier, weil registry.npmjs.org erreichbar ist]. Vor der Kopie `collect.py`, `render.py`, `model.py` vollständig lesen; das war hier aus Zeitgründen nur per Musterprüfung möglich.

## 4. Trail of Bits: repo-weite Hooks, Skripte, Installer

[belegt] Die drei ausgewählten Plugins haben **keine** Hooks, keine `.mcp.json`, keine `settings.json` (per `find` geprüft). Keine `plugin.json` im Repo enthält `hooks`/`mcpServers`/`lspServers` (grep). Andere Plugins, die nur bei eigener Installation aktiv würden:
- `plugins/gh-cli/hooks/hooks.json:4-54`: SessionStart (`persist-session-id.sh`, `setup-shims.sh` schreibt `export PATH=<shims>:$PATH` in `CLAUDE_ENV_FILE`, `setup-shims.sh:33-39`), PreToolUse auf `WebFetch|mcp__.*fetch…` und `Bash` (Umleitung GitHub-Fetch/curl auf gh), SessionEnd `cleanup-clones.sh`.
- `plugins/modern-python/hooks/hooks.json:4-13`: SessionStart, PATH-Shims für pip/python/uv.
- `plugins/fp-check/hooks/hooks.json:4-27`: Prompt-Hooks auf Stop/SubagentStop (nur Prüftexte).
- `plugins/zeroize-audit/.mcp.json:3-13`: MCP-Server `uvx --from git+https://github.com/oraios/serena` (**ungepinnt**).
- `plugins/devcontainer-setup/skills/devcontainer-setup/resources/post_install.py:94-109`: setzt im Devcontainer `permissions.defaultMode = bypassPermissions`. Widerspricht BRIEFING 0A Regel 6. Nicht übernehmen.
- `curl … | sh` nur als Doku-Text in anderen Plugins: `testing-handbook-skills/skills/libafl/SKILL.md:82` (rustup), `modern-python/skills/modern-python/references/uv-commands.md:11`, `…/security-setup.md:19`, `culture-index/…/SKILL.md:130`.
- Keine Root-Installer (`install*`, `setup*`), kein `package.json` mit Scripts (einziges `package.json` ist ein Eval-Fixture: `supply-chain-risk-auditor/evals/fixtures/shipping-api/package.json`). `Makefile`, `.pre-commit-config.yaml`, `.github/` sind Entwickler-/CI-Dateien und nicht Teil einer Plugin-Installation [Vermutung].
- Keine an den Prüfer gerichteten Anweisungen (Prompt-Injection) gefunden (grep auf typische Formulierungen). `bypassPermissions`-Treffer stehen nur in Eval-Skripten anderer Plugins (`git-cleanup/evals/run-evals.sh:141`, `variant-analysis/tests/eval.sh:204`) und im oben genannten Devcontainer-Skript.

## 5. Lizenz Trail of Bits (CC BY-SA 4.0): Tatsachen aus dem Text (keine Rechtsberatung)
- Die Lizenz erlaubt, das Material zu vervielfältigen und zu teilen, auch bearbeitet (`LICENSE:147-155`).
- Pflichten zur Namensnennung (Urheber, Copyright-Hinweis, Lizenzhinweis, Haftungsausschluss-Hinweis, URI, Änderungskennzeichnung) gelten, **„If You Share the Licensed Material (including in modified form)“** (`LICENSE:231-260`).
- ShareAlike gilt, **„if You Share Adapted Material You produce“**: Dann muss die eigene Lizenz CC BY-SA 4.0 (oder später/kompatibel) sein (`LICENSE:273-290`).
- „Share“ ist definiert als „to provide material **to the public** by any means …“ (`LICENSE:125-131`). „Adapted Material“ ist übersetztes, verändertes oder umgestelltes Material (`LICENSE:73-81`). Rein technische Änderungen erzeugen kein Adapted Material (`LICENSE:165-175`).
- Daraus folgt nur: Ob eine Kopie in einem **privaten** Repo ein „Share“ ist, beantwortet der Text nicht ausdrücklich für diesen Fall. Offene Frage für den Betreiber. Spätestens wenn das Repo öffentlich wird oder Dritte (Agentur, Hoster mit Zugriff) die Dateien erhalten, greifen Namensnennung und für geänderte Skills ShareAlike.
- Praktische Empfehlung ohne Nachteil: Kopien mit Ordner-`LICENSE` (CC BY-SA 4.0), einer Herkunftszeile (Repo, Pfad, Commit `149d7b2…`) und einem Änderungsvermerk versehen und in `THIRD-PARTY-LICENSES.md` eintragen. Geänderte ToB-Skills nicht unter eine andere Lizenz stellen.
- claude-seo (MIT): Copyright- und Lizenzhinweis muss in Kopien enthalten sein (`LICENSE:12-13`). Also Root-`LICENSE` beilegen.

## 6. claude-seo: je Skill

Allgemein [belegt]: Die vier geprüften SKILL.md haben **kein `allowed-tools`** im Frontmatter (`seo/SKILL.md:1-11`, `seo-local/SKILL.md:1-15`, `seo-schema/SKILL.md:1-13`, `seo-technical/SKILL.md:1-15`). Der Werkzeugumfang ergibt sich aus der Agentendefinition. Jeder Skill hat einen Abschnitt, der Webinhalte als nicht vertrauenswürdig behandelt (z. B. `seo-schema/SKILL.md:187-193`). Skript-Bezug immer über `"${CLAUDE_PLUGIN_ROOT}/scripts/claude-seo" run …`. In einer Kopie existiert `CLAUDE_PLUGIN_ROOT` nicht, die Aufrufe laufen dann ins Leere.

### 6.1 seo (Orchestrator), Ablehnung
Gelesen: `SKILL.md` (339) vollständig. Referenzen per grep: `quality-gates.md:110` und `cwv-thresholds.md:98-105` mit Skript-/`npx lighthouse`-Aufrufen, sonst keine Auffälligkeiten.
Befunde [belegt]:
- Runtime-Pflicht: Launcher, `/seo setup` erzeugt Python-venv und Chromium (`SKILL.md:17-25`, `71-81`).
- `/seo audit` startet 8 bis 15 Subagenten parallel, abhängig von erkannten Zugangsdaten (Google, Matomo, PostHog, DataForSEO, Moz/Bing) (`SKILL.md:85-102`). Kollidiert mit 0A Regel 5.
- **Werbe-Footer:** Der Agent soll nach jedem größeren Ergebnis „Built by agricidaniel. Join the AI Marketing Hub community“ mit zwei skool.com-Links anhängen (`SKILL.md:159-202`). Nicht bösartig, aber unerwünschte Werbung in Projektberichten.
- Kostenpflichtige Erweiterungen referenziert: DataForSEO, Firecrawl, Image-Gen (Gemini, Extension „banana“), Ahrefs, SE Ranking, Profound u. a. (`SKILL.md:62-66`, `276-298`).
Begründung: Ohne Skripte und Subagenten bleibt nur ein Verteiler auf Skills, die wir nicht übernehmen. Brauchbar sind die Quality Gates (`SKILL.md:149-157`) und das Scoring (`220-239`). Diese ~30 Zeilen in die Agentendefinition `seo-specialist` übernehmen.

### 6.2 seo-local, Übernahme als Kopie mit Anpassung
Gelesen: `SKILL.md` (323) vollständig, `seo/references/local-schema-types.md` (193) Z. 1-60 und 130-193. `local-seo-signals.md` (177), `local-search-behavior.md` (54), `local-schema-multilocation.md` (42) nur per grep (Skriptaufrufe, Agentenansprache, Hosts, Werbung), ohne Befund. Vor der Kopie vollständig lesen.
Befunde [belegt]:
- Reines Markdown, keine Skriptaufrufe. Referenzpfade `${CLAUDE_PLUGIN_ROOT}/skills/seo/references/…` (`SKILL.md:61`, `165`, `182`, `189`, `243-246`) müssen auf `references/` der Kopie umgeschrieben werden.
- Optionaler DataForSEO-Abschnitt (`SKILL.md:297-299`) sowie FLOW/`/seo geo`/`seo-maps`-Verweise (`226`, `236`, `313-315`) lassen sich sauber streichen.
- Externe Abfragen nur als Vorschlag (WebFetch/`site:`-Suchen nach Verzeichniseinträgen, `SKILL.md:158-162`). Für den lokalen Build nicht nötig.
- US-Fokus: BBB, Yelp, FTC-Bußgeld, HIPAA, Data Axle/Neustar (`SKILL.md:109-113`, `160-166`, `282`). Citation-Quellen für Home Services nur US (`local-schema-types.md:182`). Kennzahlen aus Marketingstudien ohne Primärquellen-Prüfung (`SKILL.md:19-31`).
- Passend für uns: SAB/Hybrid-Erkennung (`SKILL.md:35-55`), Doorway-/Swap-Test für Regionalseiten (`131`), NAP-Abgleich Seite ↔ JSON-LD (`152-157`), Schema-Subtypen `Electrician`, `HVACBusiness`, `GeneralContractor` usw. (`local-schema-types.md:41-53`), Verbot von Review-Gating (`SKILL.md:109`), EEA-Hinweis (`167`).
- Ergänzen: deutsche Verzeichnisse (z. B. Gelbe Seiten, Das Örtliche, 11880, Betriebsverzeichnis der Handwerkskammer); Bewertungen nur echt und mit Echtheitshinweis nach BRIEFING Abschnitt 2 Nr. 5 (§ 5b UWG), weil `SKILL.md:106` (`aggregateRating`) und `281` (Review-Strategie) sonst falsch gelesen werden können.

### 6.3 seo-schema, Übernahme als Kopie
Gelesen: `SKILL.md` (193) und `references/deprecated-types-2024-2026.md` (75) vollständig. `seo/references/schema-types.md` (132) per grep ohne Befund. Zusätzlich `hooks/validate-schema.py` (372) vollständig (siehe 7).
Befunde [belegt]:
- Ein Skriptaufruf `parse_html.py --url` (`SKILL.md:19`). Die Alternative steht direkt dabei („or scan `<script type="application/ld+json">` in the page source“, `SKILL.md:19-20`). Gegen den lokalen Build: `dist/**/*.html` lesen.
- Verweise `../seo/references/schema-types.md` (`SKILL.md:46`) und `schema/templates.json` (`SKILL.md:54`, Root-Ordner `schema/`, 278 Zeilen) beim Kopieren mitnehmen oder Pfade anpassen.
- LocalBusiness-Vorlage mit `addressCountry: "US"` und `openingHours`-Kurzform (`SKILL.md:115-137`). Für DE anpassen.
- Gute Regeln: nur wahre Daten, Platzhalter kennzeichnen, keine Fake-Reviews, Anreize offenlegen (`SKILL.md:87-90`). FAQ/HowTo-Status (`59`, `64`).
- Validierung ohne Skript ist Modell-Urteil. Für eine maschinelle Prüfung kann `hooks/validate-schema.py` als **manuelles Skript** (nicht als Hook) übernommen werden: nur Standardbibliothek (`json, os, re, sys`, Z. 42-46), kein Netzwerk, liest eine Datei, Ausgabe auf stdout/stderr. Prüft `.html` (Z. 324), also auch Dateien in `dist/`.
- Datumsangaben zu Google-Änderungen (z. B. FAQ-Rich-Results am 2026-05-07 eingestellt, `deprecated-types-2024-2026.md:35`, „Last verified … 2026-09-23“, Z. 75) hier nicht gegen Primärquellen geprüft.

### 6.4 seo-technical, mit Einschränkung (gekürzte Kopie)
Gelesen: `SKILL.md` (304) vollständig. `references/stack-cve-exposure.md` (96) per grep.
Befunde [belegt]:
- Skriptabhängige Teile: `sitemap_discovery.py` (`SKILL.md:23`), `transport_check.py` (`107`), `render_page.py` mit Chromium (`166`), `agent_ux_check.py` (`214-216`), Google-APIs (`256`), Konfiguration lokaler Hosts/Proxys `CLAUDE_SEO_LOCAL_TARGETS`/`CLAUDE_SEO_TRUSTED_PROXIES` (`258-286`, erwähnt ausdrücklich Anthropic-Cloud-Sessions, Z. 284). Ohne Skripte wirkungslos; in der Kopie streichen.
- **CVE-Abschnitt** zu PHP (CVE-2026-109618 / CVE-2026-109619, CVSS 9.2, `SKILL.md:118-131`, `references/stack-cve-exposure.md:23-27`): hier **nicht verifizierbar** und für eine statische Astro-Seite ohne PHP irrelevant. Streichen.
- DataForSEO optional (`SKILL.md:250-252`), streichbar.
- Brauchbar ohne Skripte: robots.txt inkl. KI-Crawler-Tabelle (`38-92`), Canonical/Noindex (`94-104`), Security-Header-Liste (`109-116`, deckt sich mit BRIEFING Abschnitt 8), URL-Struktur (`133-138`), Mobile/Interstitials (`140-150`), CWV mit INP (`152-158`), Rendering-Regeln (`165-194`, Astro ausdrücklich als bevorzugt genannt, Z. 183). Gegen den lokalen Build prüfbar mit Grep/Read auf `dist/`. CWV per Lighthouse (`cwv-thresholds.md:105`, `npx lighthouse`) oder durch den `a11y-perf-tester`.
- „Sandbox“-Hinweis: Der Agent soll `CLAUDE_SEO_CHROMIUM_NO_SANDBOX` nie selbst setzen (`SKILL.md:304`). Defensiv, unkritisch.

## 7. claude-seo: repo-weite Hooks, Skripte, Installer

- **Plugin-Installation bringt alles mit** [belegt]: Das Plugin `claude-seo` hat `source: "./"` (`.claude-plugin/marketplace.json:12-13`), also alle 29 Skills (`skills/`), 20 Agenten (`agents/`) und den Hook. Eine Teilauswahl („nur seo, seo-local, seo-schema“, BRIEFING 3) ist per Plugin-Installation **nicht möglich**. Die Vorgabe „nur über Plugin-Marktplatz“ und „nur einzelne Skills“ widersprechen sich. Empfehlung: geprüfte Kopie statt Plugin.
- **Hook** (`hooks/hooks.json:3-18`): `PostToolUse`, Matcher `Edit|Write`, startet `node hooks/run-python-hook.js hooks/validate-schema.py <file_path>`. `run-python-hook.js` (86, vollständig gelesen) sucht ein Python (`CLAUDE_SEO_PYTHON`, `py -3`, `python3`, `python`, Z. 31-46) und überspringt alle Dateien außer `.html .htm .jsx .tsx .vue .svelte .php .ejs` (Z. 9). **`.astro` wird nicht geprüft.** `validate-schema.py` ist lokal, ohne Netzwerk, Exit 2 bei Platzhaltern/veralteten Typen (Z. 349-363). Unbedenklich, aber für Astro-Quellen wirkungslos.
- **install.sh** (214, vollständig gelesen): klont Tag `v2.6.2` (überschreibbar per `CLAUDE_SEO_TAG`, Z. 15, 37). Kopiert **alle** Skills nach `~/.claude/skills/*` (Z. 41-51), alle Agenten nach `~/.claude/agents/` (Z. 74), Schema/Data/Scripts/Hooks (Z. 54-99), **alle Extension-Skills und -Agenten** (Z. 102-132). Schreibt Pfade in den kopierten .md um (Z. 146-188) und führt `claude-seo setup` aus (Z. 192). Empfiehlt am Ende Deinstallation per `curl … | bash` (Z. 211). Wirkt global auf `~/.claude`, nicht projektbezogen.
- **Runtime-Setup** (`scripts/runtime.py`, per grep geprüft): venv unter `CLAUDE_SEO_DATA_DIR` / `CLAUDE_PLUGIN_DATA` / `~/.local/share/claude-seo` (Z. 125-139), `pip install -r requirements.txt` (Z. 377), `playwright install chromium` (Z. 384). `requirements.txt` (32): u. a. playwright, weasyprint, matplotlib, google-api-python-client, google-ads; nur Versionsbereiche, keine exakten Pins (Z. 5-32).
- **uninstall.sh** (64): löscht per Glob **alle** `~/.claude/skills/seo-*` und `~/.claude/agents/seo-*.md` (Z. 36-50). Das träfe auch eigene Skills mit `seo-`-Präfix im Nutzerordner. Projekt-Skills unter `.claude/skills/` sind nicht betroffen [Vermutung, das Skript nutzt nur `$HOME/.claude`].
- **Extensions** (`extensions/*/install.sh`, per grep): schreiben MCP-Server in `~/.claude.json` mit API-Schlüsseln im Klartext (Dateimodus 0600) und starten `npx`-Pakete (z. B. `firecrawl-mcp@3.11.0`, `nanobanana-mcp`, `dataforseo`). Werden nur bei manuellem Aufruf aktiv. Sauber weglassbar, weil die ausgewählten Skills sie nur optional erwähnen.
- **scripts/** (69 Dateien, per grep): Netzwerkziele googleapis.com, moz.com, bing.com, indexnow.org, openpagerank, chromeuxreport u. a. Zugangsdaten aus Umgebungsvariablen (`DATAFORSEO_*`, `INDEXNOW_KEY`, `MATOMO_*`) und `~/.config/claude-seo/`. `base64` nur zum Dekodieren des Moz-Schlüssels (`moz_api.py:57`) und von GitHub-API-Inhalten (`sync_flow.py:182`). Kein eval/exec/`shell=True`. Keine Verschleierung gefunden.
- `.devcontainer/devcontainer.json`: `postCreateCommand` mit `pip install` und `playwright install chromium`. Nur bei Devcontainer-Nutzung.
- `README.md:249-256` bewirbt einen **privaten Zweit-Marktplatz** „AI-Marketing-Hub/claude-seo“ (Pro-Version). Nicht verwenden, nicht verwechseln.
- `marketplace.json:61-69`: Zweit-Plugin `seo-cockpit` (git-subdir, SHA gepinnt), Ausgabenwächter für Bezahl-APIs. Für uns nicht nötig.
- Prompt-Injection: keine an den Prüfer gerichteten Anweisungen in den geprüften Dateien. Grep-Treffer gibt es nur in Testdateien (`tests/test_parse_html_extraction.py`, `test_page_checks.py`, `test_shopify_main.py`), vermutlich absichtliche Testfälle. Nicht weiter geprüft, nicht Teil der Kopie.

## 8. Dateilisten für geprüfte Kopien nach `.claude/skills/<name>/`

Hinweis: Laut BRIEFING 0A wird ein vorgeladener Skill vollständig in den Kontext geladen. [Vermutung: gemeint ist die SKILL.md; `references/` werden bei Bedarf gelesen.] Beide Werte sind angegeben.

**Trail of Bits (Commit `149d7b2`, CC BY-SA 4.0), zusätzlich je Ordner `LICENSE` (427) und Herkunfts-/Änderungsvermerk:**
| Ziel | Datei (Quelle) | Zeilen |
|---|---|---|
| `semgrep/` | `plugins/static-analysis/skills/semgrep/SKILL.md` (angepasst, s. 3.2) | 273 |
| | `…/references/rulesets.md` | 162 |
| | `…/references/scan-modes.md` | 172 |
| | `…/workflows/scan-workflow.md` | 478 |
| | `…/scripts/run-scans.sh` | 786 |
| | `…/scripts/merge_sarif.py` | 339 |
| | **Summe** (davon vorgeladen: 273) | **2210** |
| `insecure-defaults/` | neue SKILL.md (selbst zu schreiben, ca. 60-80 Zeilen) | – |
| | `plugins/insecure-defaults/references/*.md` (6) | 424 |
| | `plugins/insecure-defaults/references/*.json` (6) | 73 |
| | **Summe ohne SKILL.md** | **497** |
| `supply-chain-risk-auditor/` (erst nach Host-Freigabe) | `…/SKILL.md` | 122 |
| | `…/scripts/collect.py`, `model.py`, `render.py`, `sources.py` | 1568 + 402 + 809 + 683 |
| | `…/scripts/pyproject.toml`, `uv.lock` | 20 + 12 |
| | **Summe** (vorgeladen: 122) | **3616** |
Nicht übernehmen: `codeql/`, `sarif-parsing/`, `workflows/*.js`, `commands/`, alle `tests/`, `evals/`, `agents/openai.yaml`, `assets/`.

**claude-seo (Commit `468ed5b`, MIT), zusätzlich je Ordner Root-`LICENSE` (21):**
| Ziel | Datei (Quelle) | Zeilen |
|---|---|---|
| `seo-local/` | `skills/seo-local/SKILL.md` (Pfade, DataForSEO/FLOW raus, DE ergänzt) | 323 |
| | `skills/seo/references/local-seo-signals.md` → `references/` | 177 |
| | `skills/seo/references/local-search-behavior.md` → `references/` | 54 |
| | `skills/seo/references/local-schema-types.md` → `references/` | 193 |
| | `skills/seo/references/local-schema-multilocation.md` → `references/` | 42 |
| | **Summe** (vorgeladen: 323) | **789** |
| `seo-schema/` | `skills/seo-schema/SKILL.md` (Z. 19, 46, 54, 127 angepasst) | 193 |
| | `skills/seo-schema/references/deprecated-types-2024-2026.md` | 75 |
| | `skills/seo/references/schema-types.md` → `references/` | 132 |
| | **Summe** (vorgeladen: 193) | **400** |
| | optional `schema/templates.json` | 278 |
| | optional `hooks/validate-schema.py` → `scripts/` (manuell auf `dist/*.html`) | 372 |
| `seo-technical/` | `skills/seo-technical/SKILL.md`, gekürzt um Z. 23 (Skriptteil), 107, 118-131, 166, 201-221, 250-286 | 304 → ca. 220 |
| | optional `skills/seo/references/cwv-thresholds.md` (Z. 98-105 anpassen) | 116 |
| | optional `skills/seo/references/quality-gates.md` (Z. 110 anpassen) | 168 |
Nicht übernehmen: `skills/seo/SKILL.md` (Orchestrator), `seo-audit`, alle übrigen Skills, `agents/`, `scripts/`, `hooks/hooks.json`, `extensions/`, `install*`/`uninstall*`, `requirements.txt`, `references/stack-cve-exposure.md`.
Vorschlag für BRIEFING 0A, Agent `seo-specialist`: vorladen `seo-local`, `seo-schema`, `seo-technical` (ca. 740-840 SKILL.md-Zeilen) statt `seo`.

## 9. Nicht prüfbar / Unsicherheiten
- **Stars, Forks, Contributors:** aus dieser Umgebung nicht abrufbar (api.github.com HTTP 403). Flache Klone erlauben keine Aussage zur Commit-Historie.
- **Nicht vollständig gelesen** (nur Musterprüfung per grep): ToB `collect.py`, `render.py`, `model.py`, `tests/harness.js` (Mitte), alle codeql-Referenzen/-Skripte, `sarif-parsing` (bis auf Kopf und Z. 370-395); claude-seo `local-seo-signals.md`, `local-search-behavior.md`, `local-schema-multilocation.md`, `schema-types.md`, `quality-gates.md`, `cwv-thresholds.md`, `stack-cve-exposure.md`, `scripts/runtime.py` (bis auf Z. 125-139), `scripts/*.py`, `extensions/*`, `agents/*`, `install.ps1`, `uninstall.ps1`, Tests. Vor einer Kopie die Dateien der Kopierliste vollständig lesen.
- **Workflow-Tool:** Ob die in dieser Claude-Code-Version vorhandenen Werkzeuge ein `Workflow`-Tool für Plugin-Workflows (`workflows/*.js`) enthalten, ist nicht geprüft [Vermutung: neue Plugin-Funktion]. Für die Empfehlung unerheblich, weil die Workflows nicht übernommen werden.
- **Hooks bei Plugin-Installation:** [Vermutung] Ein aktiviertes Plugin wendet seinen Hook in allen Projekten des Nutzers an. Nicht in der Claude-Code-Doku nachgesehen.
- **semgrep per pip:** Installation und Offline-Lauf nicht getestet (nichts installiert). [Vermutung] semgrep fragt ohne `SEMGREP_ENABLE_VERSION_CHECK=0` beim Start nach einer neuen Version; hier ohnehin gesperrt.
- **npm audit** als Ersatz für den Supply-Chain-Auditor: nicht getestet [Vermutung].
- **Fachliche Angaben in claude-seo** (Google-Änderungen 2025/2026, CVE-Nummern, Marktstatistiken) nicht gegen Primärquellen geprüft.
- **Lizenzfrage** „privates Repo = Share?“ (CC BY-SA 4.0): offen, durch den Betreiber zu klären. Hier nur Textauszüge, keine Rechtsberatung.
- Klone bleiben für Stichproben liegen; der Orchestrator löscht sie danach.
