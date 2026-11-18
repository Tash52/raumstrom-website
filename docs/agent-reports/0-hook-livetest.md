# Hook-Live-Test (Phase 0 Nachtrag), qa-verifier, 2026-11-18

1. Write `src/x.txt` blockiert: "PreToolUse:Write hook error: [command hook]: agent-guard: qa-verifier darf im Projekt nur unter docs/ schreiben (nicht: src/x.txt). Befunde gehen an den bauenden Agenten zurück."
   Kontrolle: `ls src/x.txt` ergibt "No such file or directory". Datei ist nicht entstanden.
2. `git -C ... stash list` blockiert (Fehlalarm, ist nur lesend): "agent-guard: qa-verifier darf den Git-Stand nicht verändern (nur lesen und testen)."
   `git -C ... tag hooktest` blockiert, gleiche Meldung (erwartet).
   Gegenproben: `git stash list` ohne -C ebenfalls blockiert, `git tag -l` ebenfalls blockiert. `git status --short` läuft (exit 0, Arbeitsbaum sauber).
   Schluss: Der Guard sperrt die Unterbefehle `stash` und `tag` pauschal, auch lesende Varianten (`stash list`, `tag -l`). Kein Sicherheitsproblem, aber zu streng.
   Empfehlung (Zuständig: Orchestrator/Hook-Pflege): `stash list|show` und `tag -l|--list` als lesend zulassen.
3. Skill `anthropic-skills:verification-before-completion` war bereits im Kontext (Beleg: erste Überschrift "# Verification Before Completion", Kernsatz "Evidence before claims, always."). Kein separater Skill-Aufruf nötig.
