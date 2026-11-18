# Phase 2 · qa-verifier · Abnahme

Stand: 8a1a7f7 (main), frischer Klon `/tmp/qa2`, 18.11.2026. Eigener Server auf Port 4587, eigenes Mailpit (Compose-Projekt `qa2-verifier`, Ports 11025/18025), Produktions-Build ohne Launch-Check in Kopie `/tmp/qa2-prod`. Projektcode und Git-Stand nicht verändert.

## Gesamturteil

**Bedingt bestanden.** Die Definition of Done ist erfüllt: Die Inhaltsseite ist vollständig, die Kontaktformular-E2E sind grün, und den Versand habe ich im Browser bis zur Mail in Mailpit selbst nachvollzogen. Alle Befehle verhalten sich wie erwartet. Vier Befunde sollten vor dem Abschluss der Phase behoben werden, keiner davon blockiert den Ablauf:

- B1: Spam-Schutz-Widget und noscript-Hinweis sind unsichtbar.
- B2: `/partner/` ist von keiner Seite verlinkt.
- B3: Fehlende Kennzeichnung für Malerarbeiten bei Bad und Fliesen.
- B4: Im Datenschutztext entsteht ein kaputter Autolink.

## 1. Befehle (wörtlich, Exit-Code)

| Befehl | Ergebnis | Bewertung |
|---|---|---|
| `npm ci` | „added 496 packages … found 0 vulnerabilities", EXIT 0 | bestanden |
| `npm run build:staging` | „Wording-Scan: keine verbotenen Begriffe gefunden." … „[build] Complete!", EXIT 0; 30 Seiten inkl. `/styleguide/` | bestanden |
| `npm run build` | „Launch-Check: 126 offene(r) Punkt(e), 0 Fehler. Produktions-Build abgebrochen. Für Staging: npm run build:staging (--allow-placeholders).", EXIT 1, Liste nach Rechtliches (48), Kontaktdaten (18), Fotos (3), Texte (50), Technik (7) | bestanden (Abbruch erwartet) |
| `npm test` | „Test Files 13 passed (13) · Tests 230 passed (230)"; Hook: „# tests 7 # pass 7 # fail 0", EXIT 0 | bestanden |
| `npm run test:e2e` | „163 passed (1.7m) · 3 skipped", EXIT 0, Mailpit per Compose gestartet und entfernt. Die 3 Skips sind viewport-bedingt (`test.skip(!isMobile…)` / `test.skip(isMobile…)`, `tests/e2e/design-system.spec.ts:83,97,126`) | bestanden |
| `npm run check` | „Result (140 files): 0 errors, 0 warnings, 0 hints", EXIT 0 | bestanden |
| `npm run audit` | „npm audit: critical 0, high 0, moderate 0, low 0. Audit ok", EXIT 0 | bestanden |
| `npm run licenses -- --check` | „Lizenzen ok (565 Pakete).", EXIT 0 | bestanden |
| `npm run scan:wording` | „Wording-Scan: keine verbotenen Begriffe gefunden.", EXIT 0 | bestanden |
| `npm run trend-schema -- --check` | „Trend-Schema aktuell.", EXIT 0 | bestanden |

Build-Warnungen (erwartet): `No files found … src/content/ratgeber` und `… src/content/trends` (kommen in Phase 5 und 7).

Produktions-Build ohne Launch-Check (`node scripts/astro.mjs build` in der Kopie): EXIT 0, „/styleguide/ nicht im Produktions-Build". Rechtsseiten zeigen dort nur „Dieser Text wird derzeit erstellt …", tragen `noindex` und enthalten keinen `[[PLATZHALTER`. Sitemap: 20 URLs.

## 2. Routen, Links, Navigation (Briefing Abschnitt 6)

