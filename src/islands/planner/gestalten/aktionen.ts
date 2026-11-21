// Actions of the design modes. Every project change goes through planerStore.aendere (one undo step each).
import {
  type MaterialRef,
  type Projekt,
  type Punkt,
  type RaumGestaltung,
  aendereEinrichtung,
  aendereElektro,
  endpunkte,
  entferneEinrichtung,
  entferneElektro,
  fuegeEinrichtungHinzu,
  fuegeElektroHinzu,
  gestalteRaeume,
  knotenMap,
  oeffnungsLage,
  projiziere,
  raumSucher,
  setzeWandSeite,
  wandAbschnitte,
  wandFlaechenPunkt,
  wandSeiteBei,
  wirksameWandGestaltung,
} from '../../../lib/geometry/index.ts';
import { elektroTypVon, hoeheFuer, installationsZonen, istWaagerecht, ortFuer } from '../../../lib/electro/index.ts';
import {
  type Kategorie,
  type Stilpaket,
  beschreibeRef,
  farbName,
  materialVon,
  moebelUmriss,
  moebelVon,
  imPolygon,
  normalisiereRef,
  wendePaketAn,
} from '../../../lib/materials/index.ts';
import { planerStore } from '../store.ts';
import { type GestaltModus, type Ziel, gestaltStore } from './store.ts';
import type { Treffer } from './treffer.ts';

const st = () => planerStore.getState();
const gs = () => gestaltStore.getState();

/** Catalogue category edited by a mode (fliesen on a floor target edits the floor). */
export function kategorieVon(modus: GestaltModus, _ziel?: Ziel): Kategorie | null {
  switch (modus) {
    case 'waende':
      return 'wand';
    case 'boden':
      return 'boden';
    case 'decke':
      return 'decke';
    case 'fliesen':
      return 'fliesen';
    default:
      return null;
  }
}

/** Room of a target (wall side: the room on that side), else the room selected in the plan. */
export function zielRaum(ziel: Ziel = gs().ziel, p: Projekt = st().projekt): string | null {
  let id: string | null = null;
  if (ziel?.art === 'wandseite') id = ziel.raumId;
  else if (ziel?.art === 'boden' || ziel?.art === 'decke') id = ziel.raumId;
  if (!id) {
    const a = st().auswahl;
    if (a?.art === 'raum') id = a.id;
  }
  return id && p.raeume.some((r) => r.id === id) ? id : null;
}

/** Target still exists after undo/redo or wall edits. */
export function gueltigesZiel(p: Projekt, z: Ziel): Ziel {
  if (!z) return null;
  switch (z.art) {
    case 'wandseite':
      return p.waende.some((w) => w.id === z.wandId) ? z : null;
    case 'boden':
    case 'decke':
      return p.raeume.some((r) => r.id === z.raumId) ? z : null;
    case 'oeffnung':
      return p.oeffnungen.some((o) => o.id === z.id) ? z : null;
    case 'elektro':
      return p.elektro.some((e) => e.id === z.id) ? z : null;
    case 'moebel':
      return p.einrichtung.some((m) => m.id === z.id) ? z : null;
  }
}

/** Clear one field of the wall-side overrides on all sides facing the given rooms. */
function loescheSeiten(p: Projekt, raumIds: readonly string[], feld: 'wand' | 'fliesen'): Projekt {
  let q = p;
  for (const id of raumIds) for (const a of wandAbschnitte(q, id)) q = setzeWandSeite(q, a.wandId, a.seite, { [feld]: null });
  return q;
}

const TEIL_NAME: Record<keyof RaumGestaltung, string> = { wand: 'Wände', boden: 'Boden', decke: 'Decke', fliesen: 'Fliesen', sockelleiste: 'Sockelleiste' };

/**
 * Apply a material reference in the current mode to the target (bereich flaeche), its room or the whole flat.
 * Returns false (with a message) when nothing could be applied.
 */
