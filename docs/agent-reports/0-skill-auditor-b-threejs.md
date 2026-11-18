# Skill-Audit Teil B: `CloudAI-X/threejs-skills`

Prüfer: `skill-auditor` (Teil B), Phase 0. Prüfverfahren nach BRIEFING Abschnitt 3. Es wurde nichts installiert und nichts aus dem Klon ausgeführt. Gelesen wurde mit Read, Grep, `git`, `wc`, `file` sowie einem isolierten Python-Lesescan auf unsichtbare Zeichen (`python3 -I`, das Skript lag außerhalb des Klons).

Kennzeichnung im Bericht:
- **[belegt]**: gelesen, mit `Datei:Zeile` belegt.
- **[Vermutung]**: eigene Einschätzung oder Wissen außerhalb des Repos, nicht im Repo belegt.
- **[zu prüfen]**: API-Aussage des Skills, die ich ohne Paketquelle nicht sicher bestätigen kann.

## Kopf

| Feld | Wert |
|---|---|
| Quelle | https://github.com/CloudAI-X/threejs-skills (GitHub, kein offizieller Anthropic-Marktplatz) |
| Commit-Hash (gepinnt) | `0e181866f095b5f06d005133876e926515390d95` (Branch `main`) |
| Letzter Commit | 2026-10-19 08:17:17 +0300, Autor „CloudAI-X“, Nachricht „docs(readme): add the performance, React Three Fiber and asset pipeline skills“ |
| Lizenz | MIT, `LICENSE:1-21`, „Copyright (c) 2026 CloudAI-X“ [belegt] |
| Stars / Forks / Contributors | **aus dieser Umgebung nicht abrufbar.** Die GitHub-API antwortete mit HTTP 403 („GitHub access to this repository is not enabled for this session“). Der Klon ist flach (`--depth 1`), deshalb lassen sich Historie und Zahl der Contributors daraus nicht ermitteln. Die „ca. 3,7k Stars“ aus der Vorrecherche sind unbestätigt. |
| Zielversionen laut Repo | three r186 (`three@0.186`), @react-three/fiber 9.8, drei 10.7, gltf-transform 4.5 (`README.md:5`, `README.md:84`) [belegt] |
| Unser Stack | three 0.187, @react-three/fiber 9, @react-three/drei 10, React 19, also eine three-Minor-Version neuer als das Repo |

## Vollständige Dateiliste (`git ls-files`, 15 Dateien)

| Zeilen | Bytes | Datei | Git-Blob-SHA (zur Prüfung der Kopie) |
|---:|---:|---|---|
| 21 | 1066 | `LICENSE` | `a8252c8e6798c6867144edbfb5bbd8df80743d00` |
| 100 | 5302 | `README.md` | `a20a35bbb9c4d2cff145b55df2f8fc15d0d550c9` |
| 500 | 21367 | `skills/threejs-animation/SKILL.md` | `88fed204523e82cebf2953b9c14944001d43cc31` |
| 239 | 18013 | `skills/threejs-asset-pipeline/SKILL.md` | `9515e85dac0dd16a3d8fac9b00263af8c217517f` |
| 495 | 23598 | `skills/threejs-fundamentals/SKILL.md` | `85c223750c222dc91edd2c08383a6b3f7e7b85fe` |
| 500 | 25372 | `skills/threejs-geometry/SKILL.md` | `7c1f17b11aa345f94face1ec7033c45b560dc8b2` |
| 500 | 22313 | `skills/threejs-interaction/SKILL.md` | `bdd56b384eb0df0cc883057dd456136ec2c5d768` |
| 483 | 23467 | `skills/threejs-lighting/SKILL.md` | `49370e6e1c9a73096e3089c78246b826fb572cdf` |
| 500 | 22165 | `skills/threejs-loaders/SKILL.md` | `ce7100526666340c37a3996e5e3ab3ff7cb7893e` |
| 500 | 26722 | `skills/threejs-materials/SKILL.md` | `550a83cd4febc2ee458962deb0da4d67da3b9d13` |
| 391 | 25315 | `skills/threejs-performance/SKILL.md` | `fcc6a5f992030449736b2a83702a4f79229e9ff2` |
| 497 | 27097 | `skills/threejs-postprocessing/SKILL.md` | `9e45adb56a967090d3a83a13e1e6b8b2a824cd28` |
| 488 | 30002 | `skills/threejs-react-three-fiber/SKILL.md` | `75fdf7ec3a2e67bbe7541863790058d68e20d5cd` |
| 497 | 26503 | `skills/threejs-shaders/SKILL.md` | `6659866c82ce64cf8b3d8d739aef4b1e25556d1c` |
| 500 | 22589 | `skills/threejs-textures/SKILL.md` | `dd12ee9f94300c6674bae586288e5d7c030b8ef0` |

