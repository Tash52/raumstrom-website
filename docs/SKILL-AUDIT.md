# Skill- und Plugin-Audit

Stand: 18.11.2026 · Verfahren: Briefing Abschnitt 3 · Status: **vom Betreiber freigegeben am 18.11.2026** (Empfehlungen der Tabelle). Erledigt: Zeile 1 und 5 kopiert und in Agenten eingetragen. Offen: Zeile 6–8 (SEO, Anpassung in Phase 1).

Geprüft durch drei `skill-auditor`-Läufe (nur lesen, nichts ausgeführt, nichts installiert). Der Orchestrator hat jeweils Stichproben gegen die Klone gemacht (Commit-Hashes, zitierte Zeilen, Lizenzen) und alle bestätigt. Details:
- `docs/agent-reports/0-skill-auditor-a-offiziell.md`
- `docs/agent-reports/0-skill-auditor-b-threejs.md`
- `docs/agent-reports/0-skill-auditor-c-security-seo.md`

**Wichtig für die Form der Übernahme:** Eine Cloud-Session installiert keine Plugins, die ein Repo in `.claude/settings.json` einträgt (laut Claude-Code-Doku). Der `/plugin`-Befehl fehlt dort ebenfalls. Übernommen wird deshalb nur als **geprüfte Kopie** unter `.claude/skills/<name>/`, mit Quelle, Commit-Hash und Lizenzdatei. Das wirkt lokal und in der Cloud gleich und hat keinen Update-Kanal.

## Entscheidungstabelle

| # | Skill / Plugin | Quelle · Commit | Lizenz | Befund | Empfehlung |
|---|---|---|---|---|---|
| 1 | `frontend-design` | anthropics/claude-plugins-official · `f59aa2e` | Apache-2.0 | reiner Text, keine Werkzeugrechte, keine Skripte | **übernehmen** (SKILL.md + LICENSE.txt) |
| 2 | `security-guidance` | ebd. · `f59aa2e` | Apache-2.0 | kein Schadcode; installiert beim Start `claude-agent-sdk` per pip ohne feste Version, sendet Diffs an ein Modell (kostet Kontingent); lädt als Plugin in der Cloud ohnehin nicht | **nicht verwenden**. Ersatz: eigener Skill `security-and-hardening` (bei `backend-api`, `security-auditor`) und Semgrep |
| 3 | `playwright` | ebd. · `f59aa2e` | keine Lizenzdatei | startet bei jedem Start `@playwright/mcp@latest` (ungepinnt) | **nicht nötig**, `@playwright/test` und Chromium sind vorhanden |
| 4 | `context7` | ebd. · `f59aa2e` | keine Lizenzdatei | Fernserver `mcp.context7.com`, Anfragen gehen an Drittanbieter | **nicht nötig**, Doku-Hosts sind in der Cloud-Umgebung freigegeben |
| 5 | `threejs-skills`, 12 von 13 Skills | CloudAI-X/threejs-skills · `0e18186` | MIT | nur Markdown, 0 schädliche Befunde. Vier Skills empfehlen fremde Hosts (jsDelivr-Import-Maps, Draco-Decoder von gstatic, CDN-Assets) | **übernehmen**, dazu feste Projektregel in `CLAUDE.md`: Decoder, Schriften, HDRs lokal. Skill `animation` weglassen |
| 6 | `seo-local` | AgriciDaniel/claude-seo · `468ed5b` | MIT | reines Markdown, US-zentriert, verweist auf kostenpflichtiges DataForSEO | **übernehmen, angepasst**: DataForSEO raus, deutsche Verzeichnisse und § 5b UWG ergänzen |
| 7 | `seo-schema` | ebd. · `468ed5b` | MIT | reines Markdown; optionales Prüfskript nur mit Standardbibliothek, ohne Netzwerk | **übernehmen** (Skript erst nach vollständiger Lektüre) |
| 8 | `seo-technical` | ebd. · `468ed5b` | MIT | enthält Skriptaufrufe, Proxy-Konfiguration, einen nicht prüfbaren CVE-Abschnitt | **übernehmen, gekürzt** (diese Teile streichen) |
| 9 | `seo` (Orchestrator) | ebd. · `468ed5b` | MIT | braucht Python-venv, Chromium, bis zu 15 Subagenten; hängt Werbe-Footer mit skool.com-Links an Berichte (`skills/seo/SKILL.md:159-202`). Plugin-Installation brächte immer alle 29 Skills, 20 Agenten und einen Hook mit | **ablehnen** |
| 10 | `insecure-defaults` | trailofbits/skills · `149d7b2` | CC BY-SA 4.0 | harmlos, aber kein Skill, sondern ein Workflow mit 8+ Opus-Subagenten | **nicht kopieren** (siehe Lizenzhinweis) |
| 11 | `static-analysis` / semgrep | ebd. · `149d7b2` | CC BY-SA 4.0 | sauber, Telemetrie aus; Regel-Registry semgrep.dev hier gesperrt | **nicht kopieren**. Stattdessen Semgrep (Open-Source-CLI, gepinnt) direkt durch `security-auditor` |
| 12 | `static-analysis` / codeql | ebd. · `149d7b2` | CC BY-SA 4.0 | Programm fehlt, Download gesperrt, Build-Fixes führen `npm install` im Projekt aus | **ablehnen** |
| 13 | `supply-chain-risk-auditor` | ebd. · `149d7b2` | CC BY-SA 4.0 | Code unbedenklich; sendet Paketnamen an osv.dev, deps.dev, scorecard.dev, npmjs.org (hier gesperrt), liest `gh auth token` | **vorerst nicht**. Ersatz: `npm audit`, Lizenzprüfung, Dependabot |
| – | `threejs-sims-house-builder` | ch-bas · `0db3a93` | MIT | Ideenquelle, aber nicht klein: 681 Dateien, ca. 83.000 Zeilen | **nur Referenz**, keine Abhängigkeit, Lizenzhinweis bei Übernahme von Code |

**Lizenzhinweis Trail of Bits:** CC BY-SA 4.0 verlangt bei Weitergabe angepasster Fassungen dieselbe Lizenz. Ob eine Kopie in ein privates Repo schon „Weitergabe" ist, beantwortet der Lizenztext nicht. Mit dem Ersatz in Zeile 11 und 13 stellt sich die Frage nicht.

**Auffälligkeit (nicht übernommen):** Das Trail-of-Bits-Plugin `devcontainer-setup` setzt `bypassPermissions` (`post_install.py:94-109`). Es gehört nicht zur Auswahl und wird nicht verwendet.

## Bereits vorhanden (Account des Betreibers, keine Prüfung nötig)
`design-taste-frontend`, `ui-ux-pro-max`, `modern-web-design`, `gsap-scrolltrigger`, `animate`, `lightweight-3d-effects`, `emil-design-eng`, `apple-design`, `security-and-hardening`, `verification-before-completion`. Sind bereits in den Agenten-Dateien eingetragen.

## Nach Freigabe
1. Freigegebene Dateien unverändert bzw. mit dokumentierten Anpassungen nach `.claude/skills/<name>/`, je eine `QUELLE.md` (Repo, Commit, Lizenz, Änderungen).
2. Vor der Kopie werden die nur per Grep geprüften Dateien der übernommenen Skills vollständig gelesen (u. a. SEO-Referenzen).
3. `skills:` in den Agenten-Dateien ergänzen (`design-system`, `page-builder`, `motion-3d`, `planner-*`, `seo-specialist`).
4. Projektregeln aus Zeile 5 in `CLAUDE.md` (Phase 1, `architect`).
5. Klone in `/tmp` löschen.