export function wendeAn(ref: MaterialRef | null, optionen: { bereich?: 'flaeche' | 'raum' | 'wohnung'; ziel?: Ziel; teil?: keyof RaumGestaltung } = {}): boolean {
  const g = gs();
  const p = st().projekt;
  const ziel = gueltigesZiel(p, optionen.ziel ?? g.ziel);
  const bereich = optionen.bereich ?? g.bereich;
  const kat = kategorieVon(g.modus, ziel);
  let teil: keyof RaumGestaltung | null = optionen.teil ?? (kat === 'wand' ? 'wand' : kat === 'boden' ? 'boden' : kat === 'decke' ? 'decke' : kat === 'fliesen' ? 'fliesen' : null);
  if (!teil) return false;
  // tiles go to the floor when "Boden" is chosen (a floor click in 3D/2D switches to it), never for a wall side
  if (teil === 'fliesen' && ziel?.art !== 'wandseite' && g.fliesenZiel === 'boden') teil = 'boden';
  const kategorie: Kategorie = teil === 'wand' ? 'wand' : teil === 'fliesen' ? 'fliesen' : teil === 'boden' ? 'boden' : teil === 'decke' ? 'decke' : 'sockelleiste';
  const norm = normalisiereRef(ref, kategorie);
  const text = norm ? beschreibeRef(norm, farbName) : 'entfernt';

  if (bereich === 'flaeche' && ziel?.art === 'wandseite' && (teil === 'wand' || teil === 'fliesen')) {
    st().aendere((q) => setzeWandSeite(q, ziel.wandId, ziel.seite, { [teil!]: norm }), `${TEIL_NAME[teil]} dieser Wandseite: ${text}.`);
    return true;
  }
  if (bereich === 'wohnung') {
    if (!p.raeume.length) {
      st().melde('Noch keine Räume vorhanden. Zeichnen Sie zuerst geschlossene Räume im Modus Bauen.', 'fehler');
      return false;
    }
    st().aendere((q) => {
      const ids = q.raeume.map((r) => r.id);
      const r = gestalteRaeume(q, 'alle', { [teil!]: norm });
      return teil === 'wand' || teil === 'fliesen' ? loescheSeiten(r, ids, teil) : r;
    }, `${TEIL_NAME[teil]} in allen Räumen: ${text}.`);
    return true;
  }
  const raumId = zielRaum(ziel, p);
  if (!raumId) {
    st().melde('Bitte zuerst eine Fläche oder einen Raum wählen: in der Ansicht antippen oder unten in der Raumliste.', 'fehler');
    return false;
  }
  const name = p.raeume.find((r) => r.id === raumId)!.name;
  st().aendere((q) => {
    const r = gestalteRaeume(q, [raumId], { [teil!]: norm });
    return teil === 'wand' || teil === 'fliesen' ? loescheSeiten(r, [raumId], teil) : r;
  }, `${TEIL_NAME[teil]} in ${name}: ${text}.`);
  return true;
}

/** Material reference currently shown on a target for the mode's category (pipette). */
export function refAmZiel(ziel: Ziel, teil: keyof RaumGestaltung, p: Projekt = st().projekt): MaterialRef | null {
  if (!ziel) return null;
  if (ziel.art === 'wandseite') {
    const w = wirksameWandGestaltung(p, ziel.wandId, ziel.seite);
    if (teil === 'wand') return w.wand;
    if (teil === 'fliesen') return w.fliesen;
    const r = p.raeume.find((x) => x.id === w.raumId);
    return r ? r.gestaltung[teil] : null;
  }
  const raumId = zielRaum(ziel, p);
  const r = raumId ? p.raeume.find((x) => x.id === raumId) : undefined;
  if (!r) return null;
  if (teil === 'fliesen' && ziel.art === 'boden') return r.gestaltung.boden;
  return r.gestaltung[teil];
}

/** Pipette: take over the material of the target into the tile selection of the current mode. */
export function nimmPipette(ziel: Ziel): boolean {
  const g = gs();
  const kat = kategorieVon(g.modus, ziel);
  if (!kat) return false;
  const teil = kat === 'fliesen' && ziel?.art === 'boden' ? 'boden' : (kat as keyof RaumGestaltung);
  const ref = refAmZiel(ziel, teil);
  gestaltStore.setState({ pipette: false });
  if (!ref) {
    st().melde('Diese Fläche hat noch kein Material. Nichts übernommen.', 'fehler');
    return false;
  }
  const wahlTeil = kat === 'fliesen' ? 'fliesen' : (kat as 'wand' | 'boden' | 'decke');
  const zielKat = teil === 'boden' && kat === 'fliesen' ? 'fliesen' : kat;
  const norm = normalisiereRef(ref, zielKat) ?? ref;
  g.waehle(wahlTeil, norm);
  st().melde(`Pipette: ${beschreibeRef(norm, farbName)} übernommen. Tippen Sie jetzt auf die Zielfläche.`);
  return true;
}

