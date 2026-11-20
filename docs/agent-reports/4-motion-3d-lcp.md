# Phase 4 · motion-3d · LCP /kontakt/ (N1 aus 3-qa-nachpruefung.md)

Branch `worktree-agent-a707434283d6cb32b`, Code-Commit `7fa51a7`.

## Änderung
- `src/lib/motion/index.ts`: GSAP (`scroll.*.js`, 115 KB roh / ca. 41 KB übertragen) lädt nicht mehr pauschal, sobald ein `[data-leitung]` im DOM steht.
  - `[data-journey]` vorhanden (Startseite): sofort wie bisher, die Journey pinnt und braucht ScrollTrigger früh.
  - Sonst beobachtet ein IntersectionObserver die Sections mit `[data-leitung]` und alle `[data-prozess]`, mit `rootMargin: 0px 0px 50% 0px`. GSAP lädt also eine halbe Viewporthöhe, bevor eine Linie ihren Startpunkt (`top 82%`) erreicht. Die statische Zeichnung springt dadurch nicht sichtbar zurück.
  - Formularseiten (`/^\/kontakt(\/|$)/`, also `/kontakt/`, `/kontakt/danke/`, `/kontakt/fehler/`): `[data-leitung]` löst GSAP nie aus. Die Linien bleiben dort vollständig statisch gezeichnet, wie ohne JS. Ein `[data-prozess]` würde dort weiter laden, aktuell gibt es keins.
  - Kein IntersectionObserver vorhanden: Laden wie bisher.
  - Schutz gegen doppeltes Laden (`laedt`). Beim Umschalten auf Reduced Motion wird der Observer getrennt.
- `src/lib/motion/scroll.ts` (Nebenfund, belegt): Knoten (`[data-leitung-knoten]`) und Prozess-Schritte gingen ganz unten auf der Seite alle wieder aus. Ursache: `toggleClass` mit `end: 'max'` ist bei progress 1 inaktiv. Jetzt setzt `einschalten()` die Klasse `ist-an` über `onToggle`/`onRefresh` mit `progress > 0`. Beim Abbau wird `ist-an` entfernt.
- Reduced Motion und No-JS unverändert: Reduced Motion bricht vor jedem Observer ab, ohne JS gibt es weder GSAP noch `leitung-aktiv`.

## Belege (Playwright gegen `dist`, Server lokal)
Netzwerk und Zustand nach `load` und 1,5 s Wartezeit, danach 12 × 600 px gescrollt. Desktop Chrome und Pixel 7:
- `/kontakt/`, `/kontakt/danke/`: 0 Requests auf `scroll.*.js`, auch nach dem Scrollen nicht. `html` ohne `leitung-aktiv`, `transform` der Linien `none`.
- `/`: GSAP-Request nach ca. 100 ms (Journey), `leitung-aktiv` gesetzt. Beim Scrollen wächst `scaleY` der jeweils sichtbaren Linie (z. B. 0 → 0,18 → 0,58 → 0,98 → 1), danach folgt die nächste. Knoten schalten nacheinander ein, Desktop 8/8.
- `/leistungen/wallbox/`: vor dem Scrollen kein GSAP (die erste Linie liegt außerhalb der Reichweite), nach dem Scrollen 1 Request. Linien zeichnen sich section-weise. Am Seitenende 4/4 Knoten an (vorher 0/4).
- Reduced Motion (`/leistungen/wallbox/`): 0 GSAP-Requests, kein `leitung-aktiv`.

E2E `tests/e2e/motion-3d.spec.ts`: 26 bestanden, 2 übersprungen (Projektfilter). Neu sind die Tests „Formularseite: kein GSAP …“ und „Leitung lädt GSAP erst in Sichtweite …“ (inklusive Knoten am Seitenende). Im Test „Prozess-Leitung“ wird jetzt zuerst zum Prozess gescrollt, weil `prozess-aktiv` erst in Sichtweite gesetzt wird.
Gesamtlauf: 185 bestanden, 5 übersprungen, 10 fehlgeschlagen. Alle Fehlschläge liegen in `kontakt-api.spec.ts` und gehen auf Mailpit zurück: Docker fehlt, für `globalSetup` lief nur ein Stub, der `/api/v1/info` beantwortet. Die Tests haben keinen Bezug zu Motion.
`npm test` 331/331 plus Hook-Tests 7/7, `npm run check` 0 Fehler, `npm run build:staging` grün.

