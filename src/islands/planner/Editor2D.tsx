// 2D wall editor (mode A). Canvas layer: grid + floor plan image; SVG layer: rooms, walls, openings,
// dimensions, snapping feedback. Input: Pointer Events (mouse, pen, touch incl. pinch) and keyboard.
// No style attributes in markup (CSP): colours come from classes, geometry from SVG attributes.
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  type FangErgebnis,
  type Projekt,
  type Punkt,
  TOLERANZ,
  abstand,
  beschriftungsPunkt,
  entferneOeffnung,
  entferneWand,
  fangePunkt,
  findeWand,
  formatFlaeche,
  formatLaenge,
  fuegeWandHinzu,
  grenzen,
  knotenBei,
  minus,
  normale,
  normiert,
  oeffnungsLage,
  parseLaenge,
  platziereOeffnung,
  plus,
  mal,
  punktImPolygon,
  punktMitLaenge,
  raumPolygon,
  teileWand,
  verbindeKnoten,
  verschiebeKnoten,
  verschiebeOeffnung,
  wandKoerper,
  waendeAnKnoten,
  projiziere,
} from '../../lib/geometry/index.ts';
import { type Werkzeug, knotenVon, planerStore, usePlaner } from './store.ts';

interface Ansicht {
  tx: number;
  ty: number;
  zoom: number; // screen pixels per metre
}

type Geste =
  | { art: 'pan'; id: number; start: Punkt; t0: Punkt; bewegt: boolean; tippen: boolean }
  | { art: 'pinch'; d0: number; m0: Punkt; v0: Ansicht }
  | { art: 'knoten'; id: number; knotenId: string; snapshot: Projekt; bewegt: boolean }
  | { art: 'oeffnung'; id: number; oeffnungId: string; snapshot: Projekt; bewegt: boolean }
  | { art: 'zeichnen'; id: number };

const FANG_PX = 14;
const MIN_ZOOM = 4;
const MAX_ZOOM = 600;
const TASTEN_SCHRITT = { normal: 0.1, gross: 1, fein: 0.01 };

const zuWelt = (v: Ansicht, s: Punkt): Punkt => ({ x: (s.x - v.tx) / v.zoom, y: (s.y - v.ty) / v.zoom });
const zuSchirm = (v: Ansicht, w: Punkt): Punkt => ({ x: w.x * v.zoom + v.tx, y: w.y * v.zoom + v.ty });

function textWinkel(r: Punkt): number {
  let g = (Math.atan2(r.y, r.x) * 180) / Math.PI;
  if (g > 90) g -= 180;
  if (g <= -90) g += 180;
  return g;
}

const f3 = (n: number) => Number(n.toFixed(4));

