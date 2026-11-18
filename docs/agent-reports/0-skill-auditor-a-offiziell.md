# Skill-Audit Teil A: offizieller Anthropic-Marktplatz

Prüfer: `skill-auditor` (Teil A). Stand: 2026-11-18. Verfahren nach BRIEFING Abschnitt 3.
Nichts installiert, nichts aus den Klonen ausgeführt (kein npm/pip/npx, keine Skripte, keine Hooks, kein `claude plugin`). Gelesen wurde nur mit Read, Grep, `git log`, `wc`, `ls`, `md5sum`.

Klone (bleiben für Stichproben liegen):
- `/tmp/claude-0/-home-user/4de6bfe2-8089-5731-8e90-77052bdcc979/scratchpad/skill-audit/official`
- `/tmp/claude-0/-home-user/4de6bfe2-8089-5731-8e90-77052bdcc979/scratchpad/skill-audit/ref-house-builder`

Kennzeichnung: **[belegt]** = in einer Datei gelesen, mit `Datei:Zeile`. **[Vermutung]** = Schlussfolgerung, nicht vollständig belegt.

---

## Übersicht

| Name | Quelle (Repo + Pfad) | Commit-Hash | Lizenz | Befund (kurz) | Empfehlung |
|---|---|---|---|---|---|
| `security-guidance` v2.0.20 | `anthropics/claude-plugins-official`, `plugins/security-guidance` | `f59aa2e6dd7d93e45910afcb7569d73b375f31f7` | Apache 2.0 | Kein Schadcode gefunden. 5 Hooks (SessionStart, UserPromptSubmit, PostToolUse ×2, Stop). Installiert beim Start per `pip` die Bibliothek `claude-agent-sdk` **ohne Versions-Pin**. Schickt Diffs und Dateiinhalte zum Modell-Endpunkt (`ANTHROPIC_BASE_URL` oder api.anthropic.com). Kostet Tokens (standardmäßig Opus). | **Über den Marktplatz aktivieren**, auf den Commit gepinnt. Zuerst nur die Regex-Warnungen (`ENABLE_CODE_SECURITY_REVIEW=0`). LLM-Reviews erst nach Freigabe durch den Betreiber (Kosten, Datenabfluss, ungepinntes pip). Falls der Marktplatz in der Cloud nicht geht: geprüfte Kopie der Hook-Dateien (Liste unten). |
| `frontend-design` v1.1.1 | dasselbe Repo, `plugins/frontend-design` | `f59aa2e…` (wie oben) | Apache 2.0 (Plugin-LICENSE und `skills/frontend-design/LICENSE.txt`) | Reine Anleitung (eine `SKILL.md`, 71 Zeilen). Keine Tools, keine Skripte, keine `!`-Blöcke, kein Netzwerk. | **Als Kopie übernehmen** nach `.claude/skills/frontend-design/` |
| `playwright` | dasselbe Repo, `external_plugins/playwright` (Drittanbieter-Eintrag, Autor laut plugin.json „Microsoft") | `f59aa2e…` | keine Lizenzdatei im Plugin-Ordner | Startet `npx @playwright/mcp@latest`, also **ungepinnt**. Bei jedem Start wird die jeweils neueste Version von npm geladen und lokal ausgeführt. | **Nicht nötig.** `@playwright/test` und Chromium sind schon da. Falls doch gewünscht: nur mit fester Version als eigene `.mcp.json` |
| `context7` | dasselbe Repo, `external_plugins/context7` (Tag `community-managed`, Autor Upstash) | `f59aa2e…` | keine Lizenzdatei im Plugin-Ordner | Fernserver über HTTP-MCP `https://mcp.context7.com/mcp`. Lokal wird nichts ausgeführt, aber Suchanfragen gehen an einen Drittanbieter. Die Texte zum API-Key widersprechen sich. | **Nicht nötig.** Optional erst nach Datenschutz-Freigabe durch den Betreiber |
| `ch-bas/threejs-sims-house-builder` (nur Kurzprüfung) | `github.com/ch-bas/threejs-sims-house-builder` | `0db3a930d6f39341e6bea0a6613a2fc6d7bdd964` | MIT | Aktiv: letzter Commit 2026-11-15, v1.37.0. **Nicht klein:** 681 Dateien, 9,3 MB, rund 83.000 Zeilen Code ohne Tests. Keine Agenten-Dateien (`CLAUDE.md`, `.claude/`, `.mcp.json`) gefunden. | Gut als **Ideenquelle** (keine Abhängigkeit). Übernommener Code braucht einen MIT-Hinweis in `THIRD-PARTY-LICENSES.md` |

**Stars, Forks, Contributors:** aus dieser Umgebung nicht abrufbar. `curl https://api.github.com/repos/anthropics/claude-plugins-official` und `…/ch-bas/threejs-sims-house-builder` liefern beide HTTP 403 („GitHub access to this repository is not enabled for this session"). Der flache Klon enthält nur einen Commit, daher gibt es auch keine Contributor-Zählung über git.

**Letzter Commit im Marktplatz-Repo:** 2026-11-16T09:53:02-08:00, Mohamed Hegazy, „Merge pull request #7107 … sg-fewer-false-pattern-warnings". Wann einzelne Plugin-Ordner zuletzt geändert wurden, lässt sich wegen `--depth 1` nicht bestimmen.

**Wie der Marktplatz die vier Plugins einbindet** (`.claude-plugin/marketplace.json`) [belegt]:
- `context7`: Zeile 1120–1131, `"source": "./external_plugins/context7"`, lokaler Ordner, Tag `community-managed`
- `frontend-design`: Zeile 1627–1637, `"source": "./plugins/frontend-design"`, lokal
- `playwright`: Zeile 2930–2935, `"source": "./external_plugins/playwright"`, lokal, ohne `author`-Feld im Marktplatz-Eintrag
- `security-guidance`: Zeile 3485–3496, `"source": "./plugins/security-guidance"`, `"version": "2.0.20"`, lokal

Keiner der vier verweist auf ein fremdes Repo mit `sha`. Ihr Inhalt ist durch den Commit des Marktplatz-Repos festgelegt. Nachgeladen werden aber trotzdem Dinge: bei `playwright` das npm-Paket `@latest`, bei `security-guidance` das PyPI-Paket `claude-agent-sdk` ohne Version.

Hinweis aus `README.md:13` des Marktplatzes [belegt]: „Anthropic does not control what MCP servers, files, or other software are included in plugins …". Das betrifft vor allem `external_plugins/`, siehe `README.md:18`.

---

## 1. security-guidance

### Gelesene Dateien
Vollständig gelesen:
- `.claude-plugin/plugin.json` (10)
- `hooks/hooks.json` (101)
- `README.md` (172)
- `hooks/sg-python.sh` (498)
- `hooks/ensure_agent_sdk.py` (1127)
- `hooks/_base.py` (570)
- `hooks/patterns.py` (409)
- `hooks/session_state.py` (259)
- `hooks/review_api.py` (398)
- `hooks/extensibility.py` (789)
- `hooks/reporesolve.py` (327)
- `LICENSE` (202): md5 gleich der Root-`LICENSE`, Apache 2.0

Teilweise gelesen, der Rest gezielt per Grep geprüft (Netzwerk, subprocess, eval/exec/base64, Secret-Pfade, Exit-Codes, Ausgaben):
- `hooks/llm.py` (2870): gelesen 1–1627 und 1905–2623
- `hooks/security_reminder_hook.py` (3505): gelesen 380–400, 460–478, 3244–3300 und der Dispatch in `main()` 3320–3502 per Grep. Alle `subprocess`-Aufrufe einzeln angesehen.
- `hooks/gitutil.py` (2269): gelesen 40–140, 925–947, 1840–1929. Alle `subprocess`-Aufrufe einzeln angesehen.
- `hooks/diffstate.py` (1472): nur Grep. Alle `subprocess`-Aufrufe einzeln angesehen.

Nur per Grep geprüft: `tests/` (90 Dateien, rund 24.000 Zeilen). Die Tests werden von `hooks.json` nicht gestartet. Die gefundenen URLs sind Testattrappen (`127.0.0.1`, `example.com`, `gateway.internal`), `urlopen` wird nur gemockt.

### Hooks: was läuft wann [belegt]
Jeder Hook startet `bash ${CLAUDE_PLUGIN_ROOT}/hooks/sg-python.sh <script.py>`. `sg-python.sh` sucht nur einen Python-Interpreter (3.10 oder neuer bevorzugt) und startet damit das Skript (`sg-python.sh:366-428`). Netzwerk oder Downloads gibt es dort nicht. Auf Windows schreibt es die Datei `launcher-python` in den Zustandsordner (`sg-python.sh:337-340`).

| Ereignis / Matcher | `hooks.json` | Was passiert | Blockiert? |
|---|---|---|---|
| `SessionStart` | 4–14, timeout 180 s | `ensure_agent_sdk.py`: Falls `claude_agent_sdk` fehlt, legt es `~/.claude/security/agent-sdk-venv` an (`ensure_agent_sdk.py:817-820`) und ruft **`pip install claude-agent-sdk` ohne Version** auf, mit `--prefer-binary --no-cache-dir` (`:839-844`). Ersatzweg: `pip install --target …/agent-sdk-libs` (`:575-580`). Läuft asynchron (`:1022-1023`). Übersprungen, wenn LLM-Reviews abgeschaltet sind (`:722-723`, `_base.py:73-87`). | nein |
| `UserPromptSubmit` | 15–24 | Merkt sich einen Git-Stand als Basis. Arbeitet auf einer **Wegwerf-Kopie des Index** (`GIT_INDEX_FILE`, `gitutil.py:740`, `:800`, `diffstate.py:563`). Zustand wird nach `~/.claude/security/` geschrieben. | nein |
| `PostToolUse` `Edit\|Write\|MultiEdit\|NotebookEdit` | 25–35 | 25 Regex-Regeln aus `patterns.py:68-325`, z. B. `innerHTML=`, `eval(`, `dangerouslySetInnerHTML`, `<script src>` ohne SRI, TLS-Prüfung aus. Gibt nur `additionalContext` aus (`security_reminder_hook.py:3488-3490`), danach exit 0. | nein, nur Hinweis an Claude |
| `PostToolUse` `Bash`/`PowerShell`, `if: Bash(git*commit*)`, `git*push*`, `gt *` | 36–85, `asyncRewake` | Agentischer Commit-Review. Eine innere Claude-CLI läuft über das Agent SDK, **nur mit Read/Grep/Glob** (`llm.py:1998`, `:2001-2017`, `:2334-2346`), mit `setting_sources=[]` und ohne MCP (`--strict-mcp-config`, sonst `disallowedTools mcp__*`). Git ist abgesichert (`llm.py:2114-2136`, `gitutil.py:62-123`: `core.hooksPath=/dev/null`, `core.fsmonitor=false`, `--no-ext-diff`, `--no-textconv`). Mit exit 2 wird Claude geweckt (`security_reminder_hook.py:2322`, `:2744`). | läuft **nach** dem Commit (PostToolUse) und verhindert ihn nicht |
| `Stop` | 87–99, `asyncRewake` | LLM-Review des Diffs der Runde. Ohne asyncRewake (synchroner Ersatzweg) gibt es `decision:"block"` plus Begründung aus (`security_reminder_hook.py:468-473`). Dann muss Claude die Befunde abarbeiten, bevor der Zug endet. | blockiert das **Beenden des Zugs**, nicht Werkzeugaufrufe |

### Netzwerkzugriffe [belegt]
- `llm.py:244-256`: Endpunkt ist `ANTHROPIC_BASE_URL`, sonst `https://api.anthropic.com`
- `llm.py:1299-1358`: `POST …/v1/messages` mit Diff und Dateiinhalten, Timeout 120 s, bis zu 3 Versuche
- `llm.py:744-751`: `GET …/v1/models?limit=100`, um das neueste Opus zu finden; das Ergebnis wird 24 h zwischengespeichert (`:707-712`)
- `llm.py:344-353`: `HEAD`-Probe des Endpunkts
- `llm.py:465-495`: **In Remote-Sessions** (`CLAUDE_CODE_REMOTE`) wird `anthropic.com` aus `NO_PROXY`/`no_proxy` entfernt, wenn die Probe scheitert. Das gilt nur im Hook-Prozess. In unserer Umgebung sind `CLAUDE_CODE_REMOTE`, `ANTHROPIC_BASE_URL` und `NO_PROXY` gesetzt (nur die Namen geprüft).
- `ensure_agent_sdk.py:839-844`: pip-Download vom voreingestellten Paketindex. Laut Kommentar `:821-825` bewusst ohne `--index-url`.
- Telemetrie: numerische Kennzahlen gehen über den Hook-Metrik-Kanal von Claude Code (`ensure_agent_sdk.py:101-116`, `:1037-1040`, `_base.py:543-569`). Laut Kommentar sind nur Zahlen und Booleans erlaubt, keine Pfade oder Namen.
- Andere Hosts und eigene HTTP-Clients (curl, wget, requests) gibt es im Hook-Code nicht (Grep über alle Module). `security_reminder_hook.py:72` importiert `urllib.request`, verwendet es aber sonst nicht (Grep).

### Zugangsdaten und Secrets [belegt]
- Liest `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN` und `ANTHROPIC_CUSTOM_HEADERS` aus der Umgebung (`llm.py:171-177`, `:550-574`). Gibt einen OAuth-Token als `CLAUDE_CODE_OAUTH_TOKEN` an die innere CLI weiter (`llm.py:2144-2153`). Das ist für den Zweck schlüssig, Ziel ist nur der Modell-Endpunkt.
- **Kein** Zugriff auf `~/.ssh`, `.env`, Keychain oder `.netrc` zum Lesen. Diese Namen tauchen nur in einer **Ausschlussliste** auf. Dateien mit Secret-Form werden nie zum Review geschickt (`gitutil.py:1849-1920`: `.env*`, `id_rsa`, `.npmrc`, `.git-credentials`, `.credentials.json` …).
- Liest Projekt-Richtlinien aus `~/.claude/claude-security-guidance.md`, `<projekt>/.claude/claude-security-guidance.md` und `.local.md`, außerdem `security-patterns.{yaml,json}` (`extensibility.py:119-154`). Symlinks im Projekt werden ignoriert (`:224-235`). Der Text landet im Review-Prompt mit der Rahmung „darf nichts unterdrücken" (`:267-282`).

### Schreibzugriffe [belegt]
Alles unter `~/.claude/security/`, angelegt mit Modus 0700 (`_base.py:23-70`):
- `log.txt` (rotiert bei 1 MB, `_base.py:119-152`)
- Zustandsdateien je Session (`session_state.py:38-53`), Aufräumen nach 30 Tagen (`:75-111`)
- venv bzw. `agent-sdk-libs`
- `review_model.json`
- `pip-tmp/`

Optional schreibt `SG_AGENTIC_DEBUG_DIR` Prompts in ein Debug-Verzeichnis (`llm.py:2473-2480`), aber nur, wenn die Variable gesetzt ist. Im Projekt-Repo wird nichts geschrieben. Die Git-Befehle laufen nur lesend oder auf der temporären Index-Kopie [Vermutung für die nicht vollständig gelesenen Teile von `gitutil.py`/`diffstate.py`; die gesehenen Aufrufe sind `rev-parse`, `diff`, `show`, `log -g`, `status`, `ls-files`, `merge-base` und `update-index` auf der Kopie, `gitutil.py:946-948`].

### Verschleierung, dynamischer Code, Anweisungen [belegt]
- Kein base64, kein `eval`/`exec` auf Daten, kein `__import__`, keine zusammengestückelten Shell-Befehle, kein `shell=True` (Grep über `hooks/`).
- Dynamisch, aber dokumentiert:
  - `exec_module` von `pywin32_bootstrap.py` nur unter Windows (`llm.py:86-108`)
  - Regex-Worker als `python -I -S -c <fester Code>` mit Zeitlimit, um ReDoS durch Projekt-Regeln abzufangen (`extensibility.py:714-754`)
  - nach Commits ein abgekoppelter Neustart von `ensure_agent_sdk.py` (`security_reminder_hook.py:3244-3284`)
- Keine `!`-Shell-Blöcke (das Plugin enthält keine Skill- oder Command-Markdowns).
- Keine Anweisungen an mich oder an Claude, Sicherheitsabfragen zu umgehen oder Berechtigungen zu erweitern. Die Texte in `hooks.json:43`/`:94` („address or acknowledge the findings … then continue …") sind die gewollte Rückmeldung des Plugins an Claude, keine Prompt-Injection.
- Keine vorgetäuschten Voraussetzungen. `README.md:19-23` verlangt Python 3.8+ und Zugangsdaten; das ist zum Code passend.

### Risiken
1. **Lieferkette:** `pip install claude-agent-sdk` ohne Version und ohne Hash, bei jedem fehlenden SDK (`ensure_agent_sdk.py:839-844`). Damit ist das Plugin nicht vollständig durch den Commit gepinnt.
2. **Datenabfluss:** Diff-Hunks, geänderte Dateien und alles, was der Agent-Reviewer per Read/Grep liest, gehen an den Modell-Endpunkt (`README.md:121-129`).
3. **Kosten:** standardmäßig Opus bei jedem Stop-Review und je Commit/Push. Begrenzt auf 20 Commit-Reviews pro Stunde (`README.md:75`, `:135-148`).
4. **Mehrere Agenten:** `README.md:73` empfiehlt `ENABLE_STOP_REVIEW=0` für Multi-Agent- und Worktree-Setups. Das trifft unser Vorgehen (BRIEFING 0A, Regel 4).
5. Proxy-Variablen werden im Hook-Prozess geändert (`llm.py:465-495`). Das ist harmlos für die Session, aber unerwartet.
6. Großer Code-Umfang (rund 14.600 Zeilen Hook-Code). Nicht jede Zeile wurde gelesen, siehe „Nicht prüfbar".

### Aktivieren ohne `/plugin` (nur was in den Dateien steht)
- `README.md:11-17` und das Root-`README.md:20-26` nennen nur `/plugin install security-guidance@claude-plugins-official` bzw. `/plugin > Discover` und „Marketplace ships enabled by default in Claude Code". Einen Weg über `.claude/settings.json` beschreiben die gelesenen Dateien **nicht**.
- Konfiguration nur über Umgebungsvariablen (`README.md:66-77`):
  - `ENABLE_CODE_SECURITY_REVIEW=0`: keine LLM-Reviews, kein SDK-Install (`_base.py:73-87`)
  - `ENABLE_STOP_REVIEW=0`
  - `SECURITY_GUIDANCE_DISABLE=1`

**Dateiliste für eine geprüfte Kopie** (als Projekt-Hook, z. B. nach `.claude/hooks/security-guidance/`):
- `hooks/hooks.json` (Einträge nach `.claude/settings.json` übernehmen, `${CLAUDE_PLUGIN_ROOT}` auf den Projektpfad umschreiben)
- `hooks/sg-python.sh`
- `hooks/security_reminder_hook.py`
- `hooks/ensure_agent_sdk.py`
- `hooks/_base.py`
- `hooks/llm.py`
- `hooks/gitutil.py`
- `hooks/diffstate.py`
- `hooks/extensibility.py`
- `hooks/patterns.py`
- `hooks/reporesolve.py`
- `hooks/review_api.py`
- `hooks/session_state.py`
- dazu `.claude-plugin/plugin.json` (wird für die Versionsnummer gelesen: `_base.py:231-240`, `ensure_agent_sdk.py:689-698`; fehlt sie, kommt 0 heraus, das ist harmlos) und `LICENSE` (Apache 2.0, muss beiliegen)
- `tests/` ist nicht nötig.

[Vermutung] Wer nur Ebene 1 (Regex-Warnungen) will, braucht trotzdem alle Module, weil `security_reminder_hook.py:83-146` alle importiert. Abschalten geht dann über `ENABLE_CODE_SECURITY_REVIEW=0`.

### Begründung der Empfehlung
Offizielle Anthropic-Quelle, sauberer und defensiver Code (Git-Härtung, Ausschluss von Secrets, Reviewer nur mit Lesewerkzeugen), kein Schadcode gefunden. Weil das Plugin aber zur Laufzeit ungepinnt aus PyPI installiert und Code an den Modell-Endpunkt schickt, empfehle ich einen gestuften Start: zuerst Pattern-Warnungen ohne LLM, die LLM-Reviews erst nach Freigabe durch den Betreiber. Wie der Marktplatz in einer Cloud-Session ohne `/plugin` zu aktivieren ist, muss der Orchestrator klären.

---

## 2. frontend-design

### Gelesene Dateien (alle vollständig)
- `.claude-plugin/plugin.json` (9)
- `README.md` (31)
- `skills/frontend-design/SKILL.md` (71)
- `skills/frontend-design/LICENSE.txt` (177): Apache 2.0 ohne Anhang
- `LICENSE` (202): md5 gleich der Root-`LICENSE`

### Befunde [belegt]
- Das Frontmatter von `SKILL.md:1-5` enthält nur `name`, `description` und `license`. **Kein `allowed-tools`**, also keine zusätzlichen Rechte.
- Keine `!`-Blöcke, keine Skripte, keine Hooks, keine MCP-Server, keine URLs zum Laden. Die einzige URL steht im README als Leseverweis (`README.md:26`, Cookbook auf github.com).
- Keine Injection gefunden. Für uns relevante Inhalte:
  - `SKILL.md:13`: „confirm with the client", kann bei Sub-Agenten Rückfragen auslösen
  - `SKILL.md:45`: „the brief's own words always win". Das passt zu unserem verbindlichen Markendesign (BRIEFING Abschnitt 1).
  - `SKILL.md:59`: Mindeststandard „responsive, visible keyboard focus, reduced motion respected". Das passt zu BRIEFING Abschnitt 5.
- Ausgeführt wird beim Aktivieren nichts. Die Skill-Beschreibung wird geladen, der Text bei Bedarf.

### Aktivieren ohne `/plugin`
Die Dateien beschreiben keine Aktivierung außer „Claude automatically uses this skill" (`README.md:7`). **Dateiliste für die Kopie:** `skills/frontend-design/SKILL.md` und `skills/frontend-design/LICENSE.txt` nach `.claude/skills/frontend-design/`.

### Begründung
Reiner Text, keine Rechte, keine Ausführung, offizielle Quelle, Apache 2.0. Eine Kopie ins Repo ist hier die sicherste Form, weil sie versioniert und unveränderlich ist. Hinweis: In der Skill-Liste dieser Session gibt es `frontend-design` nicht; es ist also noch nicht verfügbar.

---

## 3. playwright

### Gelesene Dateien (alle vollständig)
- `.claude-plugin/plugin.json` (7)
- `.mcp.json` (6)

Mehr Dateien gibt es nicht: kein README, keine Lizenz.

### Was beim Start ausgeführt wird [belegt]
- `.mcp.json:3-4`: `"command": "npx", "args": ["@playwright/mcp@latest"]`
- Bei jedem Start von Claude Code holt npx die **jeweils neueste** Version von npm und führt sie lokal mit den Rechten der Session aus. Die Version ist **nicht gepinnt**, der Inhalt ist nicht durch den Marktplatz-Commit festgelegt.
- Hosts: die npm-Registry beim Start. Danach jede Seite, die der Browser auf Anweisung von Claude öffnet.
- API-Keys: keine.

[Vermutung] `@playwright/mcp` bringt eventuell eigene Browser-Builds bzw. Versionsanforderungen mit, die nicht zum vorinstallierten Chromium passen. Das konnte ich nicht prüfen, weil das Paket nicht im Klon liegt.

### Nutzen bei uns
Gering. `@playwright/test` und Chromium sind im Container vorhanden. `qa-verifier` und `a11y-perf-tester` können Screenshots, A11y-Checks (z. B. `@axe-core/playwright`) und E2E direkt über Testskripte machen. Das ist reproduzierbar und gepinnt über `package-lock.json`.

### Risiken
- Lieferkette über `@latest`
- Fremdcode mit Browser-Steuerung im Session-Kontext
- Der Marktplatz-Eintrag hat kein `author`-Feld (`marketplace.json:2930-2935`) und liegt unter `external_plugins/`. Laut `README.md:18` sind das Drittanbieter-Plugins aus der Zeit vor der Umstellung auf das Verzeichnis.

### Empfehlung
**Nicht nötig.** Falls später doch ein interaktiver Browser über MCP gebraucht wird: eigene `.mcp.json` im Repo mit fester Version (`@playwright/mcp@<x.y.z>`), vorher das Paket prüfen.

---

## 4. context7

### Gelesene Dateien (alle vollständig)
- `.claude-plugin/plugin.json` (7)
- `.mcp.json` (8)
- `README.md` (35)

### Was beim Start ausgeführt wird [belegt]
- `.mcp.json:2-6`: `"type": "http", "url": "https://mcp.context7.com/mcp?client=claude-code-plugin"`
- Lokal wird **nichts** ausgeführt, es gibt kein npx.
- Hosts: `mcp.context7.com` (Upstash, Drittanbieter). Übertragen werden Bibliotheksnamen und Suchfragen (`README.md:9-10`, Tools `resolve-library-id` und `query-docs`). Je nachdem, wie Claude fragt, kann das Projektkontext enthalten [Vermutung].

### Widersprüche [belegt]
- `README.md:14-21` sagt, `CONTEXT7_API_KEY` werde „automatically" übernommen. Die `.mcp.json` (Zeile 1–8) enthält aber **keinen** Header und keinen Verweis auf eine Umgebungsvariable.
- `plugin.json:3` sagt „Authenticate with Context7 when prompted", die Marktplatz-Beschreibung (`marketplace.json:1121`) sagt „Works anonymously out of the box".
- Ob ein Key nötig ist, bleibt damit unklar. Ohne Key gelten anonyme Rate-Limits (`README.md:14`).

### Risiken
- Datenabfluss an einen Drittanbieter; Datenschutz und DSGVO sind aus den Dateien nicht beurteilbar.
- Der Inhalt des Fernservers kann sich jederzeit ändern, ist also nicht pinnbar. Die Antworten landen als nicht vertrauenswürdiger Text im Kontext, ein möglicher Weg für Prompt-Injection [Vermutung].
- Tag `community-managed` (`marketplace.json:1128-1130`).

### Empfehlung
**Nicht nötig.** Aktuelle Doku lässt sich über `node_modules/*/README`, Typdefinitionen oder gezieltes WebFetch der offiziellen Doku holen. Freischalten nur nach ausdrücklicher Freigabe durch den Betreiber (externer Dienst, BRIEFING 0A, Regel 7).

---

## 5. ch-bas/threejs-sims-house-builder (nur Kurzprüfung)

Commit `0db3a930d6f39341e6bea0a6613a2fc6d7bdd964`, letzter Commit 2026-11-15T21:45:31+01:00 von Bassem Chagra, `package.json` Version 1.37.0, `CHANGELOG.md` 149 KB. Gelesen: `LICENSE`, `package.json`, `README.md` (Anfang), `components/room-organizer/assets/README.md`, Dateiliste.

- **Lizenz:** MIT, Copyright 2026 Bassem Chagra (`LICENSE:1-3`). Assets:
  - `people.glb`: CC0 1.0 (Quaternius, `assets/README.md`)
  - Schriften: OFL (`app/fonts/Nunito-OFL.txt`, `Sora-OFL.txt`)
  - Fremdlizenzen in `scripts/licenses/` (core-js, object-assign, whatwg-fetch)
- **Größe:** 681 Dateien, 9,3 MB ohne `.git`, rund 83.000 Zeilen TS/TSX/MJS ohne Tests:
  - `components/room-organizer/lib` 31k
  - `panels` 16k
  - `hooks` 15k
  - `three` 15k
  - `canvas-2d` 2,3k

  Die Angabe „klein" im BRIEFING (Abschnitt 3, Zeile 148) stimmt nicht.
- **Stack:** Next.js 15, React 18, Three.js ^0.186.1, zustand, Tailwind 3 (`package.json:31-41`). Läuft vollständig im Browser, ohne Backend (`README.md`).
- **Eignung als Ideenquelle:** gut. Zum Ansehen für den Raumplaner (BRIEFING Abschnitt 7):
  - 2D-Grundriss (`canvas-2d/plan-edit.ts`, `opening-symbol.ts`, `stairs-symbol.ts`)
  - Wände und Öffnungen, Snapping, Undo/Redo
  - Export (JSON, GLB, SVG, DXF)
- **Sicherheit (Kurzblick):**
  - Keine `CLAUDE.md`, `AGENTS.md`, `.claude/` oder `.mcp.json` gefunden
  - Grep nach „ignore previous", „you are an AI", „Claude", „Anthropic" ohne Treffer
  - Build-Skripte (`postbuild` mit `node scripts/*.mjs`, `start` mit `npx --yes serve@14`, `package.json:22-23`) sind nur relevant, wenn jemand sie ausführt. **Nicht ausführen.**
- **Empfehlung:** nur als Ideenquelle, keine Abhängigkeit. Übernommene Teile mit MIT-Hinweis in `THIRD-PARTY-LICENSES.md` (wie im BRIEFING vorgesehen).

---

## Nicht prüfbar / Unsicherheiten

1. **Stars, Forks, Contributors** beider Repos: GitHub-API gibt HTTP 403, aus dieser Umgebung nicht abrufbar. Nichts geschätzt.
2. **security-guidance, nicht vollständig gelesen:** `llm.py` 1628–1904 (Review-Rubrik, `analyze_code_security`) und 2624–2870 (Self-Refute, `analyze_security_concerns`); `security_reminder_hook.py` größtenteils; `gitutil.py` größtenteils; `diffstate.py` nur Grep. Grep auf Netzwerk, Prozesse, Verschleierung und Secret-Pfade war dort unauffällig. Alle `subprocess`-Aufrufe sind `git` mit festen Argumenten bzw. eigene Python-Skripte. Eine Zeile-für-Zeile-Lektüre dieser rund 9.000 Zeilen fehlt aber.
3. **Pakete zur Laufzeit** sind nicht prüfbar, weil sie nicht im Klon liegen: `claude-agent-sdk` (PyPI, ungepinnt) und `@playwright/mcp@latest` (npm). Ebenso der Fernserver `mcp.context7.com`.
4. **Aktivierung in Cloud-Sessions ohne `/plugin`:** Die gelesenen Dateien beschreiben keinen Weg über `.claude/settings.json`. Ob und wie ein Marktplatz-Plugin dort per Konfiguration aktiviert werden kann, muss der Orchestrator in der offiziellen Claude-Code-Doku prüfen. Ich habe dazu nichts angenommen.
5. Ob Claude Code den Hooks von `security-guidance` in **dieser** Umgebung Zugangsdaten übergibt, ist offen. In meiner Shell sind `ANTHROPIC_API_KEY` und `ANTHROPIC_AUTH_TOKEN` nicht gesetzt, `ANTHROPIC_BASE_URL` dagegen schon. Ohne Zugangsdaten laufen laut `README.md:62` nur die Pattern-Warnungen.
6. Wann die einzelnen Plugin-Ordner zuletzt geändert wurden, lässt sich wegen des flachen Klons nicht bestimmen.
7. **Gefundene Anweisungen an mich in den Klonen:** keine. Hinweise, die Claude-Code-Hooks an Claude ausgeben (`hooks.json:43`, `:94`; `review_api.py:368-398`), sind Plugin-Funktion und keine Injection.