function zielAusTreffer(t: Treffer, modus: GestaltModus): Ziel {
  switch (t.art) {
    case 'wand':
      return t.seite ? { art: 'wandseite', wandId: t.wandId, seite: t.seite, raumId: t.raumId } : null;
    case 'boden':
      return modus === 'decke' ? { art: 'decke', raumId: t.raumId } : { art: 'boden', raumId: t.raumId };
    case 'decke':
      return { art: 'decke', raumId: t.raumId };
    case 'tuer':
    case 'fenster':
      return { art: 'oeffnung', id: t.id };
    case 'elektro':
      return { art: 'elektro', id: t.id };
    case 'moebel':
      return { art: 'moebel', id: t.id };
    default:
      return null;
  }
}

function wahlFuer(modus: GestaltModus): MaterialRef | null {
  const w = gs().wahl;
  return modus === 'waende' ? w.wand : modus === 'boden' ? w.boden : modus === 'decke' ? w.decke : modus === 'fliesen' ? w.fliesen : null;
}

/** Click/tap in the 3D view or the 2D plan, in a design mode. */
export function behandleTreffer(t: Treffer): void {
  const g = gs();
  const modus = g.modus;
  if (modus === 'bauen' || modus === 'ansicht') return;
  if (modus === 'elektro') return elektroTreffer(t);
  if (modus === 'einrichtung') return moebelTreffer(t);
  const ziel = zielAusTreffer(t, modus);
  if (modus === 'oeffnungen') {
    if (ziel?.art === 'oeffnung') {
      g.setze({ ziel });
      const o = st().projekt.oeffnungen.find((x) => x.id === ziel.id);
      st().melde(`${o?.art === 'fenster' ? 'Fenster' : 'Tür'} gewählt. Stil, Farbe und Details stehen in der Seitenleiste.`);
    } else st().melde('Tippen Sie auf eine Tür oder ein Fenster.', 'fehler');
    return;
  }
  // surfaces: walls, floor, ceiling, tiles
  const passend =
    (modus === 'waende' && (ziel?.art === 'wandseite' || ziel?.art === 'boden')) ||
    (modus === 'boden' && ziel?.art === 'boden') ||
    (modus === 'decke' && ziel?.art === 'decke') ||
    (modus === 'fliesen' && (ziel?.art === 'wandseite' || ziel?.art === 'boden'));
  if (!passend || !ziel) {
    const was = { waende: 'eine Wand', boden: 'einen Boden', decke: 'einen Raum (Boden antippen wählt seine Decke)', fliesen: 'eine Wand oder einen Boden' }[modus];
    st().melde(`Tippen Sie auf ${was}.`, 'fehler');
    return;
  }
  if (ziel.art === 'wandseite' && !ziel.raumId && g.bereich !== 'flaeche') {
    g.setze({ ziel });
    st().melde('Diese Wandseite gehört zu keinem Raum (außen). Bereich „Fläche" wählen, um nur sie zu gestalten.', 'fehler');
    return;
  }
  g.setze(modus === 'fliesen' ? { ziel, fliesenZiel: ziel.art === 'boden' ? 'boden' : 'wand' } : { ziel });
  if (g.pipette) {
    nimmPipette(ziel);
    return;
  }
  const ref = wahlFuer(modus);
  // in the walls mode a floor click selects the room (for "Raum"/"Wohnung")
  if (modus === 'waende' && ziel.art === 'boden' && g.bereich === 'flaeche') {
    st().melde('Raum gewählt. Für alle Wände des Raums den Bereich „Raum" wählen, oder eine Wand antippen.');
    return;
  }
  if (ref) wendeAn(ref, { ziel });
  else st().melde('Fläche gewählt. Wählen Sie jetzt eine Kachel in der Seitenleiste.');
}