## Lighthouse Mobil (Lighthouse 12.8.2, Standard-Drosselung, je 5 Läufe, gleiche Umgebung)
Format: Perf / LCP ms / TBT ms. „GSAP“ = Startzeit des Requests im Trace.

| Seite | vorher (HEAD~1, hier gemessen) | nachher |
|---|---|---|
| `/kontakt/` | LCP 1807 / 1952 / 1953 / 2101 / 1801, **Median 1952**, GSAP in jedem Lauf (65–134 ms) | LCP 1955 / 1953 / 1952 / 1953 / 1953, **Median 1953**, **kein GSAP** |
| `/leistungen/wallbox/` | Median 1957 (1951–2077), GSAP in jedem Lauf | **Median 1802** (1801–1803), kein GSAP |
| `/` | (QA: Median 2108) | Median 2220 (2102–2233), GSAP wie bisher sofort (Journey) |

Einordnung:
- `/kontakt/` liegt jetzt in allen 5 Läufen unter 2,0 s. Den Ausreißer von 2101 ms gibt es nicht mehr. Der Median ist hier aber gleich geblieben, schon vorher lag er in dieser Umgebung bei 1952 ms. Lanterns LCP springt in Stufen von etwa 150 ms. Der Abstand zum Ziel bleibt mit rund 47 ms knapp.
- Damit hängt der LCP auf `/kontakt/` nicht mehr von GSAP ab. Die übrigen Hebel liegen bei anderen Agenten (siehe Offen).
- Startseite: keine Änderung am Ladeverhalten (Journey lädt sofort). Die Streuung 2102–2233 entspricht der QA-Messung (2101–2232).

## Offen
- design-system: Schriften vor dem LCP (4 Woff2, zwei Preloads, `src/layouts/BaseLayout.astro`). Größter verbleibender Hebel auf `/kontakt/` und `/`.
- backend-api: Altcha-Widget (89 KB roh) erst bei Fokus oder Sichtbarkeit des Formulars laden.
- Startseite LCP knapp über 2,0 s: GSAP wird dort für die Journey gebraucht. Es ließe sich auch dort per Observer an `[data-journey]` binden (erst laden, wenn die Journey in die Nähe kommt). Das ändert das Pin-Verhalten beim Direktsprung per Anker und ist hier bewusst nicht umgesetzt (eigener Auftrag, falls gewünscht).
- Springt man per Anker oder Tastatur (`Ende`) direkt hinter alle Linien, lädt GSAP erst, wenn man wieder durch eine Section scrollt. Bis dahin bleiben die Linien statisch voll gezeichnet, was dem korrekten Endzustand entspricht.

## Nachtrag: Befund B3 (GSAP auf /raumplaner/)
- `src/lib/motion/index.ts`: neue Ausnahme `WERKZEUG_SEITE` (`/raumplaner/`, `/planer/…`). Dort liefert `scrollZiele` keine Ziele, weder Leitungen noch Prozesslisten; GSAP (`scroll.*.js`, 41,6 KB) wird nie geladen, die Linien bleiben statisch gezeichnet. Keine Seitenänderung nötig.
- Beleg: neuer E2E-Test „Raumplaner: kein GSAP …“ in `tests/e2e/motion-3d.spec.ts` (Desktop und Mobil grün): 0 Requests auf `scroll.*.js` nach Scrollen bis zum Seitenende, keine `leitung-aktiv`; Gegenprobe Startseite lädt GSAP genau einmal (unverändert).
- `npm test` (402), `npm run check`, `npm run build:staging`, motion-3d-E2E (28 grün, 2 projektbedingt übersprungen, `E2E_MAILPIT=extern` mit Stub auf 8025) grün.