export function Editor2D() {
  const projekt = usePlaner((s) => s.projekt);
  const werkzeug = usePlaner((s) => s.werkzeug);
  const auswahl = usePlaner((s) => s.auswahl);
  const winkelFang = usePlaner((s) => s.winkelFang);
  const rasterFang = usePlaner((s) => s.rasterFang);
  const wandDicke = usePlaner((s) => s.wandDicke);
  const hintergrund = usePlaner((s) => s.hintergrund);
  const hintergrundSichtbar = usePlaner((s) => s.hintergrundSichtbar);
  const kalibrierPunkte = usePlaner((s) => s.kalibrierPunkte);
  const einpassen = usePlaner((s) => s.einpassen);

  const huelle = useRef<HTMLDivElement>(null);
  const leinwand = useRef<HTMLCanvasElement>(null);
  const [groesse, setGroesse] = useState({ b: 800, h: 560 });
  const [ansicht, setAnsicht] = useState<Ansicht>({ tx: 40, ty: 40, zoom: 60 });
  const ansichtRef = useRef(ansicht);
  ansichtRef.current = ansicht;
  // Drawing state lives in refs (read by event handlers, always current even if several keys arrive
  // before React re-renders) and is mirrored into state for rendering.
  const [zeiger, setZeigerState] = useState<Punkt | null>(null); // raw world position (pointer or keyboard)
  const [start, setStartState] = useState<Punkt | null>(null); // start of the wall being drawn
  const [eingabe, setEingabeState] = useState(''); // typed length
  const zeigerRef = useRef<Punkt | null>(null);
  const startRef = useRef<Punkt | null>(null);
  const eingabeRef = useRef('');
  const setZeiger = useCallback((p: Punkt | null) => {
    zeigerRef.current = p;
    setZeigerState(p);
  }, []);
  const setStart = useCallback((p: Punkt | null) => {
    startRef.current = p;
    setStartState(p);
  }, []);
  const setEingabe = useCallback((t: string) => {
    eingabeRef.current = t;
    setEingabeState(t);
  }, []);
  // Keyboard owns the cursor until the mouse really travels: a resting mouse gets boundary events and
  // moves without travel when the page scrolls under it (Phase 4, QA B1); those must not clear it.
  const tastaturZeiger = useRef(false);
  const letzteMaus = useRef<{ x: number; y: number } | null>(null);
  const zeigerMap = useRef(new Map<number, Punkt>());
  const geste = useRef<Geste | null>(null);
  const leertaste = useRef(false);

  const km = knotenVon(projekt);
  const koerper = useMemo(() => wandKoerper(projekt), [projekt]);
  const radius = FANG_PX / ansicht.zoom;

  // ---------- size and fit ----------
  useEffect(() => {
    const el = huelle.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (!e) return;
      setGroesse({ b: Math.max(200, Math.round(e.contentRect.width)), h: Math.max(200, Math.round(e.contentRect.height)) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const passeEin = useCallback(() => {
    const p = planerStore.getState().projekt;
    const pkt: Punkt[] = [...p.knoten];
    const g = p.grundriss;
    if (g) pkt.push(g.ursprung, plus(g.ursprung, { x: g.breitePx * g.meterProPixel, y: g.hoehePx * g.meterProPixel }));
    if (pkt.length < 2) pkt.push({ x: 0, y: 0 }, { x: 10, y: 8 });
    const { min, max } = grenzen(pkt);
    const el = huelle.current;
    const b = el?.clientWidth || groesse.b;
    const h = el?.clientHeight || groesse.h;
    const rand = Math.min(64, Math.min(b, h) * 0.12);
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min((b - 2 * rand) / Math.max(0.5, max.x - min.x), (h - 2 * rand) / Math.max(0.5, max.y - min.y))));
    setAnsicht({
      zoom,
      tx: (b - (max.x - min.x) * zoom) / 2 - min.x * zoom,
      ty: (h - (max.y - min.y) * zoom) / 2 - min.y * zoom,
    });
  }, [groesse.b, groesse.h]);

  const ersteGroesse = useRef(true);
  useEffect(() => {
    passeEin();
    // also refit once the real size is known
  }, [einpassen]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (ersteGroesse.current && groesse.b !== 800) {
      ersteGroesse.current = false;
      passeEin();
    }
  }, [groesse, passeEin]);

  // drawing state resets when the tool changes
  useEffect(() => {
    setStart(null);
    setEingabe('');
  }, [werkzeug, setStart, setEingabe]);

  // ---------- canvas: grid and floor plan ----------
  useEffect(() => {
    const c = leinwand.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(groesse.b * dpr);
    c.height = Math.round(groesse.h * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, groesse.b, groesse.h);
    const g = projekt.grundriss;
    if (g && hintergrund && hintergrundSichtbar) {
      ctx.save();
      ctx.globalAlpha = g.deckkraft;
      ctx.imageSmoothingQuality = 'high';
      const o = zuSchirm(ansicht, g.ursprung);
      ctx.drawImage(hintergrund.canvas, o.x, o.y, g.breitePx * g.meterProPixel * ansicht.zoom, g.hoehePx * g.meterProPixel * ansicht.zoom);
      ctx.restore();
    }
    // grid: 10 cm / 50 cm / 1 m depending on zoom, every 1 m (or 5 m) stronger
    const fein = [0.1, 0.5, 1, 5].find((s) => s * ansicht.zoom >= 14) ?? 5;
    const stark = fein < 1 ? 1 : 5;
    const w0 = zuWelt(ansicht, { x: 0, y: 0 });
    const w1 = zuWelt(ansicht, { x: groesse.b, y: groesse.h });
    const linien = (schritt: number, farbe: string) => {
      ctx.beginPath();
      for (let x = Math.floor(w0.x / schritt) * schritt; x <= w1.x; x += schritt) {
        const sx = Math.round(x * ansicht.zoom + ansicht.tx) + 0.5;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, groesse.h);
      }
      for (let y = Math.floor(w0.y / schritt) * schritt; y <= w1.y; y += schritt) {
        const sy = Math.round(y * ansicht.zoom + ansicht.ty) + 0.5;
        ctx.moveTo(0, sy);
        ctx.lineTo(groesse.b, sy);
      }
      ctx.strokeStyle = farbe;
      ctx.lineWidth = 1;
      ctx.stroke();
    };
    linien(fein, 'rgba(21,25,30,0.06)');
    linien(stark, 'rgba(21,25,30,0.13)');
  }, [ansicht, groesse, projekt.grundriss, hintergrund, hintergrundSichtbar]);

  // ---------- snapping ----------
  const fang = useCallback(
    (roh: Punkt, von: Punkt | null, ohne?: { knoten?: Set<string>; waende?: Set<string> }): FangErgebnis => {
      const p = planerStore.getState().projekt;
      const k = knotenVon(p);
      return fangePunkt(roh, {
        start: von,
        knoten: p.knoten,
        segmente: p.waende.map((w) => ({ id: w.id, a: k.get(w.von)!, b: k.get(w.bis)! })),
        radius: FANG_PX / ansichtRef.current.zoom,
        winkelFang: planerStore.getState().winkelFang,
        raster: planerStore.getState().rasterFang ? 0.05 : null,
        ohneKnoten: ohne?.knoten,
        ohneWaende: ohne?.waende,
      });
    },
    [],
  );

  const vorschau: FangErgebnis | null = useMemo(() => {
    if (!zeiger) return null;
    if (werkzeug === 'wand') return fang(zeiger, start);
    if (werkzeug === 'massstab') return { punkt: zeiger, art: 'frei' };
    return null;
  }, [zeiger, start, werkzeug, fang, projekt, winkelFang, rasterFang]); // eslint-disable-line react-hooks/exhaustive-deps

  const oeffnungsVorschau = useMemo(() => {
    if (!zeiger || (werkzeug !== 'tuer' && werkzeug !== 'fenster')) return null;
    const r = platziereOeffnung(projekt, werkzeug, zeiger, Math.max(radius, 0.3));
    if (!r.ok) return null;
    const o = r.projekt.oeffnungen.at(-1)!;
    return oeffnungsLage(r.projekt, o);
  }, [zeiger, werkzeug, projekt, radius]);

  // ---------- actions ----------
  const s = planerStore.getState;

  const setzeWandPunkt = useCallback(
    (ziel: FangErgebnis) => {
      const st = s();
      const start = startRef.current;
      if (!start) {
        setStart(ziel.punkt);
        st.melde(`Startpunkt gesetzt. Nächsten Punkt wählen oder Länge eingeben.`);
        return;
      }
      if (abstand(start, ziel.punkt) < 0.05) return;
      const l = abstand(start, ziel.punkt);
      st.aendere((p) => fuegeWandHinzu(p, start, ziel.punkt, { dicke: st.wandDicke, art: st.wandArt }).projekt, `Wand ${formatLaenge(l)} gesetzt.`);
      setEingabe('');
      // docking onto an existing node or wall ends the chain (room closed or junction made)
      if (ziel.art === 'knoten' || ziel.art === 'wand') {
        setStart(null);
        const n = s().projekt.raeume.length;
        st.melde(`Wand ${formatLaenge(l)} gesetzt. Linienzug beendet${n ? `, ${n} ${n === 1 ? 'Raum' : 'Räume'} erkannt` : ''}.`);
      } else setStart(ziel.punkt);
    },
    [s, setStart, setEingabe],
  );

  const beendeKette = useCallback(() => {
    if (startRef.current) s().melde('Linienzug beendet.');
    setStart(null);
    setEingabe('');
  }, [s, setStart, setEingabe]);

  const trefferBei = useCallback(
    (w: Punkt): { art: 'knoten' | 'oeffnung' | 'wand' | 'raum'; id: string } | null => {
      const p = s().projekt;
      const k = knotenVon(p);
      const r = FANG_PX / ansichtRef.current.zoom;
      const kn = knotenBei(p, w, r * 0.8);
      if (kn) return { art: 'knoten', id: kn.id };
      for (const o of p.oeffnungen) {
        const lage = oeffnungsLage(p, o, k);
        const wand = findeWand(p, o.wandId);
        if (lage && wand && projiziere(w, lage.a, lage.b).abstand <= wand.dicke / 2 + r * 0.5) return { art: 'oeffnung', id: o.id };
      }
      let best: { id: string; d: number } | null = null;
      for (const wd of p.waende) {
        const pr = projiziere(w, k.get(wd.von)!, k.get(wd.bis)!);
        if (pr.abstand <= wd.dicke / 2 + r * 0.5 && (!best || pr.abstand < best.d)) best = { id: wd.id, d: pr.abstand };
      }
      if (best) return { art: 'wand', id: best.id };
      const raum = [...p.raeume].sort((a, b) => a.flaeche - b.flaeche).find((x) => punktImPolygon(w, raumPolygon(p, x.knoten, k)));
      return raum ? { art: 'raum', id: raum.id } : null;
    },
    [s],
  );

  const tippe = useCallback(
    (w: Punkt) => {
      const st = s();
      switch (st.werkzeug) {
        case 'wand':
          setzeWandPunkt(fang(w, startRef.current));
          break;
        case 'tuer':
        case 'fenster': {
          const r = platziereOeffnung(st.projekt, st.werkzeug, w, Math.max(FANG_PX / ansichtRef.current.zoom, 0.3));
          if (!r.ok) {
            st.melde(r.fehler, 'fehler');
            break;
          }
          st.aendere(() => r.projekt, st.werkzeug === 'tuer' ? 'Tür eingesetzt.' : 'Fenster eingesetzt.');
          st.setze({ auswahl: { art: 'oeffnung', id: r.id } });
          break;
        }
        case 'massstab': {
          const pk = st.kalibrierPunkte.length >= 2 ? [w] : [...st.kalibrierPunkte, w];
          st.setze({ kalibrierPunkte: pk });
          st.melde(pk.length === 1 ? 'Erster Punkt gesetzt. Jetzt den zweiten Punkt der bekannten Strecke wählen.' : 'Zweiter Punkt gesetzt. Geben Sie die tatsächliche Länge ein.');
          if (pk.length === 2) requestAnimationFrame(() => document.getElementById('planer-kalibrier-laenge')?.focus());
          break;
        }
        case 'auswahl': {
          const t = trefferBei(w);
          st.setze({ auswahl: t });
          break;
        }
      }
    },
    [s, fang, setzeWandPunkt, trefferBei],
  );

  const loescheAuswahl = useCallback(() => {
    const st = s();
    const a = st.auswahl;
    if (!a) return;
    if (a.art === 'wand') st.aendere((p) => entferneWand(p, a.id), 'Wand gelöscht.');
    else if (a.art === 'oeffnung') st.aendere((p) => entferneOeffnung(p, a.id), 'Öffnung gelöscht.');
    else if (a.art === 'knoten') {
      const ws = waendeAnKnoten(st.projekt, a.id);
      st.aendere((p) => ws.reduce((q, w) => entferneWand(q, w.id), p), 'Eckpunkt mit seinen Wänden gelöscht.');
    } else return;
    st.setze({ auswahl: null });
  }, [s]);

  // ---------- zoom ----------
  const zoomeUm = useCallback((faktor: number, um: Punkt) => {
    setAnsicht((v) => {
      const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * faktor));
      const w = zuWelt(v, um);
      return { zoom, tx: um.x - w.x * zoom, ty: um.y - w.y * zoom };
    });
  }, []);

  useEffect(() => {
    const el = huelle.current;
    if (!el) return;
    const rad = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomeUm(Math.exp(-d * 0.0015), { x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener('wheel', rad, { passive: false });
    return () => el.removeEventListener('wheel', rad);
  }, [zoomeUm]);

  // ---------- pointer ----------
  const lokal = (e: { clientX: number; clientY: number }): Punkt => {
    const r = huelle.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('button')) return; // zoom buttons keep their own click
    const el = huelle.current!;
    el.focus({ preventScroll: true });
    el.setPointerCapture(e.pointerId);
    const sp = lokal(e);
    zeigerMap.current.set(e.pointerId, sp);
    const v = ansichtRef.current;
    const w = zuWelt(v, sp);
    tastaturZeiger.current = false;
    if (e.pointerType === 'mouse') letzteMaus.current = { x: e.clientX, y: e.clientY };
    setZeiger(w);

    if (zeigerMap.current.size === 2) {
      // second finger: pinch zoom / pan, cancels what the first finger started
      const [a, b] = [...zeigerMap.current.values()] as [Punkt, Punkt];
      const g = geste.current;
      if (g && (g.art === 'knoten' || g.art === 'oeffnung') && g.bewegt) s().ersetze(g.snapshot);
      geste.current = { art: 'pinch', d0: abstand(a, b), m0: mal(plus(a, b), 0.5), v0: v };
      return;
    }
    if (zeigerMap.current.size > 2) return;

    const pan = e.button === 1 || leertaste.current || e.button === 2;
    const wz: Werkzeug = s().werkzeug;
    if (pan) {
      geste.current = { art: 'pan', id: e.pointerId, start: sp, t0: { x: v.tx, y: v.ty }, bewegt: false, tippen: false };
      return;
    }
    if (wz === 'auswahl') {
      const t = trefferBei(w);
      if (t?.art === 'knoten') {
        s().setze({ auswahl: t });
        geste.current = { art: 'knoten', id: e.pointerId, knotenId: t.id, snapshot: s().projekt, bewegt: false };
        return;
      }
      if (t?.art === 'oeffnung') {
        s().setze({ auswahl: t });
        geste.current = { art: 'oeffnung', id: e.pointerId, oeffnungId: t.id, snapshot: s().projekt, bewegt: false };
        return;
      }
      geste.current = { art: 'pan', id: e.pointerId, start: sp, t0: { x: v.tx, y: v.ty }, bewegt: false, tippen: true };
      return;
    }
    geste.current = { art: 'zeichnen', id: e.pointerId };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const sp = lokal(e);
    if (zeigerMap.current.has(e.pointerId)) zeigerMap.current.set(e.pointerId, sp);
    const g = geste.current;
    const v = ansichtRef.current;
    if (g?.art === 'pinch') {
      const pts = [...zeigerMap.current.values()];
      if (pts.length < 2) return;
      const [a, b] = pts as [Punkt, Punkt];
      const m = mal(plus(a, b), 0.5);
      const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, (g.v0.zoom * abstand(a, b)) / Math.max(1, g.d0)));
      const w = zuWelt(g.v0, g.m0);
      setAnsicht({ zoom, tx: m.x - w.x * zoom, ty: m.y - w.y * zoom });
      return;
    }
    const w = zuWelt(v, sp);
    if (e.pointerType === 'mouse' && !g) {
      // ignore moves without travel (content scrolled under a resting mouse)
      const m = letzteMaus.current;
      if (m && Math.abs(m.x - e.clientX) < 1 && Math.abs(m.y - e.clientY) < 1) return;
      letzteMaus.current = { x: e.clientX, y: e.clientY };
      tastaturZeiger.current = false;
    }
    if (e.pointerType !== 'touch' || g) setZeiger(w);
    if (!g || g.id !== e.pointerId) return;
    if (g.art === 'pan') {
      if (!g.bewegt && abstand(sp, g.start) < 5) return;
      g.bewegt = true;
      setAnsicht({ zoom: v.zoom, tx: g.t0.x + sp.x - g.start.x, ty: g.t0.y + sp.y - g.start.y });
    } else if (g.art === 'knoten') {
      g.bewegt = true;
      const angeschlossen = new Set(waendeAnKnoten(g.snapshot, g.knotenId).map((x) => x.id));
      const f = fang(w, null, { knoten: new Set([g.knotenId]), waende: angeschlossen });
      s().ersetze(verschiebeKnoten(g.snapshot, g.knotenId, f.punkt, 0));
    } else if (g.art === 'oeffnung') {
      g.bewegt = true;
      s().ersetze(verschiebeOeffnung(g.snapshot, g.oeffnungId, w, FANG_PX / v.zoom));
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const sp = lokal(e);
    zeigerMap.current.delete(e.pointerId);
    const g = geste.current;
    if (!g) return;
    if (g.art === 'pinch') {
      if (zeigerMap.current.size === 0) geste.current = null;
      return;
    }
    if (g.id !== e.pointerId) return;
    geste.current = null;
    const w = zuWelt(ansichtRef.current, sp);
    if (e.type === 'pointercancel') {
      if ((g.art === 'knoten' || g.art === 'oeffnung') && g.bewegt) s().ersetze(g.snapshot);
      return;
    }
    if (g.art === 'pan') {
      if (g.tippen && !g.bewegt) tippe(w);
      return;
    }
    if (g.art === 'zeichnen') {
      tippe(w);
      if (e.pointerType === 'touch') setZeiger(null);
      return;
    }
    if (g.art === 'knoten') {
      if (!g.bewegt) return;
      const angeschlossen = new Set(waendeAnKnoten(g.snapshot, g.knotenId).map((x) => x.id));
      const f = fang(w, null, { knoten: new Set([g.knotenId]), waende: angeschlossen });
      let q = verschiebeKnoten(g.snapshot, g.knotenId, f.punkt, f.art === 'knoten' ? TOLERANZ : 0);
      if (f.art === 'wand' && f.wandId && q.waende.some((x) => x.id === f.wandId)) {
        const t = teileWand(q, f.wandId, f.punkt);
        q = verbindeKnoten(t.projekt, g.knotenId, t.knotenId);
      }
      s().merke(g.snapshot);
      s().ersetze(q);
      s().melde(f.art === 'knoten' ? 'Eckpunkte verbunden.' : 'Eckpunkt verschoben.');
      return;
    }
    if (g.art === 'oeffnung' && g.bewegt) {
      s().merke(g.snapshot);
      s().melde('Öffnung verschoben.');
    }
  };

  // ---------- keyboard ----------
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const st = s();
    const v = ansichtRef.current;
    const zeiger = zeigerRef.current;
    const start = startRef.current;
    const eingabe = eingabeRef.current;
    const mitte = zuWelt(v, { x: groesse.b / 2, y: groesse.h / 2 });
    const aktuell = zeiger ?? (start ? start : mitte);
    const schritt = e.shiftKey ? TASTEN_SCHRITT.gross : e.altKey ? TASTEN_SCHRITT.fein : TASTEN_SCHRITT.normal;
    const pfeil: Record<string, Punkt> = { ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 }, ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 } };
    const strg = e.ctrlKey || e.metaKey;

    if (strg && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (e.shiftKey) st.wiederholen();
      else st.rueckgaengig();
      return;
    }
    if (strg && e.key.toLowerCase() === 'y') {
      e.preventDefault();
      st.wiederholen();
      return;
    }
    if (e.key === ' ') leertaste.current = true;

    const d = pfeil[e.key];
    if (d) {
      e.preventDefault();
      const a = st.auswahl;
      if (st.werkzeug === 'auswahl' && a?.art === 'knoten') {
        const k = knotenVon(st.projekt).get(a.id);
        if (k) st.aendere((p) => verschiebeKnoten(p, a.id, plus(k, mal(d, schritt)), 0), `Eckpunkt verschoben.`);
        return;
      }
      if (st.werkzeug === 'auswahl' && a?.art === 'oeffnung') {
        const o = st.projekt.oeffnungen.find((x) => x.id === a.id);
        const lage = o && oeffnungsLage(st.projekt, o);
        if (lage) st.aendere((p) => verschiebeOeffnung(p, a.id, plus(lage.mitte, mal(d, schritt)), 0.01), 'Öffnung verschoben.');
        return;
      }
      if (st.werkzeug === 'auswahl') {
        setAnsicht({ ...v, tx: v.tx - d.x * 40, ty: v.ty - d.y * 40 });
        return;
      }
      // move the drawing cursor; with a start point the cursor jumps along snapped directions
      const neu = { x: f3(aktuell.x + d.x * schritt), y: f3(aktuell.y + d.y * schritt) };
      tastaturZeiger.current = true;
      setZeiger(neu);
      const sp = zuSchirm(v, neu);
      if (sp.x < 20 || sp.y < 20 || sp.x > groesse.b - 20 || sp.y > groesse.h - 20) {
        setAnsicht({ ...v, tx: v.tx + groesse.b / 2 - sp.x, ty: v.ty + groesse.h / 2 - sp.y });
      }
      return;
    }

    if (st.werkzeug === 'wand' && start && /^[0-9.,]$/.test(e.key)) {
      e.preventDefault();
      setEingabe((eingabe + e.key).slice(0, 8));
      return;
    }
    if (e.key === 'Backspace' && eingabe) {
      e.preventDefault();
      setEingabe(eingabe.slice(0, -1));
      return;
    }

    if (e.key === 'Enter' || (e.key === ' ' && !e.repeat && st.werkzeug !== 'auswahl')) {
      e.preventDefault();
      if (st.werkzeug === 'wand' && start && eingabe) {
        const l = parseLaenge(eingabe, 'cm');
        if (!l) {
          st.melde('Bitte eine Länge in Zentimetern eingeben, z. B. 345.', 'fehler');
          return;
        }
        const richtung = zeiger && abstand(zeiger, start) > 1e-6 ? zeiger : plus(start, { x: 1, y: 0 });
        const ende = punktMitLaenge(start, richtung, l, st.winkelFang);
        setzeWandPunkt({ punkt: ende, art: 'winkel' });
        tastaturZeiger.current = true;
        setZeiger(ende);
        return;
      }
      tippe(aktuell);
      // keyboard cursor continues from the (snapped) point just set, so a typed length starts there
      tastaturZeiger.current = true;
      setZeiger(st.werkzeug === 'wand' && startRef.current ? startRef.current : aktuell);
      return;
    }
    if (e.key === 'Escape') {
      if (start || eingabe) beendeKette();
      else if (st.kalibrierPunkte.length) st.setze({ kalibrierPunkte: [] });
      else st.setze({ auswahl: null });
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      loescheAuswahl();
      return;
    }
    if (e.key === '+' || e.key === '=') return zoomeUm(1.25, { x: groesse.b / 2, y: groesse.h / 2 });
    if (e.key === '-') return zoomeUm(0.8, { x: groesse.b / 2, y: groesse.h / 2 });
    if (e.key === '0') return passeEin();
    if (strg || e.altKey) return;
    const kurz: Record<string, Werkzeug> = { a: 'auswahl', v: 'auswahl', w: 'wand', t: 'tuer', f: 'fenster', m: 'massstab' };
    const wz = kurz[e.key.toLowerCase()];
    if (wz && (wz !== 'massstab' || st.projekt.grundriss)) {
      st.setze({ werkzeug: wz });
      st.melde(`Werkzeug: ${WERKZEUG_NAME[wz]}`);
    }
  };
  const onKeyUp = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === ' ') leertaste.current = false;
  };

  // ---------- render helpers ----------
  const px = (n: number) => n / ansicht.zoom;
  const ausgewaehlt = (art: string, id: string) => auswahl?.art === art && auswahl.id === id;
  const kp = vorschau?.punkt;
  const zeigeKnoten = werkzeug === 'auswahl' || werkzeug === 'wand';

  return (
    <div
      ref={huelle}
      className={`planer-editor werkzeug-${werkzeug}`}
      tabIndex={0}
      role="application"
      aria-roledescription="Zeichenfläche"
      aria-label="Grundriss-Editor"
      aria-describedby="planer-editor-hilfe"
      data-planer-editor=""
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={(e) => {
        if (e.pointerType === 'mouse' && !geste.current && !tastaturZeiger.current) setZeiger(null);
      }}
      onDoubleClick={() => werkzeug === 'wand' && beendeKette()}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
    >
      <canvas ref={leinwand} className="planer-leinwand" aria-hidden="true" />
      <svg className="planer-svg" width={groesse.b} height={groesse.h} aria-hidden="true">
        <g transform={`translate(${ansicht.tx} ${ansicht.ty}) scale(${ansicht.zoom})`}>
          {/* rooms */}
          {projekt.raeume.map((r) => {
            const poly = raumPolygon(projekt, r.knoten, km);
            return (
              <polygon
                key={r.id}
                className={`raum${ausgewaehlt('raum', r.id) ? ' ist-ausgewaehlt' : ''}`}
                points={poly.map((q) => `${q.x},${q.y}`).join(' ')}
              />
            );
          })}
          {/* walls (bodies as in 3D: extended into junctions) */}
          {koerper.map((k) => (
            <line
              key={k.wandId}
              className={`wand${ausgewaehlt('wand', k.wandId) ? ' ist-ausgewaehlt' : ''}`}
              x1={k.a.x}
              y1={k.a.y}
              x2={k.b.x}
              y2={k.b.y}
              strokeWidth={k.dicke}
            />
          ))}
          {/* openings */}
          {projekt.oeffnungen.map((o) => {
            const lage = oeffnungsLage(projekt, o, km);
            const w = findeWand(projekt, o.wandId);
            if (!lage || !w) return null;
            const n = mal(normale(lage.richtung), o.aufschlag === 'links' ? 1 : -1);
            const sel = ausgewaehlt('oeffnung', o.id) ? ' ist-ausgewaehlt' : '';
            if (o.art === 'fenster') {
              const v1 = mal(normale(lage.richtung), w.dicke / 4);
              return (
                <g key={o.id} className={`oeffnung fenster${sel}`}>
                  <line className="oeffnung-luecke" x1={lage.a.x} y1={lage.a.y} x2={lage.b.x} y2={lage.b.y} strokeWidth={w.dicke + px(2)} />
                  <line className="fenster-glas" x1={lage.a.x + v1.x} y1={lage.a.y + v1.y} x2={lage.b.x + v1.x} y2={lage.b.y + v1.y} />
                  <line className="fenster-glas" x1={lage.a.x - v1.x} y1={lage.a.y - v1.y} x2={lage.b.x - v1.x} y2={lage.b.y - v1.y} />
                  <line className="fenster-rahmen" x1={lage.a.x} y1={lage.a.y} x2={lage.b.x} y2={lage.b.y} />
                </g>
              );
            }
            const angel = o.anschlag === 'links' ? lage.a : lage.b;
            const zu = o.anschlag === 'links' ? lage.b : lage.a;
            const versatz = mal(n, w.dicke / 2);
            const h = plus(angel, versatz);
            const offen = plus(h, mal(n, o.breite));
            const c = plus(zu, versatz);
            const sweep = (offen.x - h.x) * (c.y - h.y) - (offen.y - h.y) * (c.x - h.x) > 0 ? 1 : 0;
            return (
              <g key={o.id} className={`oeffnung tuer${sel}`}>
                <line className="oeffnung-luecke" x1={lage.a.x} y1={lage.a.y} x2={lage.b.x} y2={lage.b.y} strokeWidth={w.dicke + px(2)} />
                <path className="tuer-bogen" d={`M ${h.x} ${h.y} L ${offen.x} ${offen.y} A ${o.breite} ${o.breite} 0 0 ${sweep} ${c.x} ${c.y}`} />
              </g>
            );
          })}
          {/* dimensions */}
          {projekt.waende.map((w) => {
            const a = km.get(w.von)!;
            const b = km.get(w.bis)!;
            const l = abstand(a, b);
            if (l * ansicht.zoom < 64) return null;
            const r = normiert(minus(b, a));
            const m = plus(mal(plus(a, b), 0.5), mal(normale(r), w.dicke / 2 + px(10)));
            return (
              <text
                key={w.id}
                className="mass"
                x={m.x}
                y={m.y}
                fontSize={px(11)}
                transform={`rotate(${textWinkel(r)} ${m.x} ${m.y})`}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {formatLaenge(l)}
              </text>
            );
          })}
          {/* room labels */}
          {projekt.raeume.map((r) => {
            const lp = beschriftungsPunkt(raumPolygon(projekt, r.knoten, km));
            return (
              <g key={r.id} className="raum-text">
                <text x={lp.x} y={lp.y - px(7)} fontSize={px(13)} textAnchor="middle" className="raum-name">
                  {r.name}
                </text>
                <text x={lp.x} y={lp.y + px(10)} fontSize={px(11.5)} textAnchor="middle" className="raum-flaeche">
                  {formatFlaeche(r.flaeche)}
                </text>
              </g>
            );
          })}
          {/* nodes */}
          {zeigeKnoten &&
            projekt.knoten.map((k) => (
              <circle key={k.id} className={`knoten${ausgewaehlt('knoten', k.id) ? ' ist-ausgewaehlt' : ''}`} cx={k.x} cy={k.y} r={px(4)} />
            ))}
          {/* opening preview */}
          {oeffnungsVorschau && (
            <line
              className="oeffnung-vorschau"
              x1={oeffnungsVorschau.a.x}
              y1={oeffnungsVorschau.a.y}
              x2={oeffnungsVorschau.b.x}
              y2={oeffnungsVorschau.b.y}
              strokeWidth={px(8)}
            />
          )}
          {/* wall preview */}
          {werkzeug === 'wand' && start && kp && (
            <g className="wand-vorschau">
              <line x1={start.x} y1={start.y} x2={kp.x} y2={kp.y} strokeWidth={wandDicke} className="wand-vorschau-koerper" />
              <line x1={start.x} y1={start.y} x2={kp.x} y2={kp.y} className="wand-vorschau-achse" />
              {(() => {
                const r = normiert(minus(kp, start));
                const m = plus(mal(plus(start, kp), 0.5), mal(normale(r), -(wandDicke / 2 + px(14))));
                return (
                  <text className="mass mass-aktiv" x={m.x} y={m.y} fontSize={px(13)} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${textWinkel(r)} ${m.x} ${m.y})`}>
                    {formatLaenge(abstand(start, kp))}
                  </text>
                );
              })()}
            </g>
          )}
          {werkzeug === 'wand' && start && <circle className="start-punkt" cx={start.x} cy={start.y} r={px(5)} />}
          {/* snap indicator */}
          {kp && werkzeug === 'wand' && (
            <g className={`fang fang-${vorschau!.art}`}>
              {vorschau!.art === 'knoten' && <circle cx={kp.x} cy={kp.y} r={px(9)} />}
              {vorschau!.art === 'wand' && <rect x={kp.x - px(6)} y={kp.y - px(6)} width={px(12)} height={px(12)} transform={`rotate(45 ${kp.x} ${kp.y})`} />}
              <line x1={kp.x - px(10)} y1={kp.y} x2={kp.x + px(10)} y2={kp.y} />
              <line x1={kp.x} y1={kp.y - px(10)} x2={kp.x} y2={kp.y + px(10)} />
            </g>
          )}
          {/* calibration */}
          {werkzeug === 'massstab' && (
            <g className="kalibrierung">
              {kalibrierPunkte.length === 2 && (
                <line x1={kalibrierPunkte[0]!.x} y1={kalibrierPunkte[0]!.y} x2={kalibrierPunkte[1]!.x} y2={kalibrierPunkte[1]!.y} />
              )}
              {kalibrierPunkte.length === 1 && kp && <line className="kalibrier-vorschau" x1={kalibrierPunkte[0]!.x} y1={kalibrierPunkte[0]!.y} x2={kp.x} y2={kp.y} />}
              {kalibrierPunkte.map((q, i) => (
                <circle key={i} cx={q.x} cy={q.y} r={px(6)} />
              ))}
              {kp && (
                <g className="fang">
                  <line x1={kp.x - px(12)} y1={kp.y} x2={kp.x + px(12)} y2={kp.y} />
                  <line x1={kp.x} y1={kp.y - px(12)} x2={kp.x} y2={kp.y + px(12)} />
                </g>
              )}
            </g>
          )}
        </g>
      </svg>
      {werkzeug === 'wand' && start && (
        <p className="planer-eingabe" aria-live="polite" data-planer-laengeneingabe="">
          {eingabe ? (
            <>
              Länge: <strong>{eingabe}</strong> cm, Eingabetaste bestätigt
            </>
          ) : (
            <>
              {kp ? formatLaenge(abstand(start, kp)) : ''}
              {vorschau?.winkelGrad !== undefined ? ` · ${vorschau.winkelGrad}°` : ''} · Länge in cm tippen oder klicken
            </>
          )}
        </p>
      )}
      <div className="planer-zoom">
        <button type="button" className="planer-icon-knopf" onClick={() => zoomeUm(1.25, { x: groesse.b / 2, y: groesse.h / 2 })} aria-label="Vergrößern">
          +
        </button>
        <button type="button" className="planer-icon-knopf" onClick={() => zoomeUm(0.8, { x: groesse.b / 2, y: groesse.h / 2 })} aria-label="Verkleinern">
          −
        </button>
        <button type="button" className="planer-icon-knopf" onClick={passeEin} aria-label="Ganzen Grundriss zeigen">
          ⤢
        </button>
      </div>
    </div>
  );
}

export const WERKZEUG_NAME: Record<Werkzeug, string> = {
  auswahl: 'Auswählen',
  wand: 'Wand zeichnen',
  tuer: 'Tür setzen',
  fenster: 'Fenster setzen',
  massstab: 'Maßstab festlegen',
};