Alle 15 Dateien habe ich vollständig gelesen. [belegt]

**Was das Repo nicht enthält** [belegt durch `git ls-files`, `ls -la`, `find`]: keine Verzeichnisse `scripts/`, `bin/`, `hooks/`, `.claude/`, `.claude-plugin/`, kein `package.json`, keine `settings.json`, keine Binärdateien und keine Symlinks. Alle Dateien sind nicht ausführbar (Modus `100644`). Im Klon liegen unter `.git/hooks` nur die Git-Standarddateien `*.sample`. Die lokale Git-Konfiguration enthält nur `remote.origin` und `branch.main`.

## Tabelle je Skill

Fremd-Host-Muster bedeutet: Der Skill empfiehlt Code oder Defaults, die zur Laufzeit im Browser einen fremden Host laden würden.

| Name | Pfad | Zeilen | Sicherheitsbefund | Fremd-Host-Muster | Aktualität | Empfehlung |
|---|---|---:|---|---|---|---|
| threejs-fundamentals | `skills/threejs-fundamentals/SKILL.md` | 495 | keiner | **ja, 6 URLs in 2 Import-Maps** (jsDelivr) | r186-aktuell; Timer statt Clock, `outputColorSpace`, `three/addons/` | mit Hinweis übernehmen |
| threejs-geometry | `skills/threejs-geometry/SKILL.md` | 500 | keiner | nein (Font über relativen lokalen Pfad, :107-108) | aktuell; `mesh.pivot` (:378) [zu prüfen] | übernehmen |
| threejs-materials | `skills/threejs-materials/SKILL.md` | 500 | keiner | nein | aktuell; `retroreflectivity` (:173) [zu prüfen] | übernehmen |
| threejs-lighting | `skills/threejs-lighting/SKILL.md` | 483 | keiner | nein | aktuell; `SunLight`, `LightProbeGridWebGL` (:96-109, :331) [zu prüfen] | übernehmen |
| threejs-textures | `skills/threejs-textures/SKILL.md` | 500 | keiner | nein, aber Default-Pfad des KTX2-Transcoders [zu prüfen] (:204-205) | aktuell; `HTMLTexture` (:196) [zu prüfen] | übernehmen |
| threejs-animation | `skills/threejs-animation/SKILL.md` | 500 | keiner | nein | aktuell | weglassen (vorerst, siehe Zuordnung) |
| threejs-loaders | `skills/threejs-loaders/SKILL.md` | 500 | keiner | **ja, 1 Muster** (CDN-URL-Umschreibung :396-397); Draco/KTX2-Default-Pfad [zu prüfen] (:222) | aktuell; `HDRLoader`, `USDLoader` | mit Hinweis übernehmen |
| threejs-shaders | `skills/threejs-shaders/SKILL.md` | 497 | keiner | nein | aktuell (GLSL ES 3.00, TSL) | übernehmen |
| threejs-postprocessing | `skills/threejs-postprocessing/SKILL.md` | 497 | keiner | nein | aktuell; `renderer.setEffects()` und `RenderPipeline` (:356, :485) [zu prüfen] | mit Hinweis übernehmen (nicht vorladen) |
| threejs-interaction | `skills/threejs-interaction/SKILL.md` | 500 | keiner | nein | aktuell (Controls-API seit r168) | übernehmen |
| threejs-performance | `skills/threejs-performance/SKILL.md` | 391 | keiner | nein | aktuell | übernehmen |
| threejs-react-three-fiber | `skills/threejs-react-three-fiber/SKILL.md` | 488 | keiner | **ja, 3 Muster** (`Environment preset`, Draco-Decoder von gstatic in `useGLTF`, Default-Font von `Text` [zu prüfen]) | R3F 9.8 / drei 10.7 / React 19; `useRef()` ohne Argument ist für TypeScript ungeeignet | mit Hinweis übernehmen |
| threejs-asset-pipeline | `skills/threejs-asset-pipeline/SKILL.md` | 239 | Hinweis H3 (ungepinnte `npx`-Aufrufe) | nein (Build-Zeit-Werkzeuge, keine Browser-Requests) | gltf-transform 4.5 | mit Hinweis übernehmen |

