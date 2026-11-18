# Drittanbieter-Lizenzen

Automatisch erzeugt mit `npm run licenses` aus `package-lock.json`. Nicht von Hand bearbeiten.

Projektregel: nur MIT, Apache-2.0, BSD, ISC (und gleich oder freizügigere Lizenzen: MIT-0, 0BSD, BlueOak-1.0.0, CC0-1.0, Python-2.0, Unlicense). Schriften: OFL-1.1 (Lizenztext liegt bei den Schriftdateien). Texturen: CC0.

## Dokumentierte Ausnahmen (⚑)

| Paket | Lizenz | Grund | Status |
|---|---|---|---|
| `gsap` | Standard no charge license | Animation (Phase 3); kostenlos, keine OSI-Lizenz | freigegeben |
| `sharp` | Apache-2.0 (enthält libvips LGPL-3.0) | Bildoptimierung von Astro, nur im Build | freigegeben |
| `@img/sharp-*` | LGPL-3.0-or-later | vorkompiliertes libvips für sharp, dynamisch gelinkt, unverändert, nur im Build | freigegeben |
| `libheif-js` | LGPL-3.0 | HEIC-Decoder im Raumplaner (Phase 4), unverändert, eigener Chunk | freigegeben |
| `heic-to` | LGPL-3.0 | HEIC-Decoder im Raumplaner (Phase 4) | freigegeben |
| `axe-core` | MPL-2.0 | nur Testwerkzeug, wird nicht ausgeliefert | freigegeben |
| `@axe-core/*` | MPL-2.0 | nur Testwerkzeug, wird nicht ausgeliefert | freigegeben |
| `lightningcss*` | MPL-2.0 | CSS-Werkzeug von Vite 8, nur im Build, unverändert, wird nicht ausgeliefert | freigegeben |
| `y-provider` | keine Angabe | Abhängigkeit von Keystatic (nur Entwicklung, lokal), wird nicht ausgeliefert | freigegeben |

LGPL-Bibliotheken werden unverändert und als austauschbare Einheit genutzt (dynamisch gelinkt bzw. eigener Chunk). MPL-2.0-Werkzeuge werden unverändert genutzt und nicht ausgeliefert.

## Laufzeit- und Build-Abhängigkeiten (303)

Plattform-spezifische optionale Pakete (z. B. `@img/sharp-*`, `lightningcss-*`) werden nur für das jeweilige Betriebssystem installiert.

