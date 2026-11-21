// Sims-like mode bar: Bauen · Elektro · Wände · Boden · Fliesen · Decke · Türen & Fenster · Einrichtung · Ansicht.
// Keys 1 to 9 switch modes (when no input field has the focus).
import type { ReactNode } from 'react';
import { planerStore } from '../store.ts';
import { type GestaltModus, MODI, gestaltStore, useGestalt } from './store.ts';

const SYMBOL: Record<GestaltModus, ReactNode> = {
  bauen: (
    <>
      <path d="M4 20V8h6v12M10 14h10v6" />
      <path d="M4 20h16" />
    </>
  ),
  elektro: <path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  waende: (
    <>
      <path d="M5 4h11v5H5zM16 6.5h3v6h-7v3" />
      <path d="M11 15.5h2V21h-2z" />
    </>
  ),
  boden: (
    <>
      <path d="M3 18l4-8h10l4 8z" />
      <path d="M8 10l-2 8M12 10v8M16 10l2 8M5 14h14" />
    </>
  ),
  fliesen: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1" />
      <path d="M4 12h16M12 4v16" />
    </>
  ),
  decke: (
    <>
      <path d="M3 5h18M12 5v5" />
      <path d="M8 14a4 4 0 008 0z" />
      <path d="M12 18v2" />
    </>
  ),
  oeffnungen: (
    <>
      <path d="M5 21V4h9v17M3 21h18" />
      <path d="M17 7h3v8h-3zM11 13h.01" />
    </>
  ),
  einrichtung: (
    <>
      <path d="M4 12V9a2 2 0 012-2h12a2 2 0 012 2v3" />
      <path d="M3 12h18v5H3zM5 17v2M19 17v2" />
    </>
  ),
  ansicht: (
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

export function wechsleModus(m: GestaltModus, webgl: boolean): void {
  const g = gestaltStore.getState();
  if (g.modus === m) return;
  const st = planerStore.getState();
  const flaechen = ['waende', 'boden', 'fliesen', 'decke', 'oeffnungen', 'einrichtung', 'ansicht'];
  g.setze({ modus: m, pipette: false, ziel: m === 'elektro' || m === 'einrichtung' || m === 'oeffnungen' ? null : g.ziel?.art === 'wandseite' || g.ziel?.art === 'boden' || g.ziel?.art === 'decke' ? g.ziel : null });
  if (m === 'bauen') {
    if (g.kamera === 'rundgang') g.setze({ kamera: 'orbit' });
    st.setze({ werkzeug: 'auswahl' });
  } else {
    // drawing tools are off in the design modes; surfaces are easiest to pick in 3D
    st.setze({ werkzeug: 'auswahl', kalibrierPunkte: [] });
    if (webgl && flaechen.includes(m) && st.ansicht !== '3d') st.setze({ ansicht: '3d', auswahl: st.auswahl?.art === 'raum' ? st.auswahl : null });
  }
  const name = MODI.find((x) => x.id === m)!.name;
  st.melde(`Modus: ${name}`);
}

export function Werkzeugleiste({ webgl }: { webgl: boolean }) {
  const modus = useGestalt((s) => s.modus);
  return (
    <div className="gestalt-modi" role="toolbar" aria-label="Gestaltungsmodi" data-gestalt-modi="">
      {MODI.map((m) => (
        <button
          key={m.id}
          type="button"
          className="gestalt-modus"
          aria-pressed={modus === m.id}
          aria-keyshortcuts={m.taste}
          title={`${m.name} (${m.taste})`}
          onClick={() => wechsleModus(m.id, webgl)}
          data-gestalt-modus={m.id}
        >
          <svg className="planer-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            {SYMBOL[m.id]}
          </svg>
          <span>{m.name}</span>
        </button>
      ))}
    </div>
  );
}