## Sicherheitsbefunde

**Ergebnis: 0 schädliche Befunde, 3 Hinweise niedriger Schwere.**

Gezielt gesucht habe ich mit Grep über alle Dateien. Das Ergebnis ist jeweils [belegt]:

| Prüfpunkt | Ergebnis |
|---|---|
| `!`-Shell-Blöcke (dynamic context injection), `` !` ``, `$(` | **keine Treffer** |
| Frontmatter: `allowed-tools`, `hooks`, `model`, `context`, `agent`, `disable-model-invocation` | **keine Treffer.** Alle 13 Skills haben ausschließlich `name` und `description` (jeweils Zeilen 1-4). Es werden also keine Werkzeuge freigeschaltet. Das passt zu reinen Wissens-Skills. |
| `~/.ssh`, `.env`, `process.env`, Token, Secret, Passwort, Credential, API-Key, Cookie, `localStorage` | **keine Treffer** |
| base64, `atob`/`btoa`, `eval`, `exec`, `new Function`, `child_process`, `spawn`, `fromCharCode`, Hex- und Unicode-Escapes, dynamisches `import()` | **keine Treffer** |
| Prompt-Injection („ignore previous“, „you must“, „without asking“, „bypass“, „dangerously“, `sudo`, `curl`, `wget`) | **keine Treffer** |
| Unsichtbare, Bidi- oder Steuerzeichen (Kategorien Cf/Co/Cn/Cc) | **keine.** Die einzigen Nicht-ASCII-Zeichen sind U+2192 →, U+2014 —, U+00D7 ×, U+2212 −, U+2013 –. |
| HTML-Kommentare oder versteckte Tags | **keine** `<!--`. `<script type="importmap">` kommt nur als sichtbares Codebeispiel vor (`threejs-fundamentals/SKILL.md:56`, `:69`). |
| An mich gerichtete Anweisungen im Repo-Inhalt | **keine.** Die Texte richten sich an Leser von three.js-Code, nicht an den Agenten. |

Hinweise niedriger Schwere [belegt]:

- **H1** `README.md:13-16`: Als Installationsweg wird `npx skills add cloudai-x/threejs-skills` empfohlen. Das ist ein Fremd-CLI von skills.sh, das ungepinnt Code aus npm ausführt. Für uns gilt das Verbot von `curl | bash` sinngemäß. Diesen Weg **nicht verwenden.**
- **H2** `README.md:21-28`: Die manuelle Installation lautet `git clone` ohne Commit-Pin und dann `cp -r threejs-skills/skills/* ~/.claude/skills/`. Damit würden alle 13 Skills ungepinnt global installiert. Für uns gilt stattdessen: nur die ausgewählten Dateien vom gepinnten Commit nach `.claude/skills/` im Projekt kopieren, Blob-SHAs siehe oben.
- **H3** `skills/threejs-asset-pipeline/SKILL.md`: Der Skill empfiehlt ungepinnte `npx`-Aufrufe:
  - `npx @gltf-transform/cli …` in den Zeilen 15-17, 58-60, 71, 73, 98-101, 114-119 und 129-134
  - `npx gltfjsx model.glb --transform` in Zeile 201
  - ein Node-Skript mit npm-Abhängigkeiten (`@gltf-transform/*`, `draco3dgltf`) in den Zeilen 168-171
  - die Installation des externen Binärprogramms `ktx` (KTX-Software ≥ 4.4.0) in Zeile 122

  Das ist fachlich legitim und offen sichtbar, also kein Schadcode. Ungepinnt heißt aber: Lieferkettenrisiko beim Ausführen durch einen Agenten. Abhilfe: gltf-transform und gltfjsx als gepinnte `devDependencies` mit Lockfile führen und über `npm run`-Skripte aufrufen. KTX-Software nur nach Rückfrage beim Betreiber installieren (BRIEFING 0A, Regel 7).

**Weiterer Punkt [Vermutung]:** Alle Skills sind modellseitig auslösbar, weil `disable-model-invocation` fehlt, und ihre Beschreibungen sind breit gefasst („Use when …“). Installiert unter `.claude/skills/` kann jeder Agent sie automatisch laden, nicht nur die vorgesehenen. Das ist kein Sicherheitsproblem, kann aber Kontext kosten.

## Fremd-Host-Empfehlungen (Website darf KEINE fremden Hosts laden)

| # | Datei:Zeile | Muster | Bewertung |
|---|---|---|---|
| F1 | `skills/threejs-fundamentals/SKILL.md:53-64`, URLs in **:59, :60** | Import-Map auf `https://cdn.jsdelivr.net/npm/three@0.186.0/…` („Without a bundler …“) | [belegt]. Für uns nicht anwendbar, weil Astro/Vite bündeln. Agenten müssen das Muster ausdrücklich meiden. |
| F2 | `skills/threejs-fundamentals/SKILL.md:66-79`, URLs in **:72, :73, :74, :75** | Import-Map für WebGPU auf `cdn.jsdelivr.net` | [belegt], wie F1 |
| F3 | `skills/threejs-loaders/SKILL.md:396-397` | `manager.setURLModifier(… "https://cdn.example.com/assets/")`, also Assets von einem CDN laden | [belegt]. Platzhalter-Domain, empfiehlt aber das Muster „Assets vom fremden CDN“. Für uns verboten. |
| F4 | `skills/threejs-react-three-fiber/SKILL.md:224` (dazu :456) | `<Environment preset="city" />` | [belegt]: Das Beispiel nutzt den Preset. [Vermutung, zu prüfen in der drei-10-Quelle]: drei lädt Presets von einem externen Host, nach meinem Kenntnisstand `raw.githack.com` (pmndrs/drei-assets). Für uns: **nur** `<Environment files="/hdr/….hdr" />` mit lokaler, CC0-lizenzierter Datei. Der Skill nennt `files` selbst als Alternative (:479). |
| F5 | `skills/threejs-react-three-fiber/SKILL.md:233` | „`useGLTF(url)` … Draco enabled by default; the Draco decoder comes from a pinned **gstatic** URL (`useGLTF.setDecoderPath` retargets it …)“ | [belegt]: Der Skill sagt selbst, dass der Default ein Google-Host ist. Für uns **Pflicht:** `useGLTF.setDecoderPath('/draco/')` mit selbst gehostetem Decoder oder Draco deaktivieren (`useGLTF(url, false)`). Ein Datenschutz-Warnhinweis fehlt im Skill. |
| F6 | `skills/threejs-react-three-fiber/SKILL.md:288-290`, :301 | drei `<Text>` ohne `font`-Prop („suspends while the font loads“) | [belegt]: Das Beispiel setzt keine Font. [Vermutung, zu prüfen in der troika-three-text-Quelle]: Ohne `font` lädt troika eine Default- bzw. Fallback-Schrift von einem CDN. Für uns: immer `font="/fonts/….woff"` lokal setzen (BRIEFING 4: keine Font-CDNs). |
| F7 | `skills/threejs-loaders/SKILL.md:222`, `:486`; `skills/threejs-textures/SKILL.md:204-205`, `:485`; `skills/threejs-asset-pipeline/SKILL.md:42`, `:146`, `:230` | Behauptung: „the Draco decoder and the Basis transcoder load from the three package by default“, deshalb `setDecoderPath`/`setTranscoderPath` weglassen | [zu prüfen]. Stimmt die Aussage für three 0.187, wird aus dem eigenen Bundle geladen und es entsteht kein Fremd-Host. Andernfalls schlägt das Laden fehl oder geht an einen anderen Ort. Vorgabe für uns: Decoder und Transcoder **immer explizit** auf einen selbst gehosteten, zur three-Version gepinnten Pfad setzen. Der Fremd-Request-Test (`a11y-perf-tester`) muss das bestätigen. |

Keine Fremd-Host-Muster (Laufzeit) gibt es in: geometry, materials, lighting, textures (außer dem Prüfpunkt F7), animation, shaders, postprocessing, interaction, performance. Der Font in `threejs-geometry/SKILL.md:107-108` ist ein relativer lokaler Pfad. Die Doku-Links in `README.md:13`, `:22`, `:100` (skills.sh, github.com, threejs.org) sind keine Laufzeit-Requests.

Summe: **6 URLs in 2 Import-Maps (F1, F2) und 4 weitere Muster (F3 bis F6), dazu ein Prüfpunkt (F7).**

## Fachliche Aktualität (Stichprobe, keine Vollprüfung)

Positiv [belegt]: Keine der veralteten APIs wird empfohlen. `THREE.Geometry`, `outputEncoding`/`sRGBEncoding`, `examples/js`, `physicallyCorrectLights`, `*BufferGeometry`-Aliase, `mergeBufferGeometries` und `Face3` erscheinen nur in den Abschnitten „Common Mistakes“, also ausdrücklich als falsch. Beispiele: `threejs-fundamentals/SKILL.md:473-477`, `threejs-geometry/SKILL.md:488-489`, `threejs-interaction/SKILL.md:487`. Import-Pfade lauten durchgehend `three/addons/…`. Farbmanagement läuft über `colorSpace` und `SRGBColorSpace`. Die Skills sind auf r186 abgestimmt und damit sehr aktuell.

Auffälligkeiten:

- **A1** [belegt], `threejs-react-three-fiber/SKILL.md:20`, `:120`, `:315`, `:425`: `useRef()` ohne Argument. Mit den React-19-Typen verlangt `useRef` in TypeScript ein Argument [Vermutung, hohe Sicherheit]. Für TypeScript-Code daher `useRef<THREE.Mesh>(null!)` verwenden. In reinem JavaScript ist das unkritisch.
- **A2** [belegt], `README.md:5`, jeweils Zeile 8 jedes Skills: Die Skills zielen auf r186, wir nutzen 0.187. Deprecations in r187 sind nicht abgedeckt. Vor Nutzung gegen den r187-Migration-Guide prüfen [zu prüfen].
- **A3** [belegt], jeder Skill hat einen Abschnitt „WebGPU and TSL“, `README.md:9` drängt zu WebGPURenderer und TSL. Laut `threejs-react-three-fiber/SKILL.md:458` sind drei `Text`, `ContactShadows`, `Environment ground` und `Html occlude="blending"` nicht WebGPU-sicher. Die Projektentscheidung WebGL oder WebGPU muss in `CLAUDE.md` stehen, sonst mischen Agenten beide Wege.
- **A4** [belegt], `threejs-react-three-fiber/SKILL.md:145`: Fiber 9.8 erzeugt `state.clock` als `THREE.Clock` und löst damit eine Deprecation-Warnung von three aus. Der Skill erklärt das korrekt, und die Warnung entsteht nicht durch eigenen Code. Für den Konsolen-sauber-Check der DoD einplanen.
- **A5** [belegt], `threejs-react-three-fiber/SKILL.md:302`: konkreter Workaround für `Html` mit React 19.2 (`portal`-Ref) [zu prüfen].
- **A6** [zu prüfen]: neuere APIs, die ich ohne Paketquelle nicht bestätigen kann. Sie wirken plausibel, und laut `README.md:84-90` wurden sie gegen die Pakete geprüft:
  - `mesh.pivot` (`threejs-geometry/SKILL.md:378`)
  - `HTMLTexture` (`threejs-textures/SKILL.md:196`)
  - `SunLight` (`threejs-lighting/SKILL.md:96-109`)
  - `LightProbeGridWebGL` (`threejs-lighting/SKILL.md:331`)
  - `retroreflectivity` (`threejs-materials/SKILL.md:173`)
  - `WebGLNodesHandler`/`setNodesHandler` (`threejs-fundamentals/SKILL.md:460`)
  - `renderer.setEffects` mit `outputBufferType` (`threejs-postprocessing/SKILL.md:356-375`)
  - `RenderPipeline` statt `PostProcessing` (`threejs-postprocessing/SKILL.md:485`)
  - Clock deprecated in r183 (`threejs-fundamentals/SKILL.md:468`)
  - PCFSoftShadowMap deprecated in r182 (`threejs-fundamentals/SKILL.md:467`)
- **A7** Fachliche Lücken für unsere Agenten [belegt per Grep, keine Treffer]:
  - kein `GLTFExporter`, also kein GLB-Export, obwohl `planner-export` den braucht
  - kein CSG (`three-bvh-csg`); `three-mesh-bvh` wird nur in einem Satz erwähnt (`threejs-performance/SKILL.md:280`)
  - keine `Shape.holes`, also keine Tür- und Fensteröffnungen bei der Extrusion
  - kein `prefers-reduced-motion`
  - keine Scroll-Inszenierung (ScrollControls/GSAP)

  Diese Themen müssen aus der offiziellen Doku (context7) oder aus `gsap-scrolltrigger` kommen.

## Zuordnung zu unseren Agenten (Vorschlag)

Wichtig: Die echten Skill-Namen tragen das Präfix `threejs-`. Die Tabelle in BRIEFING 0A („fundamentals, performance …“) muss in `skills:` als `threejs-fundamentals` usw. eingetragen werden. Die Token-Zahlen sind grob geschätzt (Bytes ÷ 4) [Vermutung].

| Agent | Vorladen (Pflicht) | Zeilen | ca. Bytes / Tokens | Optional, nicht vorladen |
|---|---|---:|---|---|
| (a) `motion-3d` | threejs-fundamentals (495), threejs-performance (391), threejs-react-three-fiber (488), threejs-shaders (497) | 1871 | 105 KB / ~26k | threejs-postprocessing (497), threejs-animation (500) |
| (b) `planner-geometry` | threejs-geometry (500), threejs-interaction (500) | 1000 | 48 KB / ~12k | threejs-react-three-fiber (488), threejs-performance (391) |
| (c) `planner-design` | threejs-materials (500), threejs-textures (500), threejs-lighting (483) | 1483 | 73 KB / ~18k | threejs-react-three-fiber (488) |
| (d) `planner-export` | threejs-loaders (500), threejs-asset-pipeline (239) | 739 | 40 KB / ~10k | – (Lücke `GLTFExporter`, siehe A7) |

Bemerkungen:
- Bei `motion-3d` ist mit rund 26k Tokens die Grenze erreicht. Falls der Hero ohne eigene Shader auskommt, `threejs-shaders` nicht vorladen.
- Die Planer-Agenten arbeiten vermutlich ebenfalls in R3F. Ob `threejs-react-three-fiber` (488 Zeilen) auch dort vorgeladen wird, entscheidet der Orchestrator. Sonst lädt der Agent den Skill bei Bedarf automatisch.
- `threejs-animation` und `threejs-postprocessing` sind keinem Agenten im Briefing zugeordnet. Animation brauchen wir vorerst nicht (Bewegung über GSAP/`useFrame`). Postprocessing ist für den Hero möglich, steht aber im Konflikt mit dem Performance-Budget, deshalb höchstens bei Bedarf und nicht vorladen.

## Empfohlene Übernahme nach `.claude/skills/` (geprüfte Kopie)

Quelle: Commit `0e181866f095b5f06d005133876e926515390d95`. Dateien unverändert kopieren und die Blob-SHAs aus der Dateiliste oben gegenprüfen (`git hash-object <datei>`).

```
.claude/skills/threejs-fundamentals/SKILL.md        <- skills/threejs-fundamentals/SKILL.md
.claude/skills/threejs-geometry/SKILL.md            <- skills/threejs-geometry/SKILL.md
.claude/skills/threejs-materials/SKILL.md           <- skills/threejs-materials/SKILL.md
.claude/skills/threejs-lighting/SKILL.md            <- skills/threejs-lighting/SKILL.md
.claude/skills/threejs-textures/SKILL.md            <- skills/threejs-textures/SKILL.md
.claude/skills/threejs-loaders/SKILL.md             <- skills/threejs-loaders/SKILL.md
.claude/skills/threejs-interaction/SKILL.md         <- skills/threejs-interaction/SKILL.md
.claude/skills/threejs-performance/SKILL.md         <- skills/threejs-performance/SKILL.md
.claude/skills/threejs-react-three-fiber/SKILL.md   <- skills/threejs-react-three-fiber/SKILL.md
.claude/skills/threejs-shaders/SKILL.md             <- skills/threejs-shaders/SKILL.md
.claude/skills/threejs-asset-pipeline/SKILL.md      <- skills/threejs-asset-pipeline/SKILL.md
.claude/skills/threejs-postprocessing/SKILL.md      <- skills/threejs-postprocessing/SKILL.md   (optional)
```

Nicht übernehmen: `skills/threejs-animation/SKILL.md` (vorerst), `README.md` (enthält die Installationswege H1/H2). Den MIT-Lizenztext (`LICENSE`) nach `THIRD-PARTY-LICENSES.md` übernehmen, Quelle und Commit-Hash nennen.

Begleitende Projektregeln für `CLAUDE.md` bzw. die Agenten-Definitionen, weil die Skills selbst unverändert bleiben sollen:
1. Keine CDN-Import-Maps (F1, F2) und keine Asset-URLs auf fremde Hosts (F3).
2. `<Environment>` nur mit `files` auf lokale HDR-Dateien, nie `preset` (F4).
3. `useGLTF.setDecoderPath('/draco/')` mit selbst gehostetem Decoder (F5). DRACOLoader- und KTX2Loader-Pfade immer explizit lokal setzen (F7).
4. drei `<Text>` immer mit lokaler `font` (F6).
5. gltf-transform und gltfjsx nur als gepinnte `devDependencies`, kein ad-hoc `npx` (H3).
6. Festlegen, ob WebGLRenderer oder WebGPURenderer genutzt wird (A3).

Alternative: in der Kopie die Zeilen F1/F2 lokal entfernen und den Patch dokumentieren. Dann stimmen die Blob-SHAs nicht mehr mit dem Upstream überein. Ich rate davon ab und empfehle die Regeln oben.

## Nicht prüfbar / Unsicherheiten

- **Stars, Forks, Contributors und Historie:** über die GitHub-API nicht abrufbar (HTTP 403), aus dem flachen Klon nicht ableitbar. Die Angaben der Vorrecherche („ca. 3,7k Stars“, „ein Hauptautor“) sind unbestätigt. Belegt ist nur, dass der letzte Commit vom Account „CloudAI-X“ stammt.
- **Tatsächliches Netzwerkverhalten der Defaults:** drei `Environment preset` (F4), troika-Default-Font (F6) und die Draco/KTX2-Pfade von three 0.187 (F7) habe ich nicht in den Paketquellen geprüft, weil kein Paket installiert oder heruntergeladen wurde. Das klärt der Fremd-Request-Test im Browser.
- **API-Korrektheit:** Die unter A6 genannten APIs sind [zu prüfen], ebenso alles, was erst ab r187 gilt (A2). Die Verifikationsbehauptung in `README.md:82-90` habe ich nicht nachvollzogen.
- **Zukünftige Änderungen:** Das Audit gilt nur für den genannten Commit. Jede Aktualisierung muss erneut geprüft werden.
- **Token-Schätzungen** in der Zuordnung sind grob (Bytes ÷ 4).

Nicht ausgeführt: keine npm-, pip- oder npx-Aufrufe, keine Skripte, keine Hooks. Der Klon bleibt für Stichproben liegen unter `/tmp/claude-0/-home-user/4de6bfe2-8089-5731-8e90-77052bdcc979/scratchpad/skill-audit/threejs`.
