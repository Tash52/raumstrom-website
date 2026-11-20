# a11y-perf-tester, Phase 3 Motion/3D (Stand 5d86890)

Methode: vorhandener `dist/` (build:staging), `PORT=8091 node server/server.mjs` mit Test-Secrets (SMTP_PASS >= 8 Zeichen), Chromium headless (Playwright 1243, SwiftShader, 4 Kerne, keine GPU), axe-core (wcag2a/2aa/21a/21aa/22aa/best-practice, 390/1440/320+reduced-motion), Lighthouse 12 Mobile (Standard-Drosselung). Skripte in /tmp/t, /tmp/lh. Server am Ende beendet.

## Gesamturteil
Teilweise bestanden. Funktion, Fallbacks, Tastatur, 0 Fremd-Requests, Chunk-Trennung und Seiten ohne 3D sind in Ordnung. Nicht bestanden: Lighthouse Startseite Perf 70 (TBT 2,7 s, nur wenn 3D im Lab startet), LCP knapp über 2,0 s, ein axe-Verstoß (Journey, Desktop).

## Lighthouse Mobile
| Seite | Perf | A11y | BP | SEO | LCP | CLS | TBT | JS gz (initial) | axe |
|---|---|---|---|---|---|---|---|---|---|
| / (3D startet im Lab) | 70 | 100 | 100 | 100 | 2,1 s | 0 | 2710 ms | 57 kB, nach Start +308 kB (three/R3F 240 + react-dom 68) | 1 (Desktop) |
| / (WebGL aus = Poster) | 98 | 100 | 100 | 100 | 2,2 s | 0 | 0 ms | 57 kB | 0 |
| /leistungen/wallbox/ | 98 | 100 | 100 | 100 | 2,1 s | 0 | 0 ms | 50 kB | 0 |
| /kontakt/ | 99 | 100 | 100 | 100 | 2,0 s | 0 | 40 ms | 85 kB (ALTCHA 32) | 0 |
| /gibtsnicht/ (404) | nicht gemessen | | | | | | | | 0 |

LCP-Element ist das Poster (AVIF 5 kB, `fetchpriority=high`, entdeckbar, kein Lazy). Die 2,1-2,2 s stammen aus render-blockierendem CSS (BaseLayout/index/GewerkeHinweis-CSS, je 150-300 ms simuliert), nicht aus dem Poster. Im ungedrosselten Lauf ist LCP 0,09-0,18 s.

## Messungen im Browser (Playwright, ungedrosselt / 4x CPU)
- LCP 92 ms / 244 ms, CLS 0,000 auf allen Seiten, Event-Duration max 64 ms (ungedrosselt, 3D), 56 ms (4x). Wallbox/Kontakt/Reduced/noWebGL: keine Long Tasks (> 50 ms) ausser einer 55-ms-Task auf Wallbox (GSAP-Init).
- 0 Fremd-Requests auf allen sieben Läufen (Start 3D, 4x, Standard, Reduced, noWebGL, Wallbox, Kontakt). Konsole: nur `THREE.Clock deprecated` (bekannt) und SwiftShader-Treiberwarnungen, keine Fehler, keine CSP-Verstösse.
- JS-Budget: Wallbox 50 kB gz (Motion 4,6 + Preload 0,9 + GSAP/ScrollTrigger 44,5), Kontakt 85 kB, Startseite ohne 3D 57 kB, alles < 150 kB. Mit 3D +308 kB (nur Startseite, lazy).
- Chunk-Trennung: three/WebGLRenderer ausschliesslich in `_astro/takt.C4FAohdm.js` (240 kB gz) und react-dom/R3F-Client in `client.DvUAfCd1.js` (68 kB gz). Wallbox, Kontakt, Reduced Motion und noWebGL laden beide nicht (Requestliste geprüft). Bestanden.

## Reduced Motion, noWebGL
- `prefers-reduced-motion: reduce` (auch mit `?3d=erzwingen`): Hero `poster`, Journey `statisch`, 0 Canvas, kein takt/client/scroll-Chunk, keine Long Tasks, keine endlos laufenden CSS-Animationen, Pause-Knöpfe nicht eingeblendet. Bestanden.
- WebGL nicht verfügbar (getContext -> null, `?3d=erzwingen`): Hero `poster`, Journey `gepinnt` mit Standbildern, 0 Canvas, 0 Fehler, kein 3D-Chunk. Bestanden.

