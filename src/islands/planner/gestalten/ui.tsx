// Small UI building blocks of the design panels: tile preview (canvas), colour swatch, tile button.
// CSP: no style attributes in markup; colours are set through element.style from bundled JS.
import { type ReactNode, useEffect, useRef } from 'react';
import type { MaterialRef } from '../../../lib/geometry/index.ts';
import { formatVon, materialVon } from '../../../lib/materials/index.ts';
import { zeichneOberflaeche } from './zeichnen.ts';

const TEXTUR_DATEI = { holz: 'holz-eiche', marmor: 'marmor', beton: 'beton', putz: 'putz' } as const;
const bilder = new Map<string, HTMLImageElement>();

function texturBild(name: string, fertig: () => void): HTMLImageElement {
  let img = bilder.get(name);
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = `/textures/${name}-vorschau.webp`;
    bilder.set(name, img);
  }
  if (!img.complete) img.addEventListener('load', fertig, { once: true });
  return img;
}

/** Canvas preview of a material reference (same procedural drawing as in 3D, plus the detail texture). */
export function Vorschau({ wert, groesse = 56 }: { wert: MaterialRef; groesse?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const schluessel = JSON.stringify(wert);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(groesse * dpr);
    c.height = Math.round(groesse * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    const zeichne = () => {
      const m = materialVon(wert.material);
      const farbe = wert.farbe ?? m?.standard.farbe ?? '#eeeeee';
      const f = formatVon(wert.format);
      const spanne = f ? Math.min(2.4, Math.max(0.35, f.laenge * 2.2)) : 1;
      const pxProM = 128;
      const bild = zeichneOberflaeche(wert, pxProM, 512);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = farbe;
      ctx.fillRect(0, 0, c.width, c.height);
      if (bild) {
        const muster = ctx.createPattern(bild.canvas, 'repeat');
        if (muster) {
          const s = c.width / spanne / (bild.canvas.width / bild.breite);
          const w = (((bild.drehungGrad + (wert.richtungGrad ?? 0)) % 360) * Math.PI) / 180;
          muster.setTransform(new DOMMatrix().rotate((w * 180) / Math.PI).scale(s, s));
          ctx.fillStyle = muster;
          ctx.fillRect(0, 0, c.width, c.height);
        }
      }
      const t = m?.darstellung.textur;
      if (t) {
        const img = texturBild(TEXTUR_DATEI[t], zeichne);
        if (img.complete && img.naturalWidth) {
          ctx.globalCompositeOperation = 'overlay';
          ctx.globalAlpha = Math.min(0.9, (m.darstellung.texturStaerke ?? 0.5) * 1.1);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          ctx.globalAlpha = 1;
          ctx.globalCompositeOperation = 'source-over';
        }
      }
    };
    zeichne();
  }, [schluessel, groesse]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas ref={ref} className="gestalt-vorschau" aria-hidden="true" width={groesse} height={groesse} />;
}

/** Ref callback that sets the swatch colour through the CSSOM (allowed by the CSP). */
export const farbRef = (hex: string) => (el: HTMLElement | null) => {
  if (el) el.style.setProperty('--farbe', hex);
};

export function Farbfeld({ hex, name, gewaehlt, onWahl }: { hex: string; name: string; gewaehlt: boolean; onWahl: () => void }) {
  return (
    <button type="button" className="gestalt-farbe" ref={farbRef(hex)} aria-pressed={gewaehlt} title={name} onClick={onWahl}>
      <span className="visually-hidden">{name}</span>
    </button>
  );
}

export function Kachel({ name, gewaehlt, onWahl, children, data }: { name: string; gewaehlt: boolean; onWahl: () => void; children: ReactNode; data?: string }) {
  return (
    <button type="button" className="gestalt-kachel" aria-pressed={gewaehlt} onClick={onWahl} data-kachel={data}>
      {children}
      <span className="gestalt-kachel-name">{name}</span>
    </button>
  );
}
