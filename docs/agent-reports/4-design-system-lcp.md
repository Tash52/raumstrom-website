# Phase 4 · design-system · LCP /kontakt/: Schriften vor dem LCP

Auftrag: Befund N1 aus `3-qa-nachpruefung.md` (LCP `/kontakt/` Median 2,10 s, Ziel < 2,0 s), Anteil Schriften.

## Ergebnis (belegt)

Lighthouse 12 Mobil (Standard-Drosselung, Chromium 1243), lokaler Server (`server/server.mjs`, Staging-Build), 9 Läufe je Seite, Median:

| Seite | vorher LCP | nachher LCP | Schriften vor dem LCP vorher → nachher | CLS vorher / nachher |
|---|---|---|---|---|
| `/kontakt/` | 2105 ms (1808–2187) | **1898 ms** (1502–2009) | 4 (61+18+19+15 KB) → **1** (Archivo Latin, 61 KB) | 0 / 0 |
| `/` | 2226 ms (1959–2276) | 2029 ms (2026–2170) | 4 → 3 (Archivo, Plex Regular Latin1, Plex Medium Latin1) | 0 / 0 |

Perf-Mittel `/kontakt/` 98,4 → 99,3, `/` 98,4 → 98,8. Der Vorher-Median passt zur QA-Messung (2101 ms).
„Vor dem LCP“ = Anfrage startet vor dem beobachteten LCP im Lighthouse-Trace (diese Requests rechnet Lantern ein).

Gegenprobe mit Playwright (Slow-4G-ähnlich, CPU ×4, 412 px und 1440 px): `/kontakt/` lädt vor dem LCP nur Archivo Latin. Die beiden Plex-Dateien kommen erst beim Scrollen zum Footer (bei ca. 3,1 s). CLS bis einschließlich Scrollen zum Footer: mobil 0,0001 → 0,0001, Desktop 0,0096 → 0,0000. `/` mobil 0,0331 vorher und nachher gleich, die Ursache liegt nicht bei den Schriften (Verschiebung beim Scrollen durch die Startseite).

## Ursache (belegt)

- Preload Plex Regular Latin1 (`BaseLayout.astro:27`, `:41`), obwohl auf keiner der beiden Seiten Mono-Text im ersten Viewport steht.
- Plex Medium Latin1 und Medium Pi lädt Chrome bei der ersten Layoutberechnung für die Footer-Titel (`h2.fuss-titel`, 500). Für den Footer reicht dabei, dass er im Layout steht, sichtbar muss er nicht sein.
- Die Pi-Datei kam nur durch `hyphens: auto` (erbt `h2`). Chrome fragt dafür U+2010 (HYPHEN) an, und das liegt im Pi-Bereich.
- Nur den Preload zu entfernen (Variante A, gemessen) ändert nichts: weiterhin 4 Dateien (auf `/` sogar 5), Median `/kontakt/` 2102 ms.

## Änderungen

- `src/layouts/BaseLayout.astro`: genau ein Preload (Archivo Latin, variable Schrift für Überschriften und Text, also auch für den LCP-`<p>`). Weiter über `fontData` aus `astro:assets`. Der `preload`-Filter von `<Font>` kann beim lokalen Provider Latin und Latin-Ext nicht trennen (kein `subset`), geprüft gegen Astro 7.4.12 (`components/Font.astro`, `filter-preloads.js`) und docs.astro.build.
- `astro.config.mjs` (Block `fonts`): Der Plex-Pi-`unicode-range` lässt U+2010 aus. Blink trennt dann mit U+002D aus Latin1. In Plex sind die Glyphen identisch (fontTools: gleiche Breite und gleiche Konturgrenzen, Regular und Medium). Geprüft per CDP `getPlatformFontsForNode`: Getrennter Mono-Text nutzt nur Plex, ohne Courier-Ersatz und ohne Pi-Request. `display: 'swap'` bleibt mit Begründung im Kommentar.
- `src/components/layout/Footer.astro`: `content-visibility: auto` auf `.fuss-raster` und `.fuss-unten` mit `contain-intrinsic-size: auto …` je Breakpoint (gemessen: 720/652/398 px bzw. 43 px). Wegen der Paint-Containment bekommt das Raster `--fokus-raum` (Innenabstand plus negativer Außenabstand), damit der Fokusring (2 px + 3 px Abstand + 6 px Glow) nicht abgeschnitten wird. Die Trennlinie oben ist dafür ein Hintergrund in Containerbreite, unter `forced-colors` wieder ein `border-top`. Footer-Linie, Claim und `view-transition-name` bleiben unberührt. Im Screenshot (390/1440) sieht der Footer aus wie vorher, der Fokusring ist vollständig zu sehen.
- `src/assets/fonts/README.md`: Preload- und Display-Regeln nachgetragen.
- `tests/e2e/design-system.spec.ts`: Erwartet jetzt genau 1 Font-Preload, und zwar auf die Archivo-Latin-Datei.

## font-display (geprüft)

Für Plex wurde `optional` gemessen (Variante A) und verworfen. Request-Zeitpunkt und LCP ändern sich damit nicht. Beim ersten Besuch stünden Footer und Labels aber die ganze Seitenansicht über in Courier. `swap` verzögert den LCP nicht, weil Plex nie LCP-Text ist und der Ersatz sofort gezeichnet wird. Astros Ersatzschriften mit Metrik-Ausgleich (Arial bzw. Courier New mit `size-adjust`/`ascent-override`/`descent-override`) waren schon aktiv. Gemessen: CLS 0.

## Tests

`npm test` grün (331 Vitest + 7 Hook), `npm run check` 0 Fehler, `npm run build:staging` grün. E2E `design-system.spec.ts` und `seiten.spec.ts`: 123 bestanden, 3 übersprungen (viewportabhängig, wie vorher; mit `E2E_MAILPIT=extern`, kein Docker in der Umgebung).

## Offen / Hinweise an andere

- page-builder: Auf `/` laden Plex Regular und Medium Latin1 weiterhin vor dem LCP, wegen Mono-Labels unterhalb des Falzes (`hero-stufe`, `journey-nr`, `gewerk-art`). Möglicher Hebel: `content-visibility: auto` auf Abschnitte unterhalb des Falzes, aber nicht auf die gepinnte Journey (ScrollTrigger misst).
- motion-3d / backend-api: Die Streuung der Läufe (1,5 s gegenüber 1,9–2,0 s) hängt daran, ob `scroll.*.js` (GSAP) und `altcha-widget` vor dem beobachteten LCP starten. Die Hebel aus N1 bleiben gültig, der Zielwert ist mit 1898 ms knapp.
- architect (niedrig, belegt): `server/static.mjs` liefert `.br`/`.gz` nur, wenn deren mtime ≥ Original ist. Eine Kopie von `dist` ohne erhaltene Zeitstempel (`cp -r`, manche Deploy-Wege) liefert JS dann unkomprimiert aus (gesehen: `scroll.*.js` 115 KB statt 40 KB). Messungen und Deploys mit `cp -a`/`rsync -t` machen, oder die Prüfung robuster gestalten.