## Tastatur und Fokus (belegt)
- Skip-Link erster Tab-Stopp (sichtbar), danach Header, Hero-CTAs, Pause-Knopf (Tab 11), Slider (ein Stopp), Journey-Links 20-23 und Journey-Pause (24), Footer. Reihenfolge logisch, 45 Tab-Stopps ohne Fokusverlust, Seite scrollt Fokus ins Bild (Journey-Panel bleibt erreichbar).
- Fokus überall sichtbar (2 px Outline + Ring). Die Karten "Für Zuhause/Für Unternehmen" zeigen den Ring auf dem Eltern-Artikel (`:focus-within`, Outline am Link selbst `none`), sichtbar, `:focus-visible` true. Kein Befund.
- Pause-Schalter: Enter setzt `aria-pressed=true` und `localStorage raumstrom:bewegung-pausiert=1`, Leertaste setzt zurück. Ob die Render-Schleife tatsächlich steht, konnte ich nicht per Canvas-Vergleich belegen (kein preserveDrawingBuffer); E2E des motion-3d-Agenten deckt das ab (nicht erneut verifiziert).
- WandSlider: native Radios, Pfeil rechts/links schalten 0/1/2 und aktualisieren die Bildunterschrift (`aria-live=polite`). Home/Ende wirken nicht (native Radio-Eigenschaft), nur Hinweis.
- Cursor-Ring: `pointer-events: none`, `aria-hidden`, System-Cursor bleibt (`cursor: auto`), nur Hover+Fine-Pointer. Stört nicht.

## Befunde
1. mittel (belegt), Lighthouse Startseite TBT 2710 ms, Perf 70 (Ziel 90): 3D startet im Lab (4 Kerne, SwiftShader gilt nicht als "major performance caveat"), `src/lib/motion/umgebung.ts:29-43` (`hatWebGL`) und `:88-92`. Mit deaktiviertem WebGL: Perf 98, TBT 0. Ursache sind Software-Rendering plus Szene auf dem Main Thread, auf echter GPU voraussichtlich weit weniger (Vermutung, nicht messbar). Fix: Software-Renderer erkennen (`WEBGL_debug_renderer_info` enthält SwiftShader/llvmpipe/Software -> Poster), Start erst nach LCP und ersten Nutzerinteraktion oder frühestens ~2 s nach `load` (`wennRuhig`, `umgebung.ts:96-103`, Timeout 1500). Zuständig: motion-3d. Alternativ architect/qa-Entscheidung, ob das Lab-Profil ohne WebGL gemessen werden darf.
2. niedrig-mittel (belegt), Long Task beim 3D-Start: ungedrosselt 175-208 ms bei 0,3-0,5 s (und 90 ms davor), 4x gedrosselt 283 ms bei ~1,15 s, danach bei Software-Rendering Dauerlast mit 50-130 ms alle ~270 ms während Scroll (GPU-los, Artefakt). Bewertung: nicht blockierend für LCP/CLS (Poster steht vorher, LCP 92 ms) und liegt hinter `load`+Idle, daher hinnehmbar; Risiko nur, wenn der Nutzer genau in diesem Fenster klickt (INP ~64-130 ms, unter 200 ms). Vorschläge: (a) `renderer.compileAsync`/Shader vorwärmen und Szenenaufbau in Teile über `scheduler.yield`/Idle splitten, (b) Start an `pointerdown`/Scroll-Beginn oder +1,5 s hängen, (c) Szene (Journey) erst bei Annäherung laden (ist bereits so). Zuständig: motion-3d (`src/islands/hero/steuerung.ts:62-90`).
3. niedrig (belegt), axe color-contrast 1 Verstoss auf `/` Desktop 1440: `.journey-nr` im inaktiven zweiten Panel ("02 / 03", Kontrast 1,51 bei Panel-Opazität 0,3, `aria-hidden`). Ursache `src/components/sections/SaeulenJourney.astro:303` (`opacity: 0.3` auf inaktive Panels, Panel ragt 64 px ins Bild). Zielwert "0 Verstösse" verfehlt. Fix: inaktive Panels `opacity` auf >= 0.6 mit ausreichendem Kontrast oder `inert`/`visibility` bis aktiv, Zahl-Farbe prüfen. Zuständig: page-builder (Journey) bzw. motion-3d.
4. niedrig (belegt), LCP im Lighthouse 2,0-2,2 s (Ziel < 2,0 s) auf Startseite und Wallbox durch render-blockierendes CSS (~3 Dateien, je 150-300 ms); Kontakt exakt 2,0 s. Fix: CSS zusammenführen/inline kritisch (Astro `build.inlineStylesheets: 'auto'` mit CSP-Hashes beachten) und Kompression (Server liefert .br/.gz, Lab nutzt sie). Zuständig: architect/design-system.
5. Hinweis, Startseite insgesamt: 3D-Chunks addieren +308 kB gz auf der Startseite (Budget 150 kB gilt für Inhaltsseiten ohne 3D; lazy und nur bei erlaubtem 3D, daher akzeptiert). Dokumentieren.
6. Hinweis: Konsolenwarnung `THREE.Clock deprecated` aus R3F (bekannt).

## Nicht geprüft
Echte GPU (60 fps, INP auf Mittelklasse-Gerät), Wirkung der Pause auf die Render-Schleife (nur Zustand/Persistenz), Screenreader real, Lighthouse auf den übrigen Seiten, Seitenübergänge (View Transitions) per Hand.