// ---------- electro ----------

/** Height for a new point: edited standards, sockets above the worktop when chosen. */
export function neueHoehe(typ: string): number {
  const g = gs();
  const t = elektroTypVon(typ);
  if (g.ueberArbeitsplatte && t?.kategorie === 'steckdose' && t.hoehenGruppe === 'steckdose') return hoeheFuer('x', { steckdose: g.hoehen.arbeitsplatte ?? 1.15 });
  return hoeheFuer(typ, g.hoehen);
}

/** Snap the position along the wall to the centre of a nearby vertical installation zone (switches, 8 cm). */
export function rasteAnZone(p: Projekt, wandId: string, seite: 'links' | 'rechts', raumId: string | null, abstand: number, typ: string): { abstand: number; eingerastet: boolean } {
  const gerundet = Math.round(abstand * 100) / 100;
  if (!raumId || elektroTypVon(typ)?.hoehenGruppe !== 'schalter') return { abstand: gerundet, eingerastet: false };
  const w = p.waende.find((x) => x.id === wandId);
  if (!w) return { abstand: gerundet, eingerastet: false };
  const km = knotenMap(p);
  const { a, b } = endpunkte(p, w, km);
  const l = Math.hypot(b.x - a.x, b.y - a.y);
  let best: number | null = null;
  for (const z of installationsZonen(p, raumId)) {
    if (istWaagerecht(z.art) || z.wandId !== wandId || z.seite !== seite) continue;
    const mitte = { x: (z.von.x + z.bis.x) / 2, y: (z.von.y + z.bis.y) / 2 };
    const u = projiziere(mitte, a, b).t * l;
    if (Math.abs(u - abstand) < 0.08 && (best === null || Math.abs(u - abstand) < Math.abs(best - abstand))) best = u;
  }
  return best === null ? { abstand: gerundet, eingerastet: false } : { abstand: Math.round(best * 100) / 100, eingerastet: true };
}

function elektroTreffer(t: Treffer): void {
  const g = gs();
  if (t.art === 'elektro') {
    g.setze({ ziel: { art: 'elektro', id: t.id } });
    const e = st().projekt.elektro.find((x) => x.id === t.id);
    st().melde(`${elektroTypVon(e?.typ)?.name ?? 'Elektropunkt'} gewählt. Höhe und Lage in der Seitenleiste ändern.`);
    return;
  }
  const typ = g.elektroTyp;
  const def = elektroTypVon(typ);
  if (!def) return;
  const p = st().projekt;
  if (t.art === 'wand' && t.seite) {
    if (!ortFuer(typ, true)) {
      st().melde(`${def.name} sitzt an der ${def.orte[0] === 'boden' ? 'Boden' : 'Decke'}: bitte auf den Boden des Raums tippen.`, 'fehler');
      return;
    }
    const w = p.waende.find((x) => x.id === t.wandId);
    const treffer = wandSeiteBei(p, t.plan, (w?.dicke ?? 0.3) / 2 + 0.3);
    if (!treffer) return;
    const seite = t.seite;
    const raumId = t.raumId;
    const r = rasteAnZone(p, t.wandId, seite, raumId, treffer.abstand, typ);
    const x = fuegeElektroHinzu(p, { typ, ort: 'wand', wandId: t.wandId, seite, abstand: r.abstand, hoehe: neueHoehe(typ) });
    if (!x) return;
    st().aendere(() => x.projekt, `${def.name} gesetzt${r.eingerastet ? ', an der Installationszone eingerastet' : ''}.`);
    g.setze({ ziel: { art: 'elektro', id: x.id } });
    return;
  }
  if (t.art === 'boden' || t.art === 'decke' || t.art === 'moebel' || t.art === 'leer') {
    const ort = ortFuer(typ, false);
    if (!ort) {
      st().melde(`${def.name} sitzt an der Wand: bitte auf eine Wandseite tippen.`, 'fehler');
      return;
    }
    const x = fuegeElektroHinzu(p, { typ, ort: ort as 'decke' | 'boden', x: Math.round(t.plan.x * 100) / 100, y: Math.round(t.plan.y * 100) / 100 });
    if (!x) return;
    st().aendere(() => x.projekt, `${def.name} gesetzt.`);
    g.setze({ ziel: { art: 'elektro', id: x.id } });
    return;
  }
  st().melde('Tippen Sie auf eine Wandseite oder in einen Raum.', 'fehler');
}