| Paket | Version | Lizenz |
|---|---|---|
| @astrojs/compiler-binding | 0.5.3 | MIT |
| @astrojs/compiler-binding-android-arm64 | 0.5.3 | MIT |
| @astrojs/compiler-binding-darwin-arm64 | 0.5.3 | MIT |
| @astrojs/compiler-binding-darwin-x64 | 0.5.3 | MIT |
| @astrojs/compiler-binding-linux-arm64-gnu | 0.5.3 | MIT |
| @astrojs/compiler-binding-linux-arm64-musl | 0.5.3 | MIT |
| @astrojs/compiler-binding-linux-x64-gnu | 0.5.3 | MIT |
| @astrojs/compiler-binding-linux-x64-musl | 0.5.3 | MIT |
| @astrojs/compiler-binding-wasm32-wasi | 0.5.3 | MIT |
| @astrojs/compiler-binding-win32-arm64-msvc | 0.5.3 | MIT |
| @astrojs/compiler-binding-win32-x64-msvc | 0.5.3 | MIT |
| @astrojs/compiler-rs | 0.5.3 | MIT |
| @astrojs/internal-helpers | 0.13.2 | MIT |
| @astrojs/markdown-satteri | 0.4.10 | MIT |
| @astrojs/node | 11.1.13 | MIT |
| @astrojs/prism | 4.1.2 | MIT |
| @astrojs/react | 7.1.9 | MIT |
| @astrojs/react-renderer | 0.1.3 | MIT |
| @astrojs/runtime | 0.1.1 | MIT |
| @astrojs/sitemap | 3.7.5 | MIT |
| @astrojs/telemetry | 3.4.2 | MIT |
| @astrojs/vite-plugin-astro | 0.1.3 | MIT |
| @babel/helper-string-parser | 7.29.14 | MIT |
| @babel/helper-validator-identifier | 7.29.7 | MIT |
| @babel/parser | 7.29.14 | MIT |
| @babel/types | 7.29.14 | MIT |
| @bruits/satteri-android-arm64 | 0.11.7 | MIT |
| @bruits/satteri-darwin-arm64 | 0.11.7 | MIT |
| @bruits/satteri-darwin-x64 | 0.11.7 | MIT |
| @bruits/satteri-freebsd-x64 | 0.11.7 | MIT |
| @bruits/satteri-linux-arm64-gnu | 0.11.7 | MIT |
| @bruits/satteri-linux-arm64-musl | 0.11.7 | MIT |
| @bruits/satteri-linux-x64-gnu | 0.11.7 | MIT |
| @bruits/satteri-linux-x64-musl | 0.11.7 | MIT |
| @bruits/satteri-wasm32-wasi | 0.11.7 | MIT |
| @bruits/satteri-win32-arm64-msvc | 0.11.7 | MIT |
| @bruits/satteri-win32-x64-msvc | 0.11.7 | MIT |
| @capsizecss/unpack | 4.0.1 | MIT |
| @clack/core | 1.6.0 | MIT |
| @clack/prompts | 1.9.0 | MIT |
| @emnapi/core | 1.11.1 | MIT |
| @emnapi/core | 1.11.3 | MIT |
| @emnapi/core | 2.0.0-beta.2 | MIT |
| @emnapi/runtime | 1.11.1 | MIT |
| @emnapi/runtime | 1.11.3 | MIT |
| @emnapi/runtime | 2.0.0-beta.2 | MIT |
| @emnapi/wasi-threads | 1.2.2 | MIT |
| @emnapi/wasi-threads | 1.2.3 | MIT |
| @emnapi/wasi-threads | 2.2.0 | MIT |
| @img/colour | 1.1.0 | MIT |
| @img/sharp-darwin-arm64 | 0.35.5 | Apache-2.0 |
| @img/sharp-darwin-x64 | 0.35.5 | Apache-2.0 |
| @img/sharp-freebsd-wasm32 | 0.35.5 | Apache-2.0 |
| @img/sharp-libvips-darwin-arm64 | 1.3.4 | LGPL-3.0-or-later ⚑ |
| @img/sharp-libvips-darwin-x64 | 1.3.4 | LGPL-3.0-or-later ⚑ |
| @img/sharp-libvips-linux-arm | 1.3.4 | LGPL-3.0-or-later ⚑ |
| @img/sharp-libvips-linux-arm64 | 1.3.4 | LGPL-3.0-or-later ⚑ |
| @img/sharp-libvips-linux-ppc64 | 1.3.4 | LGPL-3.0-or-later ⚑ |
| @img/sharp-libvips-linux-riscv64 | 1.3.4 | LGPL-3.0-or-later ⚑ |
| @img/sharp-libvips-linux-s390x | 1.3.4 | LGPL-3.0-or-later ⚑ |
| @img/sharp-libvips-linux-x64 | 1.3.4 | LGPL-3.0-or-later ⚑ |
| @img/sharp-libvips-linuxmusl-arm64 | 1.3.4 | LGPL-3.0-or-later ⚑ |
| @img/sharp-libvips-linuxmusl-x64 | 1.3.4 | LGPL-3.0-or-later ⚑ |
| @img/sharp-linux-arm | 0.35.5 | Apache-2.0 |
| @img/sharp-linux-arm64 | 0.35.5 | Apache-2.0 |
| @img/sharp-linux-ppc64 | 0.35.5 | Apache-2.0 |
| @img/sharp-linux-riscv64 | 0.35.5 | Apache-2.0 |
| @img/sharp-linux-s390x | 0.35.5 | Apache-2.0 |
| @img/sharp-linux-x64 | 0.35.5 | Apache-2.0 |
| @img/sharp-linuxmusl-arm64 | 0.35.5 | Apache-2.0 |
| @img/sharp-linuxmusl-x64 | 0.35.5 | Apache-2.0 |
| @img/sharp-wasm32 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later AND MIT ⚑ |
| @img/sharp-webcontainers-wasm32 | 0.35.5 | Apache-2.0 |
| @img/sharp-win32-arm64 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later ⚑ |
| @img/sharp-win32-ia32 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later ⚑ |
| @img/sharp-win32-x64 | 0.35.5 | Apache-2.0 AND LGPL-3.0-or-later ⚑ |
| @jridgewell/sourcemap-codec | 1.6.0 | MIT |
| @napi-rs/wasm-runtime | 1.2.6 | MIT |
| @napi-rs/wasm-runtime | 1.2.7 | MIT |
| @oslojs/encoding | 1.1.0 | MIT |
| @oxc-project/types | 0.156.0 | MIT |
| @rolldown/binding-android-arm-eabi | 1.2.19 | MIT |
| @rolldown/binding-android-arm64 | 1.2.19 | MIT |
| @rolldown/binding-darwin-arm64 | 1.2.19 | MIT |
| @rolldown/binding-darwin-x64 | 1.2.19 | MIT |
| @rolldown/binding-freebsd-x64 | 1.2.19 | MIT |
| @rolldown/binding-linux-arm-gnueabihf | 1.2.19 | MIT |
| @rolldown/binding-linux-arm64-gnu | 1.2.19 | MIT |
| @rolldown/binding-linux-arm64-musl | 1.2.19 | MIT |
| @rolldown/binding-linux-ppc64-gnu | 1.2.19 | MIT |
| @rolldown/binding-linux-s390x-gnu | 1.2.19 | MIT |
| @rolldown/binding-linux-x64-gnu | 1.2.19 | MIT |
| @rolldown/binding-linux-x64-musl | 1.2.19 | MIT |
| @rolldown/binding-openharmony-arm64 | 1.2.19 | MIT |
| @rolldown/binding-wasm32-wasi | 1.2.19 | MIT |
| @rolldown/binding-win32-arm64-msvc | 1.2.19 | MIT |
| @rolldown/binding-win32-x64-msvc | 1.2.19 | MIT |
| @rolldown/pluginutils | 1.1.1 | MIT |
| @shikijs/core | 4.6.0 | MIT |
| @shikijs/engine-javascript | 4.6.0 | MIT |
| @shikijs/engine-oniguruma | 4.6.0 | MIT |
| @shikijs/langs | 4.6.0 | MIT |
| @shikijs/primitive | 4.6.0 | MIT |
| @shikijs/themes | 4.6.0 | MIT |
| @shikijs/types | 4.6.0 | MIT |
| @shikijs/vscode-textmate | 10.1.0 | MIT |
| @tabler/icons | 3.52.0 | MIT |
| @tybys/wasm-util | 0.10.5 | MIT |
| @types/estree | 1.0.10 | MIT |
| @types/estree-jsx | 1.0.5 | MIT |
| @types/hast | 3.0.5 | MIT |
| @types/mdast | 4.0.4 | MIT |
| @types/nlcst | 2.0.3 | MIT |
| @types/node | 22.20.5 | MIT |
| @types/react | 19.3.0 | MIT |
| @types/react-dom | 19.3.0 | MIT |
| @types/sax | 1.2.7 | MIT |
| @types/unist | 3.0.3 | MIT |
| @ungap/structured-clone | 1.4.0 | ISC |
| @vitejs/plugin-react | 6.3.0 | MIT |
| am-i-vibing | 0.5.0 | MIT |
| anymatch | 3.1.3 | ISC |
| aria-query | 5.3.2 | Apache-2.0 |
| astro | 7.4.12 | MIT |
| axobject-query | 4.1.0 | Apache-2.0 |
| bail | 2.0.2 | MIT |
| boolbase | 1.0.0 | ISC |
| ccount | 2.0.1 | MIT |
| character-entities-html4 | 2.1.0 | MIT |
| character-entities-legacy | 3.0.0 | MIT |
| chokidar | 5.0.0 | MIT |
| ci-info | 4.5.0 | MIT |
| clsx | 2.1.1 | MIT |
| comma-separated-tokens | 2.0.3 | MIT |
| commander | 11.1.0 | MIT |
| common-ancestor-path | 2.0.0 | BlueOak-1.0.0 |
| cookie | 2.0.2 | MIT |
| cookie-es | 1.2.3 | MIT |
| crossws | 0.3.5 | MIT |
| css-select | 6.0.0 | BSD-2-Clause |
| css-tree | 2.2.1 | MIT |
| css-tree | 3.2.1 | MIT |
| css-what | 7.0.0 | BSD-2-Clause |
| csso | 5.0.5 | MIT |
| csstype | 3.2.4 | MIT |
| debug | 4.4.3 | MIT |
| defu | 6.1.7 | MIT |
| depd | 2.0.0 | MIT |
| dequal | 2.0.3 | MIT |
| destr | 2.0.5 | MIT |
| detect-libc | 2.1.2 | Apache-2.0 |
| devalue | 6.0.3 | MIT |
| devlop | 1.1.0 | MIT |
| diff | 9.0.0 | BSD-3-Clause |
| dom-serializer | 2.0.0 | MIT |
| domelementtype | 2.3.0 | BSD-2-Clause |
| domhandler | 5.0.3 | BSD-2-Clause |
| domutils | 3.2.2 | BSD-2-Clause |
| dset | 3.1.4 | MIT |
| ee-first | 1.1.1 | MIT |
| encodeurl | 2.0.3 | MIT |
| entities | 4.5.0 | BSD-2-Clause |
| es-module-lexer | 3.0.5 | MIT |
| escape-html | 1.0.3 | MIT |
| etag | 1.8.1 | MIT |
| extend | 3.0.2 | MIT |
| fast-string-truncated-width | 3.0.3 | MIT |
| fast-string-width | 3.0.2 | MIT |
| fast-wrap-ansi | 0.2.2 | MIT |
| fdir | 6.5.0 | MIT |
| flattie | 1.1.1 | MIT |
| fnv1a-64 | 0.1.2 | MIT |
| fontace | 0.4.1 | MIT |
| fontkitten | 1.0.3 | MIT |
| fresh | 2.0.0 | MIT |
| fsevents | 2.3.3 | MIT |
| get-tsconfig | 5.0.0-beta.6 | MIT |
| github-slugger | 2.0.0 | ISC |
| h3 | 1.15.11 | MIT |
| hast-util-to-html | 9.0.6 | MIT |
| hast-util-whitespace | 3.0.0 | MIT |
| html-escaper | 3.0.3 | MIT |
| html-void-elements | 3.0.0 | MIT |
| http-cache-semantics | 4.3.0 | BSD-2-Clause |
| http-errors | 2.0.1 | MIT |
| idb-keyval | 6.3.0 | Apache-2.0 |
| inherits | 2.0.4 | ISC |
| iron-webcrypto | 1.2.1 | MIT |
| is-docker | 4.0.0 | MIT |
| is-plain-obj | 4.1.0 | MIT |
| jsonc-parser | 3.3.1 | MIT |
| lightningcss | 1.33.0 | MPL-2.0 ⚑ |
| lightningcss-android-arm64 | 1.33.0 | MPL-2.0 ⚑ |
| lightningcss-darwin-arm64 | 1.33.0 | MPL-2.0 ⚑ |
| lightningcss-darwin-x64 | 1.33.0 | MPL-2.0 ⚑ |
| lightningcss-freebsd-x64 | 1.33.0 | MPL-2.0 ⚑ |
| lightningcss-linux-arm-gnueabihf | 1.33.0 | MPL-2.0 ⚑ |
| lightningcss-linux-arm64-gnu | 1.33.0 | MPL-2.0 ⚑ |
| lightningcss-linux-arm64-musl | 1.33.0 | MPL-2.0 ⚑ |
| lightningcss-linux-x64-gnu | 1.33.0 | MPL-2.0 ⚑ |
| lightningcss-linux-x64-musl | 1.33.0 | MPL-2.0 ⚑ |
| lightningcss-win32-arm64-msvc | 1.33.0 | MPL-2.0 ⚑ |
| lightningcss-win32-x64-msvc | 1.33.0 | MPL-2.0 ⚑ |
| lru-cache | 11.5.3 | BlueOak-1.0.0 |
| magic-string | 1.4.5 | MIT |
| magicast | 0.5.5 | MIT |
| mdast-util-to-hast | 13.2.2 | MIT |
| mdn-data | 2.0.28 | CC0-1.0 |
| mdn-data | 2.27.1 | CC0-1.0 |
| micromark-util-character | 2.1.1 | MIT |
| micromark-util-encode | 2.0.1 | MIT |
| micromark-util-sanitize-uri | 2.0.1 | MIT |
| micromark-util-symbol | 2.0.1 | MIT |
| micromark-util-types | 2.0.3 | MIT |
| mime-db | 1.54.0 | MIT |
| mime-types | 3.0.2 | MIT |
| mri | 1.2.0 | MIT |
| mrmime | 2.0.1 | MIT |
| ms | 2.1.3 | MIT |
| nanoid | 3.3.20 | MIT |
| neotraverse | 1.0.2 | MIT |
| nlcst-to-string | 4.0.0 | MIT |
| node-fetch-native | 1.6.7 | MIT |
| node-mock-http | 1.0.5 | MIT |
| normalize-path | 3.0.0 | MIT |
| nth-check | 2.1.1 | BSD-2-Clause |
| obug | 3.0.0 | MIT |
| ofetch | 1.5.1 | MIT |
| on-finished | 2.4.2 | MIT |
| oniguruma-parser | 0.12.2 | MIT |
| oniguruma-to-es | 4.3.6 | MIT |
| p-limit | 7.3.3 | MIT |
| p-queue | 10.0.0 | MIT |
| package-manager-detector | 1.9.0 | MIT |
| piccolore | 0.1.3 | ISC |
| picocolors | 1.1.1 | ISC |
| picomatch | 2.3.2 | MIT |
| picomatch | 4.0.7 | MIT |
| postcss | 8.5.33 | MIT |
| prismjs | 1.30.0 | MIT |
| process-ancestry | 0.1.0 | MIT |
| property-information | 7.2.0 | MIT |
| radix3 | 1.1.2 | MIT |
| range-parser | 1.3.0 | MIT |
| react | 19.3.1 | MIT |
| react-dom | 19.3.1 | MIT |
| readdirp | 5.1.1 | MIT |
| regex | 6.1.0 | MIT |
| regex-recursion | 6.0.2 | MIT |
| regex-utilities | 2.3.0 | MIT |
| resolve-pkg-maps | 1.0.0 | MIT |
| retext-smartypants | 6.2.0 | MIT |
| rolldown | 1.2.19 | MIT |
| satteri | 0.11.7 | MIT |
| sax | 1.6.1 | BlueOak-1.0.0 |
| scheduler | 0.28.0 | MIT |
| semver | 7.8.6 | ISC |
| send | 1.2.1 | MIT |
| server-destroy | 1.0.1 | ISC |
| setprototypeof | 1.2.0 | ISC |
| sharp | 0.35.5 | Apache-2.0 |
| shiki | 4.6.0 | MIT |
| sisteransi | 2.0.0 | MIT |
| sitemap | 10.0.0 | MIT |
| smol-toml | 1.9.1 | BSD-3-Clause |
| source-map-js | 1.2.2 | BSD-3-Clause |
| space-separated-tokens | 2.0.2 | MIT |
| statuses | 2.0.2 | MIT |
| std-env | 4.3.0 | MIT |
| stringify-entities | 4.0.4 | MIT |
| svgo | 4.1.0 | MIT |
| tiny-inflate | 1.0.3 | MIT |
| tinyclip | 1.0.3 | MIT |
| tinyexec | 1.3.1 | MIT |
| tinyglobby | 0.2.17 | MIT |
| tinyps | 0.5.2 | MIT |
| toidentifier | 1.0.1 | MIT |
| trim-lines | 3.0.1 | MIT |
| trough | 2.2.0 | MIT |
| tslib | 2.9.1 | 0BSD |
| ufo | 1.6.4 | MIT |
| ultrahtml | 1.7.0 | MIT |
| uncrypto | 0.1.3 | MIT |
| undici | 8.12.4 | MIT |
| undici-types | 6.21.0 | MIT |
| unified | 11.0.5 | MIT |
| unifont | 1.0.3 | MIT |
| unist-util-is | 6.0.1 | MIT |
| unist-util-position | 5.0.0 | MIT |
| unist-util-stringify-position | 4.0.0 | MIT |
| unist-util-visit | 5.2.0 | MIT |
| unist-util-visit-parents | 6.1.0 | MIT |
| unstorage | 1.17.6 | MIT |
| verkit | 0.5.0 | MIT |
| vfile | 6.0.3 | MIT |
| vfile-message | 4.0.4 | MIT |
| vite | 8.3.8 | MIT |
| vitefu | 1.1.4 | MIT |
| xxhash-wasm | 1.1.0 | MIT |
| yaml | 2.9.1 | ISC |
| yocto-queue | 1.2.2 | MIT |
| zod | 4.6.7 | MIT |
| zwitch | 2.0.4 | MIT |

