# Texturen des Raumplaners: Herkunft und Lizenz

Der Raumplaner erzeugt Muster (Fliesenformate, Verlegemuster, Fugen, Parkett, Tapeten, Raufaser, Teppich, Terrazzo) prozedural im Browser. Nur vier Detailtexturen sind Bilddateien. Sie liegen selbst gehostet hier, werden erst geladen, wenn ein Material sie braucht (je Kategorie), und nur als Helligkeitsstruktur über die gewählte Farbe gelegt.

Alle vier stammen von Poly Haven und stehen unter **CC0 1.0** (gemeinfrei, keine Namensnennung nötig; wir nennen die Urheber trotzdem): https://polyhaven.com/license

| Datei | Quelle (Poly Haven) | Urheber | Reale Größe | Abgerufen |
| --- | --- | --- | --- | --- |
| `holz-eiche-512.ktx2`, `holz-eiche-256.ktx2`, `holz-eiche-vorschau.webp` | „Oak Veneer 01", https://polyhaven.com/a/oak_veneer_01 | Jenelle van Heerden | 1,83 m | 20.11.2026 |
| `marmor-512.ktx2`, `marmor-256.ktx2`, `marmor-vorschau.webp` | „Marble 01", https://polyhaven.com/a/marble_01 | Rob Tuytel | 1,50 m | 20.11.2026 |
| `beton-512.ktx2`, `beton-256.ktx2`, `beton-vorschau.webp` | „Smooth Concrete Floor", https://polyhaven.com/a/smooth_concrete_floor | Dimitrios Savva | 2,00 m | 20.11.2026 |
| `putz-512.ktx2`, `putz-256.ktx2`, `putz-vorschau.webp` | „White Plaster 02", https://polyhaven.com/a/white_plaster_02 | Rob Tuytel | 1,00 m | 20.11.2026 |

Ausgangsdateien: jeweils die Diffuse-Map in 1k als JPG über `https://api.polyhaven.com/files/<id>` (Download von `dl.polyhaven.org`, MD5 gegen die API geprüft).

## Umwandlung

- `*-512.ktx2` (Desktop) und `*-256.ktx2` (Mobilgeräte, reduzierte Auflösung): KTX2 mit Basis Universal ETC1S, Qualität 128, Mipmaps, sRGB-Transferfunktion. Encoder: npm-Paket `ktx2-encoder@0.6.0` (MIT, enthält den Basis-Universal-Encoder unter Apache-2.0). Er wurde nur einmalig außerhalb des Projekts ausgeführt und ist **keine** Projektabhängigkeit. Skalierung vorher mit `sharp` (bereits Projektabhängigkeit).
- `*-vorschau.webp`: 96 × 96 px WebP (Qualität 75) für die Kachel-Vorschau in der Werkzeugleiste (Bilder in `<img>`/Canvas können kein KTX2 anzeigen).

Befehl (Node 22, in einem leeren Ordner mit `npm i ktx2-encoder@0.6.0 sharp@0.35.5`):

```js
import sharp from 'sharp';
import { encodeToKTX2 } from 'ktx2-encoder';
const decoder = async (b) => {
  const { data, info } = await sharp(b).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), width: info.width, height: info.height };
};
for (const px of [512, 256]) {
  const png = await sharp('quelle_diff_1k.jpg').resize(px, px).png().toBuffer();
  const ktx2 = await encodeToKTX2(new Uint8Array(png), { isUASTC: false, generateMipmap: true, qualityLevel: 128, imageDecoder: decoder });
  // ktx2 -> name-<px>.ktx2
}
await sharp('quelle_diff_1k.jpg').resize(96, 96).webp({ quality: 75 }).toFile('name-vorschau.webp');
```

Mittlere lineare Helligkeit je Textur (für die Normierung im Shader, `src/islands/planner/szene/texturen.ts`): Holz 0,234, Marmor 0,350, Beton 0,054, Putz 0,247.

## Decoder

`/basis/basis_transcoder.js` und `/basis/basis_transcoder.wasm` sind unverändert aus `three@0.187.0` (`examples/jsm/libs/basis/`) kopiert, Basis Universal Transcoder, Apache-2.0 (Copyright Binomial LLC). Bei einem Update von three diese beiden Dateien mit aktualisieren, Version muss zum `KTX2Loader` passen.