| Punkt | Ergebnis |
|---|---|
| Alle Routen erreichbar | **bestanden.** Ein Crawl ab `/` lieferte 200 für `/`, `/fuer-zuhause/`, `/fuer-unternehmen/`, `/leistungen/` + 11 Leistungen, `/raumplaner/` (Einleitung, „folgt in Kürze"), `/referenzen/`, `/ueber-uns/`, `/kontakt/`, 6 Rechtsseiten, `/kontakt/danke/`, `/kontakt/fehler/`. `/ratgeber/` und `/region/schweinfurt/` liefern 404 (Feature-Flag aus bzw. keine Region freigegeben, wie vorgesehen). `/keystatic` liefert 404. |
| Keine toten internen Links | **bestanden.** Kein interner Link und kein Asset mit Status ≠ 200. |
| Externe Links | **nicht bestanden (B4).** `https://%E2%80%9C` auf `/datenschutz/` |
| `/partner/` erreichbar über Navigation | **nicht bestanden (B2).** Die Seite wird gebaut und steht in der Sitemap, aber kein Link führt dorthin. |
| Navigation, Footer | bestanden. Hauptnavigation mit 6 Einträgen plus „Anfrage stellen", Footer mit Seiten und 6 Rechtslinks, Menü mobil (E2E). |
| Breadcrumbs | bestanden. Auf allen Unterseiten vorhanden, letzter Eintrag `aria-current`. Optischer Mangel: H5. |
| 404 | bestanden. Status 404, eigene Seite „Hier ist die Leitung unterbrochen", `noindex`, Links zu Start, Leistungen und Anfrage. |
| Umleitung ohne Schrägstrich | bestanden. `/leistungen/trockenbau` → 308 auf `/leistungen/trockenbau/` |

## 3. Leistungsseiten und Gewerke-Kennzeichnung (Briefing Abschnitt 2)

Geprüft im Browser (`[data-gewerke-hinweis]`, Überschriften, `details`, Links):

| Leistung | Partner-Gewerke laut Matrix | Hinweis direkt unter Kopf | Ablauf | FAQ | CTA Planer + Anfrage |
|---|---|---|---|---|---|
| komplettrenovierung | 4 | ja, Plural + Gewerke-Liste | 5 | 4 | ja |
| wohnung-bezugsfertig | 3 | ja, Plural | 4 | 3 | ja |
| renovierung-mieterwechsel | 3 | ja, Plural | 4 | 3 | ja |
| elektro-modernisierung | 2 | ja, Plural | 4 | 4 | ja |
| trockenbau | 0 | keiner (korrekt, eigen) | 3 | 3 | ja |
| boden | 0 | keiner (korrekt, eigen) | 3 | 3 | ja |
| waende-decken | 2 | ja, Plural | 3 | 3 | ja |
| bad-fliesen | 2 | ja, Plural | 4 | 3 | ja (aber B3) |
| wallbox | 2 | ja, Plural | 4 | 4 | ja |
| ladepunkte-unternehmen | 2 | ja, Plural | 4 | 3 | ja |
| pruefservice-ladesaeulen | 0 | keiner (korrekt, eigen) | 4 | 4 | ja |

- Kennzeichnung je Leistung, Plural bei mehreren: **bestanden.** Text „Ausführung durch unsere Meister-Partnerbetriebe", darunter die Gewerke-Liste mit „Eigene Ausführung" bzw. „Meister-Partnerbetrieb". Eine Leistung mit genau einem Partner-Gewerk gibt es in den echten Daten nicht. Den Singular habe ich deshalb nur über die Unit- und E2E-Tests geprüft, nicht im Browser.
- Startseite, Claim „aus einer Hand": **bestanden.** Der Hero-Text „koordiniert aus einer Hand, mit klar benannten Partnerbetrieben" steht bei 390 px auf y=239. Direkt darunter (y=374) folgt „Ausführung durch unsere Meister-Partnerbetriebe: Elektroinstallation, Wallbox-Installation, Zählerschrank und Unterverteilung, Fliesen und Bad, Putz und Stuck, Malerarbeiten", also alle 6 Partner-Gewerke der Matrix.
- Karten, die „aus einer Hand" nennen (Übersichten, „Weitere Leistungen"), tragen jeweils den Partner-Hinweis: bestanden.
- Gewerke, die im Leistungstext genannt, aber nicht gekennzeichnet sind: **nicht bestanden (B3)** für bad-fliesen, Hinweis H3 für wohnung-bezugsfertig.

## 4. Wording-Stichprobe (Briefing Abschnitt 1)