## Nur Entwicklung und Tests (257)

| Paket | Version | Lizenz |
|---|---|---|
| @0no-co/graphql.web | 1.3.4 | MIT |
| @astrojs/astro2tsx | 0.1.4 | MIT |
| @astrojs/check | 0.9.12 | MIT |
| @astrojs/language-server | 2.17.3 | MIT |
| @astrojs/yaml2ts | 0.2.4 | MIT |
| @axe-core/playwright | 4.14.0 | MPL-2.0 ⚑ |
| @babel/runtime | 7.29.14 | MIT |
| @braintree/sanitize-url | 6.0.4 | MIT |
| @emmetio/abbreviation | 2.3.3 | MIT |
| @emmetio/css-abbreviation | 2.1.8 | MIT |
| @emmetio/css-parser | 0.4.1 | MIT |
| @emmetio/html-matcher | 1.3.0 | ISC |
| @emmetio/scanner | 1.0.4 | MIT |
| @emmetio/stream-reader | 2.2.0 | MIT |
| @emmetio/stream-reader-utils | 0.1.0 | MIT |
| @emotion/cache | 11.14.0 | MIT |
| @emotion/hash | 0.9.2 | MIT |
| @emotion/memoize | 0.9.0 | MIT |
| @emotion/serialize | 1.3.3 | MIT |
| @emotion/sheet | 1.4.0 | MIT |
| @emotion/unitless | 0.10.0 | MIT |
| @emotion/utils | 1.4.2 | MIT |
| @emotion/weak-memoize | 0.3.1 | MIT |
| @emotion/weak-memoize | 0.4.0 | MIT |
| @floating-ui/core | 1.8.0 | MIT |
| @floating-ui/dom | 1.8.0 | MIT |
| @floating-ui/react | 0.24.8 | MIT |
| @floating-ui/react-dom | 2.1.9 | MIT |
| @floating-ui/utils | 0.2.12 | MIT |
| @graphql-typed-document-node/core | 3.2.0 | MIT |
| @internationalized/date | 3.12.4 | Apache-2.0 |
| @internationalized/number | 3.6.9 | Apache-2.0 |
| @internationalized/string | 3.2.10 | Apache-2.0 |
| @isaacs/nonrecursive-glob-match | 1.1.0 | BlueOak-1.0.0 |
| @jridgewell/resolve-uri | 3.1.3 | MIT |
| @jridgewell/trace-mapping | 0.3.31 | MIT |
| @juggle/resize-observer | 3.4.0 | Apache-2.0 |
| @keystar/ui | 0.10.1 | MIT AND Apache-2.0 |
| @keystatic/astro | 6.0.0 | MIT |
| @keystatic/core | 0.6.10 | MIT |
| @markdoc/markdoc | 0.4.0 | MIT |
| @napi-rs/wasm-runtime | 1.2.4 | MIT |
| @playwright/test | 1.63.0 | Apache-2.0 |
| @react-types/shared | 3.37.0 | Apache-2.0 |
| @sindresorhus/slugify | 1.1.2 | MIT |
| @sindresorhus/transliterate | 0.1.2 | MIT |
| @swc/helpers | 0.5.24 | Apache-2.0 |
| @toeverything/y-indexeddb | 0.10.0-canary.9 | MIT |
| @ts-gql/tag | 0.7.3 | MIT |
| @types/chai | 5.2.3 | MIT |
| @types/debug | 4.1.13 | MIT |
| @types/deep-eql | 4.0.2 | MIT |
| @types/is-hotkey | 0.1.10 | MIT |
| @types/linkify-it | 5.0.0 | MIT |
| @types/lodash | 4.17.27 | MIT |
| @types/markdown-it | 12.2.3 | MIT |
| @types/mdurl | 2.0.0 | MIT |
| @types/ms | 2.1.0 | MIT |
| @types/unist | 2.0.11 | MIT |
| @urql/core | 5.2.0 | MIT |
| @urql/exchange-auth | 2.2.1 | MIT |
| @urql/exchange-graphcache | 7.2.4 | MIT |
| @urql/exchange-persisted | 4.3.1 | MIT |
| @vitest/mocker | 5.1.1 | MIT |
| @vitest/spy | 5.1.1 | MIT |
| @volar/kit | 2.4.31 | MIT |
| @volar/language-core | 2.4.31 | MIT |
| @volar/language-server | 2.4.31 | MIT |
| @volar/language-service | 2.4.31 | MIT |
| @volar/source-map | 2.4.31 | MIT |
| @volar/typescript | 2.4.31 | MIT |
| @vscode/emmet-helper | 2.11.0 | MIT |
| @vscode/l10n | 0.0.18 | MIT |
| acorn | 8.19.0 | MIT |
| acorn-jsx | 5.3.2 | MIT |
| ajv | 8.20.0 | MIT |
| ajv-draft-04 | 1.0.0 | MIT |
| ajv-i18n | 4.2.0 | MIT |
| ansi-regex | 6.6.0 | MIT |
| ansi-styles | 6.2.3 | MIT |
| argparse | 2.0.1 | Python-2.0 |
| aria-hidden | 1.2.6 | MIT |
| assertion-error | 2.0.1 | MIT |
| axe-core | 4.14.1 | MPL-2.0 ⚑ |
| balanced-match | 4.0.4 | MIT |
| brace-expansion | 5.0.13 | MIT |
| chai | 6.3.0 | MIT |
| character-entities | 2.0.2 | MIT |
| character-reference-invalid | 2.0.1 | MIT |
| cliui | 9.0.1 | ISC |
| compute-scroll-into-view | 1.0.20 | MIT |
| compute-scroll-into-view | 3.2.2 | MIT |
| cookie | 1.1.1 | MIT |
| decode-named-character-reference | 1.3.0 | MIT |
| direction | 1.0.4 | MIT |
| emery | 1.4.4 | MIT |
| emmet | 2.4.11 | MIT |
| emoji-regex | 10.6.0 | MIT |
| es-module-lexer | 2.3.2 | MIT |
| escalade | 3.2.0 | MIT |
| escape-string-regexp | 2.0.0 | MIT |
| escape-string-regexp | 4.0.0 | MIT |
| escape-string-regexp | 5.0.0 | MIT |
| estree-util-is-identifier-name | 3.0.0 | MIT |
| estree-util-visit | 2.0.0 | MIT |
| estree-walker | 3.0.3 | MIT |
| event-target-shim | 6.0.2 | MIT |
| expect-type | 1.4.0 | Apache-2.0 |
| facepaint | 1.2.1 | MIT |
| fast-deep-equal | 3.1.3 | MIT |
| fast-uri | 3.1.9 | BSD-3-Clause |
| get-caller-file | 2.0.5 | ISC |
| get-east-asian-width | 1.7.0 | MIT |
| graphql | 16.15.0 | MIT |
| graphql-tag | 2.12.7 | MIT |
| idb | 7.1.1 | ISC |
| ignore | 5.3.2 | MIT |
| immer | 9.0.21 | MIT |
| is-alphabetical | 2.0.1 | MIT |
| is-alphanumerical | 2.0.1 | MIT |
| is-decimal | 2.0.1 | MIT |
| is-hexadecimal | 2.0.1 | MIT |
| is-hotkey | 0.1.8 | MIT |
| is-hotkey | 0.2.1 | MIT |
| is-plain-object | 5.1.0 | MIT |
| isomorphic.js | 0.2.5 | MIT |
| js-yaml | 4.3.2 | MIT |
| json-schema-traverse | 1.0.0 | MIT |
| jsonc-parser | 2.3.1 | MIT |
| kleur | 4.1.5 | MIT |
| lib0 | 0.2.120 | MIT |
| lodash | 4.18.1 | MIT |
| lodash.deburr | 4.1.0 | MIT |
| longest-streak | 3.1.0 | MIT |
| lru-cache | 10.4.3 | ISC |
| markdown-table | 3.1.0 | MIT |
| match-sorter | 8.3.1 | MIT |
| mdast-util-find-and-replace | 3.0.4 | MIT |
| mdast-util-from-markdown | 2.1.0 | MIT |
| mdast-util-gfm-autolink-literal | 2.1.0 | MIT |
| mdast-util-gfm-strikethrough | 2.0.1 | MIT |
| mdast-util-gfm-table | 2.0.1 | MIT |
| mdast-util-mdx | 3.0.0 | MIT |
| mdast-util-mdx-expression | 2.0.1 | MIT |
| mdast-util-mdx-jsx | 3.2.1 | MIT |
| mdast-util-mdxjs-esm | 2.0.1 | MIT |
| mdast-util-phrasing | 4.1.0 | MIT |
| mdast-util-to-markdown | 2.2.3 | MIT |
| mdast-util-to-string | 4.0.0 | MIT |
| micromark | 4.0.3 | MIT |
| micromark-core-commonmark | 2.0.4 | MIT |
| micromark-extension-gfm-autolink-literal | 2.1.0 | MIT |
| micromark-extension-gfm-strikethrough | 2.1.0 | MIT |
| micromark-extension-gfm-table | 2.1.2 | MIT |
| micromark-extension-mdx-expression | 3.0.1 | MIT |
| micromark-extension-mdx-jsx | 3.0.2 | MIT |
| micromark-extension-mdx-md | 2.0.0 | MIT |
| micromark-extension-mdxjs | 3.0.0 | MIT |
| micromark-extension-mdxjs-esm | 3.0.0 | MIT |
| micromark-factory-destination | 2.0.1 | MIT |
| micromark-factory-label | 2.0.1 | MIT |
| micromark-factory-mdx-expression | 2.0.3 | MIT |
| micromark-factory-space | 2.1.0 | MIT |
| micromark-factory-title | 2.0.1 | MIT |
| micromark-factory-whitespace | 2.0.1 | MIT |
| micromark-util-chunked | 2.0.1 | MIT |
| micromark-util-classify-character | 2.0.1 | MIT |
| micromark-util-combine-extensions | 2.0.1 | MIT |
| micromark-util-decode-numeric-character-reference | 2.0.2 | MIT |
| micromark-util-decode-string | 2.0.1 | MIT |
| micromark-util-edit-map | 1.0.0 | MIT |
| micromark-util-events-to-acorn | 2.0.3 | MIT |
| micromark-util-html-tag-name | 2.0.1 | MIT |
| micromark-util-normalize-identifier | 2.0.1 | MIT |
| micromark-util-resolve-all | 2.0.1 | MIT |
| micromark-util-subtokenize | 2.1.0 | MIT |
| minimatch | 11.0.9 | BlueOak-1.0.0 |
| muggle-string | 0.4.1 | MIT |
| nanoid | 5.1.16 | MIT |
| orderedmap | 2.1.1 | MIT |
| parse-entities | 4.0.2 | MIT |
| partysocket | 0.0.22 | ISC |
| path-browserify | 1.0.1 | MIT |
| playwright | 1.63.0 | Apache-2.0 |
| playwright-core | 1.63.0 | Apache-2.0 |
| prettier | 3.10.1 | MIT |
| prosemirror-commands | 1.7.2 | MIT |
| prosemirror-history | 1.5.1 | MIT |
| prosemirror-keymap | 1.2.3 | MIT |
| prosemirror-model | 1.25.13 | MIT |
| prosemirror-state | 1.4.4 | MIT |
| prosemirror-tables | 1.8.5 | MIT |
| prosemirror-transform | 1.12.6 | MIT |
| prosemirror-view | 1.42.9 | MIT |
| react-aria | 3.50.0 | Apache-2.0 |
| react-stately | 3.48.0 | Apache-2.0 |
| remove-accents | 0.5.0 | MIT |
| request-light | 0.5.8 | MIT |
| request-light | 0.7.0 | MIT |
| require-from-string | 2.0.2 | MIT |
| rope-sequence | 1.3.4 | MIT |
| scroll-into-view-if-needed | 2.2.31 | MIT |
| scroll-into-view-if-needed | 3.2.1 | MIT |
| slate | 0.91.4 | MIT |
| slate-history | 0.86.0 | MIT |
| slate-react | 0.91.11 | MIT |
| string-width | 7.2.0 | MIT |
| string-width | 7.2.0 | MIT |
| string-width | 8.3.0 | MIT |
| strip-ansi | 7.2.0 | MIT |
| stylis | 4.2.0 | MIT |
| superstruct | 1.0.4 | MIT |
| tabbable | 6.5.2 | MIT |
| tiny-invariant | 1.0.6 | MIT |
| tiny-warning | 1.0.3 | MIT |
| tinybench | 6.2.3 | MIT |
| typesafe-path | 0.2.2 | MIT |
| typescript | 6.0.3 | Apache-2.0 |
| typescript-auto-import-cache | 0.3.6 | MIT |
| unist-util-position-from-estree | 2.0.0 | MIT |
| urql | 4.2.2 | MIT |
| use-sync-external-store | 1.7.0 | MIT |
| vitest | 5.1.1 | MIT |
| volar-service-css | 0.0.71 | MIT |
| volar-service-emmet | 0.0.71 | MIT |
| volar-service-html | 0.0.71 | MIT |
| volar-service-prettier | 0.0.71 | MIT |
| volar-service-typescript | 0.0.71 | MIT |
| volar-service-typescript-twoslash-queries | 0.0.71 | MIT |
| volar-service-yaml | 0.0.71 | MIT |
| vscode-css-languageservice | 6.3.10 | MIT |
| vscode-html-languageservice | 5.6.2 | MIT |
| vscode-json-languageservice | 4.1.8 | MIT |
| vscode-jsonrpc | 10.0.0 | MIT |
| vscode-jsonrpc | 8.2.0 | MIT |
| vscode-languageserver | 9.0.1 | MIT |
| vscode-languageserver-protocol | 3.17.5 | MIT |
| vscode-languageserver-protocol | 3.18.5 | MIT |
| vscode-languageserver-textdocument | 1.0.16 | MIT |
| vscode-languageserver-types | 3.17.5 | MIT |
| vscode-languageserver-types | 3.17.5 | MIT |
| vscode-languageserver-types | 3.18.5 | MIT |
| vscode-nls | 5.2.0 | MIT |
| vscode-uri | 3.2.0 | MIT |
| w3c-keyname | 2.2.8 | MIT |
| why-is-node-running | 3.2.1 | MIT |
| wonka | 6.3.6 | MIT |
| wrap-ansi | 9.0.2 | MIT |
| y-prosemirror | 1.3.7 | MIT |
| y-protocols | 1.0.7 | MIT |
| y-provider | 0.10.0-canary.9 | keine Angabe ⚑ |
| y18n | 5.0.8 | ISC |
| yaml | 2.8.3 | ISC |
| yaml-language-server | 1.23.0 | MIT |
| yargs | 18.2.0 | MIT |
| yargs-parser | 22.0.0 | ISC |
| yjs | 13.6.33 | MIT |