// ---------- furniture ----------

/** Place furniture: snaps its back against a nearby wall (within 60 cm) and turns it to face the room. */
export function moebelLage(p: Projekt, typ: string, pt: Punkt): { x: number; y: number; drehungGrad: number } {
  const m = moebelVon(typ);
  const tiefe = m?.tiefe ?? 0.6;
  const t = wandSeiteBei(p, pt, 2);
  if (t) {
    const w = p.waende.find((x) => x.id === t.wandId)!;
    const f = wandFlaechenPunkt(p, w, t.seite, t.abstand);
    const abstandZurFlaeche = t.entfernung - w.dicke / 2;
    if (abstandZurFlaeche >= -0.05 && abstandZurFlaeche < 0.6 + tiefe / 2) {
      const n = f.normale;
      const drehungGrad = ((((Math.atan2(-n.x, n.y) * 180) / Math.PI) % 360) + 360) % 360;
      return { x: Math.round((f.punkt.x + n.x * (tiefe / 2 + 0.01)) * 100) / 100, y: Math.round((f.punkt.y + n.y * (tiefe / 2 + 0.01)) * 100) / 100, drehungGrad: Math.round(drehungGrad) % 360 };
    }
  }
  return { x: Math.round(pt.x * 100) / 100, y: Math.round(pt.y * 100) / 100, drehungGrad: 0 };
}

function moebelTreffer(t: Treffer): void {
  const g = gs();
  if (t.art === 'moebel') {
    g.setze({ ziel: { art: 'moebel', id: t.id } });
    const m = st().projekt.einrichtung.find((x) => x.id === t.id);
    st().melde(`${moebelVon(m?.typ)?.name ?? 'Möbel'} gewählt. Drehen, verschieben oder löschen in der Seitenleiste.`);
    return;
  }
  if (t.art !== 'boden' && t.art !== 'leer' && t.art !== 'decke') {
    st().melde('Tippen Sie auf den Boden, um das Möbel zu platzieren.', 'fehler');
    return;
  }
  const p = st().projekt;
  const lage = moebelLage(p, g.moebelTyp, t.plan);
  const r = fuegeEinrichtungHinzu(p, { typ: g.moebelTyp, ...lage });
  st().aendere(() => r.projekt, `${moebelVon(g.moebelTyp)?.name ?? 'Möbel'} platziert (nur Visualisierung).`);
  g.setze({ ziel: { art: 'moebel', id: r.id } });
}

/** Move the selected furniture or electrical point (keyboard and buttons). dx/dy in metres (plan). */
export function verschiebeZiel(dx: number, dy: number): boolean {
  const z = gueltigesZiel(st().projekt, gs().ziel);
  const p = st().projekt;
  if (z?.art === 'moebel') {
    const m = p.einrichtung.find((x) => x.id === z.id)!;
    st().aendere((q) => aendereEinrichtung(q, z.id, { x: Math.round((m.x + dx) * 100) / 100, y: Math.round((m.y + dy) * 100) / 100 }), 'Möbel verschoben.');
    return true;
  }
  if (z?.art === 'elektro') {
    const e = p.elektro.find((x) => x.id === z.id)!;
    if (e.ort === 'wand' && e.wandId) {
      // along the wall: project the move onto the wall direction
      const w = p.waende.find((x) => x.id === e.wandId)!;
      const { a, b } = endpunkte(p, w);
      const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const d = (dx * (b.x - a.x) + dy * (b.y - a.y)) / l;
      st().aendere((q) => aendereElektro(q, z.id, { abstand: Math.max(0, Math.round((e.abstand + d) * 100) / 100) }), 'Elektropunkt verschoben.');
    } else st().aendere((q) => aendereElektro(q, z.id, { x: Math.round((e.x + dx) * 100) / 100, y: Math.round((e.y + dy) * 100) / 100 }), 'Elektropunkt verschoben.');
    return true;
  }
  return false;
}