Den gerenderten Text von 29 Seiten (FAQ aufgeklappt, inkl. Meta) habe ich auf folgende Begriffe durchsucht: Meister (ohne „-Partnerbetrieb"), Innung, Fachbetrieb, zertifiz…, Sicherheitstechnik, Alarm, Kamera, beste, günstigst, Nr. 1, Top, Festpreis, Garantie, Preisgarantie, führend, einzigartig, unschlagbar.

- **bestanden.** Die einzigen Funde mit „Meister" stehen in „Meisterpflichtige Gewerke übernehmen unsere festen Meister-Partnerbetriebe" (Start, Für Zuhause, Für Unternehmen, Leistungen, Komplettrenovierung, Über uns). Das ist die Formulierung aus Briefing Abschnitt 2, Punkt 1, und RAUMSTROM wird damit nicht selbst als Meister bezeichnet.
- „günstigste Standardlieferung" (Widerruf) und „Garantie" (AGB, Haftung) stammen aus dem gesetzlichen bzw. vertraglichen Mustertext. Das sind keine Werbeaussagen.
- Säule 3 heißt durchgehend „Sicher betreiben" bzw. „Prüfservice". Ein Arbeitgeber wird nirgends genannt (Über uns: Platzhalter mit ausdrücklichem Ausschluss).
- Hinweis, Vermutung: Hero-Text und Raumplaner-Abschnitt der Startseite beschreiben den Planer im Präsens („Zeichnen Sie Ihren Raum …"), obwohl er erst in Phase 4 kommt. `/raumplaner/` sagt korrekt „folgt in Kürze". Für Staging ist das in Ordnung. Wenn vor Phase 4 gelauncht wird, sollte der Text angepasst werden (content-writer).

## 5. Rechtsseiten

| Punkt | Ergebnis |
|---|---|
| Entwurfs-Kennzeichnung im Staging | **bestanden.** Alle 6 Seiten zeigen das Banner „Entwurf · Dieser Rechtstext ist ein Entwurf und noch nicht rechtlich geprüft …", dazu `noindex` (Screenshot `impressum-390-oben.png`). |
| Firmendaten über Renderer | **bestanden.** `src/content/legal/impressum.md:13-33` nutzt nur `{{firma.…}}`-Marker. Die Ausgabe zeigt die Werte bzw. Platzhalter aus `firma.yaml` („Rechtsform: GbR", Platzhalter für Name und Adresse). |
| Kein Hinweis auf EU-OS-Plattform | **bestanden.** Weder in `src/content/legal/` noch im gerenderten Text kommt „OS-Plattform", „ODR" oder „ec.europa.eu" vor. Vorhanden ist nur die Erklärung zur Verbraucherschlichtung (VSBG). |
| Produktions-Build nicht als fertiger Text | **bestanden.** Siehe Abschnitt 1: „Dieser Text wird derzeit erstellt …", `noindex`, keine Platzhalter. Zusätzlich bricht `npm run build` ab. |

## 6. Kontaktformular (selbst im Browser ausprobiert)

**Mit JavaScript** (Chromium, 390 px, `/kontakt/?anliegen=bad-fliesen`):
- Das Thema ist vorgewählt (`bad-fliesen`). Felder ausgefüllt, ein JPEG mit EXIF (Make, Artist) und GPS angehängt, Häkchen gesetzt, abgesendet.
- Die Seite zeigt „Anfrage gesendet · Vielen Dank. Wir haben Ihre Anfrage erhalten und melden uns bei Ihnen." 0 Fremd-Requests, 0 CSP-Meldungen. Serverlog: nur „[api] kontakt: gesendet (1 fotos)", keine personenbezogenen Daten.
- Mail an das Büro (Mailpit): Betreff „Neue Anfrage: Bad und Fliesen", From „RAUMSTROM Website <anfrage@raumstrom.de>", Reply-To „Erika QA-Testerin <erika.qa@example.test>", nur Text. Enthält Name, E-Mail, Telefon, Ort, Anliegen, Nachricht, „Fotos: 1 im Anhang (vom Server neu kodiert, Metadaten entfernt)." und „Datenschutzhinweise zur Kenntnis genommen: ja". Anhang `foto-1.jpg` (image/jpeg, 1200×800, 3140 B). `identify -verbose`: **0 EXIF-Zeilen, kein GPS, kein Artist/Make.** **bestanden.**
- Eingangsbestätigung an den Kunden: Betreff „Ihre Anfrage bei RAUMSTROM", `Auto-Submitted: auto-replied`, nur Text. Sie enthält **keine** Nutzereingaben (weder Name noch Nachricht noch der Markierungstext „GEHEIMER-NUTZERTEXT-123"), sondern nur einen festen Text mit Web- und Datenschutz-Link. **bestanden.**
- Häkchen-Text: „Ich habe die Datenschutzerklärung zur Kenntnis genommen. RAUMSTROM verwendet meine Angaben und Fotos nur zur Bearbeitung dieser Anfrage. (Pflichtfeld)". Das ist als Kenntnisnahme formuliert, nicht als Einwilligung. **bestanden.**
- Das ALTCHA-Widget ist für Nutzer **unsichtbar** (B1). Der Versand funktioniert trotzdem, weil `verify()` vor dem Senden läuft.

**Ohne JavaScript:**
- Ein nativer POST führt per 303 auf `/kontakt/fehler/` („Anfrage nicht gesendet … Der Spam-Schutz des Formulars benötigt JavaScript …"). Es wird keine Mail versendet (Mailpit blieb bei 2 Mails). **bestanden.**
- Der noscript-Hinweis am Formular steht im DOM, wird aber **nicht angezeigt** (`isVisible() = false`, BoundingBox null). Ohne JS erfährt man das also erst nach dem Absenden. **nicht bestanden (B1).**

## 7. Sitemap und robots

- `sitemap-0.xml` enthält 20 URLs: Start, 2 Eingänge, Kontakt, Leistungen + 11, Partner, Raumplaner, Referenzen, Über uns. Rechtsseiten, `/kontakt/danke/`, `/kontakt/fehler/`, `/404`, `/styleguide/` fehlen, und alle diese Seiten tragen `<meta name="robots" content="noindex">`. **bestanden.** Die offene Bitte von backend-api und page-builder (Filter für danke und fehler) ist damit erledigt.
- Indexierbare Seiten haben kein robots-Meta (Standard index). bestanden.
- `robots.txt` gibt es nicht (404). Laut Plan kommt sie in Phase 7, daher für Phase 2 nicht prüfbar. Hinweis: `/404.html` setzt `canonical` auf `https://raumstrom.de/404/`. Unschädlich, sollte in Phase 7 aber entfallen (seo-specialist).

## 8. Screenshots und Design mobil

Ablage: `docs/agent-reports/screenshots/2-qa/`. Je 390 und 1440 px, ganze Seite plus `-oben` (erster Bildschirm): `start`, `fuer_zuhause`, `leistung-bad-fliesen`, `kontakt`, `danke`, `impressum`. Dazu `kontakt-ausgefuellt-390.png` und `kontakt-ohne-js-ergebnis-390.png`. Alle selbst angesehen, 390 px in Ausschnitten von 1100 px Höhe.

- Bei 390 und 1440 px gibt es keinen horizontalen Überlauf. Die Schrift ist mobil gut lesbar (Fließtext etwa 16 px), Kontraste stimmen (axe 0 laut E2E), Kabelgrün nur auf hellem Grund, Strom-Grün nur als Fläche oder Punkt. Die Touch-Ziele der Buttons sind ausreichend groß.
- Die Startseite wirkt mobil klar: dunkler Hero, Wand-Grafik, Säulen-Karten. Die Gewerke-Liste wechselt mobil zwischen ein- und zweizeiligen Zeilen (je nach Namenslänge). Das wirkt etwas unruhig, ist aber lesbar.
- H4: Doppelte Nummerierung im Ablauf („1." vom Browser plus „Schritt 1:"), die native Ziffer stößt an den Knotenpunkt (gut sichtbar in `leistung-bad-fliesen-1440.png` und in der 390-px-Fassung).
- H5: Die Breadcrumbs sind gegenüber H1 und Fließtext um etwa 40 px eingerückt (UA-Padding der `ol`), auf allen Unterseiten zu sehen (`fuer_zuhause-390-oben.png`).
- Platzhalter `[[PLATZHALTER: …]]` erscheinen im Staging sichtbar im Fließtext (Start „Schweinfurt und Umland", Kontakt, Über uns, Bad und Fliesen). Das ist gewollt.

## Befunde

| Nr. | Schwere | Befund (belegt) | Datei:Zeile | Zuständig |
|---|---|---|---|---|
| B1 | mittel | Der Einhängepunkt des Widgets trägt die Klasse `altcha`. Die gebündelte `altcha.css` enthält `.altcha{…display:none…}` (sichtbar nur das innere `.altcha[data-visible]`). Dadurch hat `div.altcha[data-altcha-platz]` `display:none` und Höhe 0. Folgen: Das ALTCHA-Widget („Ich bin kein Roboter") ist nie sichtbar, und **ohne JS ist auch der noscript-Hinweis samt Direktkontakt unsichtbar**. Der E2E-Test prüft nur `toContainText` und nicht die Sichtbarkeit, deshalb fällt das nicht auf. | `src/components/forms/KontaktFormular.astro:80`; Test `tests/e2e/seiten.spec.ts:170` | page-builder (Klasse umbenennen, Test auf `toBeVisible`), backend-api prüft, ob das Widget sichtbar sein soll |
| B2 | mittel | `/partner/` (Briefing Abschnitt 6) wird gebaut und steht in der Sitemap, ist aber weder in Header, Footer noch auf einer Seite verlinkt. Der Crawl ab `/` findet die Seite nicht. | `src/components/layout/navigation.ts:10-17`, `src/components/layout/Footer.astro:18` | page-builder |
| B3 | mittel | Bad und Fliesen nennt Malerarbeiten bzw. Anstrich als Teil der Leistung (Ablauf „Abschluss: Malerarbeiten, Ausstattung, Abnahme.", Einleitung „… Fliesen, Anstrich"). `malerarbeiten` (partner) fehlt aber in `gewerke`, deshalb gibt es dafür keine Kennzeichnung (Briefing Abschnitt 2, Gesamteindruck). | `src/content/leistungen/bad-fliesen.md:10-14`, `:23`, `:32` | content-writer |
| B4 | niedrig | Der Text „erkennbar an „https://“ in der Adresszeile" wird per GFM-Autolink zu `<a href="https://%E2%80%9C">https://“</a>`, ein kaputter externer Link. | `src/content/legal/datenschutz.md:56` | legal-compliance (z. B. als Code `` `https://` `` schreiben), alternativ page-builder (Autolink im Markdown-Renderer aus) |
| H3 | Hinweis | „Wohnung bezugsfertig" nennt „ein veralteter Zählerschrank" als typischen Punkt, `zaehlerschrank` steht aber nicht in `gewerke`. Ob der Tausch zum Leistungsumfang gehört, ist eine Inhaltsfrage. Falls ja, ergänzen. | `src/content/leistungen/wohnung-bezugsfertig.md:36` (gewerke ab `:9`) | content-writer |
| H4 | niedrig | Ablauf-Liste: Die `ol` hat kein `list-style: none`, deshalb doppelte Nummerierung, und die Browser-Ziffer kollidiert mit dem Knoten. | `src/components/sections/AblaufListe.astro:21` | page-builder |
| H5 | niedrig | Breadcrumbs: Die `ol` hat kein `padding: 0`, deshalb sind sie gegenüber dem Seitenkopf um etwa 40 px eingerückt. | `src/components/sections/Breadcrumbs.astro:22` | page-builder |
| H6 | Hinweis | `canonical` der 404-Seite zeigt auf `/404/`. | `dist/client/404.html` (Quelle 404-Seite) | seo-specialist (Phase 7) |

## Nicht prüfbar

- Singular-Kennzeichnung im Browser: Keine Leistung hat genau ein Partner-Gewerk. Nur über Tests belegt.
- `robots.txt`: kommt in Phase 7.
- Direktkontakt (Telefon/E-Mail) auf Danke/Fehler und im noscript-Block: Die Werte sind Platzhalter und werden daher absichtlich ausgeblendet.
- Echte Zustellung über den Produktions-SMTP: nur Mailpit.
- Natives Dateiauswahl-Label („Choose Files") stammt vom englischen Headless-Browser. Bei deutschem Browser ist es deutsch, hier nicht prüfbar.
