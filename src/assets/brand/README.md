# Logo-Dateien (Entwurf, austauschbar)

Nachbau nach Briefing Abschnitt 1: Grundriss eines Raums mit Türöffnung, durch die eine Leitung hereinkommt
und in einem Punkt endet. Wortmarke „RAUM" fett (Archivo 800) + „STROM" leicht (Archivo 300), beide Breite 112 %,
als Pfade (keine Schriftabhängigkeit).

| Datei | Verwendung |
|---|---|
| `raumstrom-logo-quer.svg` | Standard auf Kalk (Header) |
| `raumstrom-logo-quer-negativ.svg` | auf Graphit (Footer, dunkle Flächen) |
| `raumstrom-logo-gestapelt.svg` | quadratische Formate, Social, Druck |
| `raumstrom-zeichen.svg` | Zeichen allein auf Hell (ab 16 px) |
| `raumstrom-zeichen-negativ.svg` | Zeichen allein auf Graphit, Favicon (`public/favicon.svg`) |

Austauschen: finale Datei unter demselben Namen ablegen. Regeln für Ersatzdateien:
- kein `style="…"`-Attribut (CSP), Farben als `fill`/`stroke`-Attribute; `<style>` im SVG ist erlaubt (Astro hasht es).
- `viewBox` setzen, keine festen `width`/`height`, keine eingebetteten Bilder oder Schriften, keine Skripte.
- Strom-Grün `#C5F01E` nicht als einzige Farbe auf hellem Grund (zu wenig Kontrast); auf Hell trägt Graphit/Kabelgrün die Form.

Erzeugt mit einem fontTools-Skript aus der Archivo-Variable-Font (Omnibus-Type, OFL), siehe `src/assets/fonts/README.md`.
