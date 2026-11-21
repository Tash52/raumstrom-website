# Texturen des Raumplaners: Herkunft und Lizenz

Der Raumplaner erzeugt Muster (Fliesenformate, Verlegemuster, Fugen, Parkett, Tapeten, Raufaser, Teppich, Terrazzo) prozedural im Browser. Nur vier Detailtexturen sind Bilddateien. Sie liegen selbst gehostet hier, werden erst geladen, wenn ein Material sie braucht (je Kategorie), und nur als Helligkeitsstruktur über die gewählte Farbe gelegt.

Alle vier stammen von Poly Haven und stehen unter **CC0 1.0** (gemeinfrei, keine Namensnennung nötig; wir nennen die Urheber trotzdem): https://polyhaven.com/license

| Datei | Quelle (Poly Haven) | Urheber | Reale Größe | Abgerufen |
| --- | --- | --- | --- | --- |
| `holz-eiche-512.webp`, `holz-eiche-256.webp`, `holz-eiche-vorschau.webp` | „Oak Veneer 01", https://polyhaven.com/a/oak_veneer_01 | Jenelle van Heerden | 1,83 m | 20.11.2026 |
| `marmor-512.webp`, `marmor-256.webp`, `marmor-vorschau.webp` | „Marble 01", https://polyhaven.com/a/marble_01 | Rob Tuytel | 1,50 m | 20.11.2026 |
| `beton-512.webp`, `beton-256.webp`, `beton-vorschau.webp` | „Smooth Concrete Floor", https://polyhaven.com/a/smooth_concrete_floor | Dimitrios Savva | 2,00 m | 20.11.2026 |
| `putz-512.webp`, `putz-256.webp`, `putz-vorschau.webp` | „White Plaster 02", https://polyhaven.com/a/white_plaster_02 | Rob Tuytel | 1,00 m | 20.11.2026 |

Ausgangsdateien: jeweils die Diffuse-Map in 1k als JPG über `https://api.polyhaven.com/files/<id>` (Download von `dl.polyhaven.org`, MD5 gegen die API geprüft).

## Umwandlung

- `*-512.webp` (Desktop) und `*-256.webp` (Mobilgeräte, reduzierte Auflösung): WebP Qualität 78, Mipmaps erzeugt die Grafikkarte beim Hochladen.
- `*-vorschau.webp`: 96 × 96 px WebP (Qualität 75) für die Kachel-Vorschau.
- Werkzeug: `sharp` (bereits Projektabhängigkeit), einmalig ausgeführt:

```js
import sharp from 'sharp';
for (const px of [512, 256]) await sharp('quelle_diff_1k.jpg').resize(px, px).webp({ quality: 78, effort: 6 }).toFile(`name-${px}.webp`);
await sharp('quelle_diff_1k.jpg').resize(96, 96).webp({ quality: 75 }).toFile('name-vorschau.webp');
```

Mittlere lineare Helligkeit je Textur (für die Normierung im Shader, `src/islands/planner/szene/texturen.ts`): Holz 0,234, Marmor 0,350, Beton 0,054, Putz 0,247.

## Warum WebP statt KTX2/Basis

KTX2 (Basis Universal ETC1S) wurde erzeugt und geprüft (Encoder `ktx2-encoder@0.6.0`, MIT, nur einmalig außerhalb des Projekts). Der passende Transcoder aus three (`basis_transcoder.js`, Emscripten mit embind) wertet in seinem Worker jedoch Zeichenketten als Code aus. Das blockiert die strenge CSP der Website (kein `'unsafe-eval'`, nur `'wasm-unsafe-eval'` auf `/raumplaner/`). Ein Transcoder ohne diese Auswertung wäre ein eigener Build (Zusatzaufwand). Daher die freigegebene Rückfallebene WebP. Nebeneffekt: Die vier WebP-Dateien (512 px) sind zusammen etwa 81 KB groß, Transcoder (rund 245 KB komprimiert) und Loader entfallen. Die Grafikkarte hält die vier Texturen unkomprimiert (je etwa 1,4 MB mit Mipmaps), das ist bei vier Texturen unkritisch.
