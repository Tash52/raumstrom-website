# Übergabe an die nächste Session

Stand: 18.11.2026, Ende Phase 0. Dient nur dem Start der nächsten Session; nach Abschluss von Phase 1 löschen (Inhalt steht dann in `CLAUDE.md`).

## Erledigt (Phase 0)
- Repo `Tash52/raumstrom-website` (privat), Cloud-Umgebung „raumstrom-website" mit 15 freigegebenen Hosts.
- Domain: `raumstrom.de` laut DENIC-RDAP am 16.11.2026 frei → in `firma.yaml` vorbelegen.
- Plan freigegeben: `docs/UMSETZUNGSPLAN.md` (Empfehlungen zu Frage 3–9 gelten: Astro 7, Lizenz-Ausnahmen GSAP/libheif/sharp/axe-core dokumentieren, Skills als Kopie, CI mit GitHub Actions + Dependabot, GbR als Annahme, neun Orte als Entwürfe).
- Skill-Audit freigegeben: `docs/SKILL-AUDIT.md`. Kopiert und byte-gleich mit den geprüften Commits: `frontend-design`, 12 `threejs-*`-Skills (`.claude/skills/`, je mit `QUELLE.md`).
- 17 Agenten in `.claude/agents/`, gemeinsame Regeln in `docs/AGENTEN-REGELN.md`, Hook `.claude/hooks/agent-guard.mjs` (Test: `node --test .claude/hooks/agent-guard.test.mjs`).

## Offen, zu Beginn der nächsten Session
1. **Hook live prüfen:** einmal `qa-verifier` mit einem Mini-Auftrag starten, der versucht, `src/x.txt` zu schreiben. Erwartung: blockiert. Danach prüfen, ob die vorgeladenen Skills im Agenten ankommen (sonst ruft er sie per Skill-Tool auf, siehe AGENTEN-REGELN).
2. **SEO-Skills (Audit-Zeile 6–8):** `AgriciDaniel/claude-seo` @ `468ed5b0d9e3249394783710e54abb02837e326b` neu nach `/tmp` klonen, `seo-local`, `seo-schema`, `seo-technical` samt Referenzen **vollständig lesen**, angepasst nach `.claude/skills/` kopieren (Anpassungen in `docs/agent-reports/0-skill-auditor-c-security-seo.md`), `QUELLE.md` mit Änderungsliste, dann in `seo-specialist.md` eintragen. Kann auch zu Beginn von Phase 7 erfolgen.
3. **Phase 1 starten:** `architect` mit dem Briefing aus `docs/UMSETZUNGSPLAN.md` Abschnitt 4 (Phase 1a), danach `design-system` (1b), Abnahme `qa-verifier`. Zusätzlich in `CLAUDE.md` die Projektregel aus Audit-Zeile 5: keine CDN-/Fremd-Hosts, Draco-/Basis-Decoder, Schriften (auch drei `Text`) und HDRs (statt `Environment preset`) lokal.