export function dreheMoebel(grad: number): void {
  const z = gueltigesZiel(st().projekt, gs().ziel);
  if (z?.art !== 'moebel') return;
  const m = st().projekt.einrichtung.find((x) => x.id === z.id)!;
  st().aendere((q) => aendereEinrichtung(q, z.id, { drehungGrad: m.drehungGrad + grad }), `Möbel um ${grad > 0 ? '+' : ''}${grad}° gedreht.`);
}

export function loescheZiel(): boolean {
  const z = gueltigesZiel(st().projekt, gs().ziel);
  if (z?.art === 'moebel') {
    st().aendere((q) => entferneEinrichtung(q, z.id), 'Möbel entfernt.');
  } else if (z?.art === 'elektro') {
    st().aendere((q) => entferneElektro(q, z.id), 'Elektropunkt entfernt.');
  } else return false;
  gs().setze({ ziel: null });
  return true;
}

// ---------- style packages ----------

export function wendeStilpaketAn(paket: Stilpaket, umfang: 'raum' | 'wohnung'): void {
  const p = st().projekt;
  if (!p.raeume.length) {
    st().melde('Noch keine Räume vorhanden. Zeichnen Sie zuerst geschlossene Räume im Modus Bauen.', 'fehler');
    return;
  }
  const sicher = /^[a-z0-9-]+$/.test(paket.id) ? paket : { ...paket, id: 'stilpaket' };
  if (umfang === 'wohnung') {
    st().aendere((q) => wendePaketAn(q, sicher, 'alle'), `Stilpaket „${paket.name}" auf die ganze Wohnung angewendet. Alles bleibt einzeln änderbar.`);
    return;
  }
  const raumId = zielRaum();
  if (!raumId) {
    st().melde('Bitte zuerst einen Raum wählen (in der Ansicht antippen oder in der Raumliste).', 'fehler');
    return;
  }
  const name = p.raeume.find((r) => r.id === raumId)!.name;
  st().aendere((q) => wendePaketAn(q, sicher, [raumId]), `Stilpaket „${paket.name}" auf ${name} angewendet. Alles bleibt einzeln änderbar.`);
}

// ---------- 2D hit test ----------

/** Hit at a plan point in the 2D editor (radius in metres = a few screen pixels). */
export function treffer2D(p: Projekt, w: Punkt, radius: number): Treffer {
  const km = knotenMap(p);
  // electrical symbols first (small, on top)
  let naechsterE: { id: string; d: number } | null = null;
  for (const e of p.elektro) {
    const d = Math.hypot(e.x - w.x, e.y - w.y);
    if (d <= Math.max(radius, 0.12) && (!naechsterE || d < naechsterE.d)) naechsterE = { id: e.id, d };
  }
  if (naechsterE) return { art: 'elektro', id: naechsterE.id, plan: w };
  for (const m of [...p.einrichtung].reverse()) {
    const def = moebelVon(m.typ);
    if (def && imPolygon(w, moebelUmriss(def, m.x, m.y, m.drehungGrad))) return { art: 'moebel', id: m.id, plan: w };
  }
  for (const o of p.oeffnungen) {
    const lage = oeffnungsLage(p, o, km);
    const wand = p.waende.find((x) => x.id === o.wandId);
    if (lage && wand && projiziere(w, lage.a, lage.b).abstand <= wand.dicke / 2 + radius * 0.5) return { art: o.art, id: o.id, wandId: o.wandId, plan: w };
  }
  const maxDicke = p.waende.reduce((m, x) => Math.max(m, x.dicke), 0);
  const ws = wandSeiteBei(p, w, maxDicke / 2 + radius, km);
  if (ws) {
    const wand = p.waende.find((x) => x.id === ws.wandId)!;
    if (ws.entfernung <= wand.dicke / 2 + radius) return { art: 'wand', wandId: ws.wandId, seite: ws.seite, raumId: ws.raumId, plan: w };
  }
  const raum = raumSucher(p)(w);
  if (raum) return { art: 'boden', raumId: raum.id, plan: w };
  return { art: 'leer', plan: w };
}

export const materialName = (id: string | undefined) => materialVon(id)?.name ?? id ?? '';
