# Schriften (lokal, OFL-1.1)

Kein Font-CDN. Eingebunden über die Astro-Fonts-API (`fonts` in `astro.config.mjs`, `fontProviders.local()`),
`font-display: swap`, Preload: Archivo (Latin) und IBM Plex Mono Regular (Latin).
Lizenztexte liegen neben den Dateien und werden zusätzlich unter `/fonts/*-OFL.txt` ausgeliefert (`public/fonts/`).

| Datei | Quelle | Bearbeitung |
|---|---|---|
| `archivo/archivo-var-latin.woff2`, `archivo/archivo-var-latin-ext.woff2` | Omnibus-Type/Archivo, Commit `211127690e8ff106c36c935f7e5e697114cff103`, `fonts/variable/Archivo[wdth,wght].ttf` (Version 2.001) | Achsen begrenzt auf `wght` 300–900, `wdth` 100–125; Subset Latin bzw. Latin-Ext; WOFF2 (fontTools 4.60.1). Archivo hat keinen reservierten Schriftnamen, Subsetting ist nach OFL zulässig. |
| `ibm-plex-mono/IBMPlexMono-{Regular,Medium}-{Latin1,Latin2,Pi}.woff2` | npm `@ibm/plex-mono@2.5.0`, `fonts/split/woff2/` | unverändert (von IBM selbst gesplittet). „Plex" ist ein reservierter Schriftname, deshalb verändern wir diese Dateien nicht. |

Neu erzeugen (Archivo): `pip install fonttools brotli`, dann `fontTools.varLib.instancer` + `fontTools.subset` mit den
Unicode-Bereichen aus `astro.config.mjs` (`ARCHIVO_LATIN`, `ARCHIVO_LATIN_EXT`).
