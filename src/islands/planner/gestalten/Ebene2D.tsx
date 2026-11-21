// Extra SVG layer of the 2D plan in the design modes (plan coordinates, inside the editor's transform):
// installation zones, furniture footprints, electrical symbols, the selected target and the keyboard cursor.
import { type ReactNode, useMemo } from 'react';
import { type Punkt, endpunkte, knotenMap, nettoPolygon, oeffnungsLage, wandFlaechenPunkt } from '../../../lib/geometry/index.ts';
import { alleZonen, elektroTypVon, istWaagerecht } from '../../../lib/electro/index.ts';
import { moebelUmriss, moebelVon } from '../../../lib/materials/index.ts';
import { usePlaner } from '../store.ts';
import { gueltigesZiel } from './aktionen.ts';
import { useGestalt } from './store.ts';

export function Ebene2D({ px, zeiger, tastatur }: { px: (n: number) => number; zeiger: Punkt | null; tastatur: boolean }) {
  const projekt = usePlaner((s) => s.projekt);
  const modus = useGestalt((s) => s.modus);
  const zielRoh = useGestalt((s) => s.ziel);
  const zonenAn = useGestalt((s) => s.zonen || s.modus === 'elektro');
  const zonen = useMemo(() => (zonenAn ? alleZonen(projekt) : []), [projekt, zonenAn]);
  const km = useMemo(() => knotenMap(projekt), [projekt]);
  const ziel = gueltigesZiel(projekt, zielRoh);

  let zielForm: ReactNode = null;
  if (ziel?.art === 'wandseite') {
    const w = projekt.waende.find((x) => x.id === ziel.wandId)!;
    const { a, b } = endpunkte(projekt, w, km);
    const l = Math.hypot(b.x - a.x, b.y - a.y);
    const p0 = wandFlaechenPunkt(projekt, w, ziel.seite, 0, km).punkt;
    const p1 = wandFlaechenPunkt(projekt, w, ziel.seite, l, km).punkt;
    zielForm = <line className="gestalt-ziel-linie" x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} strokeWidth={px(5)} data-gestalt-ziel-2d="wandseite" />;
  } else if (ziel?.art === 'boden' || ziel?.art === 'decke') {
    const r = projekt.raeume.find((x) => x.id === ziel.raumId)!;
    const poly = nettoPolygon(projekt, r.knoten, km);
    zielForm = <polygon className="gestalt-ziel-flaeche" points={poly.map((q) => `${q.x},${q.y}`).join(' ')} strokeWidth={px(3)} data-gestalt-ziel-2d={ziel.art} />;
  } else if (ziel?.art === 'oeffnung') {
    const o = projekt.oeffnungen.find((x) => x.id === ziel.id)!;
    const lage = oeffnungsLage(projekt, o, km);
    if (lage) zielForm = <line className="gestalt-ziel-linie" x1={lage.a.x} y1={lage.a.y} x2={lage.b.x} y2={lage.b.y} strokeWidth={px(9)} data-gestalt-ziel-2d="oeffnung" />;
  }

  return (
    <g className={`gestalt-ebene gestalt-ebene-${modus}`}>
      {zonen.map((z, i) => (
        <line key={i} className={istWaagerecht(z.art) ? 'zone-waagerecht' : 'zone-senkrecht'} x1={z.von.x} y1={z.von.y} x2={z.bis.x} y2={z.bis.y} strokeWidth={istWaagerecht(z.art) ? px(5) : px(9)} data-zone={z.art} />
      ))}
      {zielForm}
      {projekt.einrichtung.map((m) => {
        const def = moebelVon(m.typ);
        if (!def) return null;
        const u = moebelUmriss(def, m.x, m.y, m.drehungGrad);
        const vorne = { x: (u[2]!.x + u[3]!.x) / 2, y: (u[2]!.y + u[3]!.y) / 2 };
        const gewaehlt = ziel?.art === 'moebel' && ziel.id === m.id;
        return (
          <g key={m.id} className={`moebel-2d${gewaehlt ? ' ist-ausgewaehlt' : ''}`} data-moebel-2d={m.id}>
            <polygon points={u.map((q) => `${q.x},${q.y}`).join(' ')} strokeWidth={px(gewaehlt ? 2.5 : 1.2)} />
            <line x1={m.x} y1={m.y} x2={vorne.x} y2={vorne.y} strokeWidth={px(1)} />
          </g>
        );
      })}
      {projekt.elektro.map((e) => {
        const t = elektroTypVon(e.typ);
        const gewaehlt = ziel?.art === 'elektro' && ziel.id === e.id;
        const r = px(gewaehlt ? 11 : 9);
        return (
          <g key={e.id} className={`elektro-2d elektro-${t?.kategorie ?? 'sonstiges'}${gewaehlt ? ' ist-ausgewaehlt' : ''}`} data-elektro-2d={e.id}>
            {e.ort === 'decke' ? <rect x={e.x - r} y={e.y - r} width={2 * r} height={2 * r} rx={r * 0.3} /> : <circle cx={e.x} cy={e.y} r={r} />}
            <text x={e.x} y={e.y} fontSize={px(t && t.kurz.length > 2 ? 6.5 : 8)} textAnchor="middle" dominantBaseline="central">
              {t?.kurz ?? '?'}
            </text>
          </g>
        );
      })}
      {zeiger && tastatur && (
        <g className="gestalt-zeiger">
          <circle cx={zeiger.x} cy={zeiger.y} r={px(7)} />
          <line x1={zeiger.x - px(12)} y1={zeiger.y} x2={zeiger.x + px(12)} y2={zeiger.y} />
          <line x1={zeiger.x} y1={zeiger.y - px(12)} x2={zeiger.x} y2={zeiger.y + px(12)} />
        </g>
      )}
    </g>
  );
}
