# Phase 1 · Zusammenfassung

Stand: 18.11.2026 · Ergebnis: **abgenommen** durch `qa-verifier` (Bericht `1-qa-verifier.md`, inkl. Nachprüfung)

## Was jetzt da ist
- **Gerüst (architect):** Astro 7.4, exakt gepinnte Abhängigkeiten, 12 Content Collections mit zod-Schemas, `firma/features/gewerke.yaml` mit Platzhaltern (GbR, raumstrom.de, neun Orte als Entwurf), Keystatic nur in der Entwicklung.
- **Sicherheit von Anfang an:** eigener Node-Server sendet alle Security-Header, CSP nur mit Hashes (kein `unsafe-inline`), startet nicht ohne Pflicht-Secrets, `/keystatic` und `/styleguide/` im Produktions-Build 404.
- **Prüfwerkzeuge:** Launch-Check (bricht `npm run build` ab, solange Platzhalter offen sind, aktuell 56), Wording-Scan, Lizenzprüfung, Audit mit begründeter Ausnahmeliste, CI (GitHub Actions) und Dependabot.
- **Design-System (design-system):** Farb-, Typo-, Abstands- und Bewegungs-Tokens (hell/dunkel, Reduced Motion), Schriften lokal (Archivo, IBM Plex Mono), 5 Logo-Varianten (austauschbarer Nachbau), 17 Basis-Komponenten inkl. `GewerkeHinweis`, Header/Footer/Skip-Link, Styleguide-Seite.
- `CLAUDE.md` als Projektwissen für alle Agenten; `docs/UEBERGABE.md` ist damit ersetzt und gelöscht.

## Prüfergebnis
Unit 148/148 + Hook 7/7, E2E 49 grün (3 gewollt übersprungen), Typen 0 Fehler, Lighthouse mobil 100/100/100/100, axe 0 Verstöße, 0 Fremd-Requests.

## Entscheidungen
- Betreiber: Lizenz-Ausnahmen lightningcss und y-provider freigegeben.
- Orchestrator: picomatch-Lücke (keine gepatchte Version, zur Laufzeit nicht geladen) als Audit-Ausnahme bis 31.12.2026; Header/Footer gehören design-system; „Beste Grüße" im Wording-Scan erlaubt; Hook lässt lesende `git stash list`/`git tag -l` zu.

## Offen für später
- Echte Logo-Datei, Kontakt in `security.txt`, alle `[[PLATZHALTER]]` (siehe `PLATZHALTER.md`).
- „Modernisierung aus einer Hand" rechtlich bewerten (legal-compliance, Phase 2).
- SEO-Skills aus claude-seo zu Beginn von Phase 7.
