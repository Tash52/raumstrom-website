// Project model of the planner (contract for planner-design and planner-export, Phase 5/6).
// Versioned, JSON-serialisable, validated with zod. Pure: no three.js, no DOM.
//
// Units: metres. Plan coordinates: x to the right, y downwards (as on the floor plan image).
// 3D mapping (szene): plan (x, y) -> three.js (x, 0, y), height along +y.
// The background image itself is NOT part of the project (stays in the browser, privacy and size);
// only its placement (`grundriss`) is stored.
// Version 2 (Phase 5) adds design and furnishing: materials per room and wall side, door/window styles,
// electrical points and furniture. Catalogue entries are only ids here (katalogIdSchema).
// Details and examples: docs/agent-reports/5-planner-geometry.md.
import { z } from 'zod';

// No JIT: zod would probe `Function('')` otherwise, which the strict CSP (no 'unsafe-eval') reports as a violation.
z.config({ jitless: true });

export const PROJEKT_VERSION = 2 as const;
export const STANDARD_HOEHE = 2.5;
export const WANDDICKE = { aussen: 0.3, innen: 0.115 } as const;
/** Selectable wall thicknesses in metres (UI presets). */
export const WANDDICKEN = [0.1, 0.115, 0.175, 0.24, 0.3, 0.365] as const;

const id = z.string().regex(/^[a-z]+[0-9]+$/, 'ID-Format: Buchstaben + Zahl, z. B. w12');
const meter = (min: number, max: number) => z.number().min(min).max(max);
const koordinate = z.number().min(-10_000).max(10_000);
const punkt = z.object({ x: koordinate, y: koordinate });
/**
 * Catalogue id (materials, patterns, formats, electrical types, furniture). Geometry stays catalogue-agnostic:
 * the catalogues live in src/lib/materials/ and src/lib/electro/ (planner-design). Dots separate namespaces,
 * e.g. `fliese.metro-weiss`, `steckdose.2fach-usb-c`.
 */
export const katalogIdSchema = z.string().max(60).regex(/^[a-z0-9-]+(\.[a-z0-9-]+)*$/, 'Katalog-ID: a-z, 0-9, Bindestrich, Punkt als Trenner');
/** Colour as #rrggbb. */
export const farbeSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Farbe als #rrggbb');
/**
 * Side of a wall relative to its direction von->bis, same convention as `Oeffnung.aufschlag`:
 * `links` = towards normale(bis - von) = (-dy, dx) in plan coordinates. A positively oriented room
 * (raum.knoten) lies `links` of each of its edges. (On screen, y down, that is right of the direction.)
 */
export const seiteSchema = z.enum(['links', 'rechts']);

export const knotenSchema = z.object({ id, x: koordinate, y: koordinate });

/**
 * Reference to a catalogue material plus the user's choices. Only `material` is required; the catalogue
 * decides which of the other fields apply (e.g. `fuge`/`format` for tiles, `richtungGrad` for floors).
 */
export const materialRefSchema = z.object({
  material: katalogIdSchema,
  /** Colour override (paint colour, wood tone, tile colour). */
  farbe: farbeSchema.optional(),
  /** Laying or wallpaper pattern (e.g. halbverband, fischgraet, chevron). */
  muster: katalogIdSchema.optional(),
  /** Tile or plank format (e.g. 30x60, 60x120, metro-7-5x15). */
  format: katalogIdSchema.optional(),
  fuge: z.object({ farbe: farbeSchema, breiteMm: z.number().min(0).max(30) }).optional(),
  /** Laying direction in degrees, 0 = along plan x, clockwise on screen (plan y down). */
  richtungGrad: z.number().min(0).max(360).optional(),
  /** Tiling height on walls (only meaningful for `fliesen`). */
  fliesenhoehe: z.enum(['raumhoch', 'halbhoch', 'spritzschutz']).optional(),
});

/** Per-room design. null = nothing chosen (neutral default rendering). */
export const raumGestaltungSchema = z.object({
  /** Finish of all walls of the room (paint, wallpaper, plaster, panels); overridable per wall side. */
  wand: materialRefSchema.nullable(),
  boden: materialRefSchema.nullable(),
  decke: materialRefSchema.nullable(),
  /** Wall tiles of the room (height via `fliesenhoehe`); overridable per wall side. */
  fliesen: materialRefSchema.nullable(),
  sockelleiste: materialRefSchema.nullable(),
});

/** Doors and windows: style choices as catalogue ids/colours, all optional. */
export const oeffnungGestaltungSchema = z.object({
  /** Door leaf or window style. */
  stil: katalogIdSchema.optional(),
  farbe: farbeSchema.optional(),
  zarge: katalogIdSchema.optional(),
  /** Glass cut-out of a door leaf (catalogue id). */
  glas: katalogIdSchema.optional(),
  schiebetuer: z.boolean().optional(),
  /** Window sill material (windows only). */
  fensterbank: materialRefSchema.optional(),
});

/**
 * Override for one side of one wall (accent wall, splash-back on a single wall). null = room's value.
 * Unique per (wandId, seite).
 */
export const wandSeiteSchema = z.object({
  wandId: id,
  seite: seiteSchema,
  wand: materialRefSchema.nullable(),
  fliesen: materialRefSchema.nullable(),
});

export const wandSchema = z.object({
  id,
  von: id,
  bis: id,
  dicke: meter(0.02, 1.5),
  art: z.enum(['aussen', 'innen']),
});

export const oeffnungSchema = z.object({
  id,
  wandId: id,
  art: z.enum(['tuer', 'fenster']),
  /** Distance of the opening's centre from the wall's `von` node, metres. */
  abstand: meter(0, 1000),
  breite: meter(0.2, 6),
  hoehe: meter(0.2, 4),
  /** Sill height above the floor (doors: 0). */
  bruestung: meter(0, 3),
  /** Hinge side seen from `von` to `bis` (doors only, informative for 2D symbol and 3D leaf). */
  anschlag: z.enum(['links', 'rechts']),
  /** Swing side: `links` = to the left of the direction von->bis (plan view), `rechts` = right. */
  aufschlag: z.enum(['links', 'rechts']),
  gestaltung: oeffnungGestaltungSchema.nullable(),
});

/**
 * Electrical point (socket, switch, light outlet …). `typ` is a catalogue id (src/lib/electro/).
 * ort `wand`: on one side of a wall, placed by `abstand` (along the wall from `von`, metres) and `hoehe`
 * (above finished floor, editable); `x`, `y` (point on the wall surface) and `raumId` are derived.
 * ort `decke` / `boden`: placed by `x`, `y` (plan metres); `raumId` is derived from the position;
 * `wandId`/`seite` null, `abstand` 0; `hoehe` is ignored (ceiling = room height, floor = 0).
 * Derived fields are recomputed by `bereinigeAusstattung` (called by mitRaeumen after every edit).
 */
export const elektroSchema = z
  .object({
    id,
    typ: katalogIdSchema,
    ort: z.enum(['wand', 'decke', 'boden']),
    wandId: id.nullable(),
    seite: seiteSchema.nullable(),
    abstand: meter(0, 1000),
    hoehe: meter(0, 6),
    x: koordinate,
    y: koordinate,
    raumId: id.nullable(),
  })
  .refine((e) => (e.ort === 'wand') === (e.wandId !== null && e.seite !== null), {
    message: 'Wandpunkte brauchen wandId und seite, Decken- und Bodenpunkte keine',
  });

/** Furniture (visualisation only). `typ` is a catalogue id; position = centre in plan metres. */
export const einrichtungSchema = z.object({
  id,
  typ: katalogIdSchema,
  x: koordinate,
  y: koordinate,
  /** Rotation in degrees, clockwise on screen (plan y down). */
  drehungGrad: z.number().min(0).max(360),
  /** Derived from the position (null = outside every room). */
  raumId: id.nullable(),
});

export const raumSchema = z.object({
  id,
  name: z.string().trim().min(1).max(60),
  /** Corner nodes in order (centre-line polygon, positively oriented). */
  knoten: z.array(id).min(3).max(400),
  /** Room height in metres, null = project standard height. */
  hoehe: meter(1.8, 6).nullable(),
  /** Derived: clear floor area in m² (centre-line polygon minus half the wall thickness). Recomputed on load. */
  flaeche: z.number().min(0),
  gestaltung: raumGestaltungSchema,
  /** Style package applied last (trend id from src/content/trends/), informative. */
  stilpaket: katalogIdSchema.nullable(),
});

export const grundrissSchema = z.object({
  quelle: z.enum(['bild', 'pdf', 'heic']),
  /** Size of the re-encoded image in pixels (the image itself is not stored). */
  breitePx: z.number().int().min(1).max(20_000),
  hoehePx: z.number().int().min(1).max(20_000),
  /** Scale in metres per image pixel. */
  meterProPixel: z.number().positive().max(10),
  /** World position (metres) of the image's top-left corner. */
  ursprung: punkt,
  deckkraft: z.number().min(0).max(1),
  kalibriert: z.boolean(),
  /** Calibration line in image pixels and its real length in metres. */
  kalibrierung: z.object({ a: punkt, b: punkt, laenge: meter(0.01, 1000) }).nullable(),
  /** Selected PDF page (1-based), null for images. */
  seite: z.number().int().min(1).nullable(),
});

export const projektSchema = z.object({
  version: z.literal(PROJEKT_VERSION),
  name: z.string().trim().max(80),
  /** Template the project started from (vorlagen.ts), null for upload or empty start. */
  vorlage: z.string().max(40).nullable(),
  standardHoehe: meter(2, 6),
  knoten: z.array(knotenSchema).max(2000),
  waende: z.array(wandSchema).max(2000),
  oeffnungen: z.array(oeffnungSchema).max(500),
  raeume: z.array(raumSchema).max(200),
  grundriss: grundrissSchema.nullable(),
  wandSeiten: z.array(wandSeiteSchema).max(4000),
  elektro: z.array(elektroSchema).max(2000),
  einrichtung: z.array(einrichtungSchema).max(500),
});

export type Knoten = z.infer<typeof knotenSchema>;
export type Wand = z.infer<typeof wandSchema>;
export type WandArt = Wand['art'];
export type Oeffnung = z.infer<typeof oeffnungSchema>;
export type OeffnungArt = Oeffnung['art'];
export type Raum = z.infer<typeof raumSchema>;
export type Grundriss = z.infer<typeof grundrissSchema>;
export type Projekt = z.infer<typeof projektSchema>;
export type MaterialRef = z.infer<typeof materialRefSchema>;
export type RaumGestaltung = z.infer<typeof raumGestaltungSchema>;
export type OeffnungGestaltung = z.infer<typeof oeffnungGestaltungSchema>;
export type WandSeite = z.infer<typeof wandSeiteSchema>;
export type Seite = z.infer<typeof seiteSchema>;
export type Elektro = z.infer<typeof elektroSchema>;
export type ElektroOrt = Elektro['ort'];
export type Einrichtung = z.infer<typeof einrichtungSchema>;

export const leereRaumGestaltung = (): RaumGestaltung => ({ wand: null, boden: null, decke: null, fliesen: null, sockelleiste: null });

export function leeresProjekt(name = 'Mein Projekt'): Projekt {
  return {
    version: PROJEKT_VERSION,
    name,
    vorlage: null,
    standardHoehe: STANDARD_HOEHE,
    knoten: [],
    waende: [],
    oeffnungen: [],
    raeume: [],
    grundriss: null,
    wandSeiten: [],
    elektro: [],
    einrichtung: [],
  };
}

/** Next free id with the given prefix (k = Knoten, w = Wand, o = Öffnung, r = Raum, e = Elektro, m = Möbel). */
export function neueId(prefix: string, vorhandene: readonly { id: string }[]): string {
  let max = 0;
  for (const v of vorhandene) {
    if (v.id.startsWith(prefix)) {
      const n = Number(v.id.slice(prefix.length));
      if (Number.isInteger(n) && n > max) max = n;
    }
  }
  return `${prefix}${max + 1}`;
}

/** Referential integrity on top of the schema (unique ids, walls point to nodes …). */
export function pruefeVerweise(p: Projekt): string[] {
  const fehler: string[] = [];
  const knoten = new Set<string>();
  for (const k of p.knoten) {
    if (knoten.has(k.id)) fehler.push(`Knoten ${k.id} doppelt`);
    knoten.add(k.id);
  }
  const waende = new Set<string>();
  for (const w of p.waende) {
    if (waende.has(w.id)) fehler.push(`Wand ${w.id} doppelt`);
    waende.add(w.id);
    if (!knoten.has(w.von) || !knoten.has(w.bis)) fehler.push(`Wand ${w.id} verweist auf unbekannten Knoten`);
    if (w.von === w.bis) fehler.push(`Wand ${w.id} hat Länge 0`);
  }
  const oeff = new Set<string>();
  for (const o of p.oeffnungen) {
    if (oeff.has(o.id)) fehler.push(`Öffnung ${o.id} doppelt`);
    oeff.add(o.id);
    if (!waende.has(o.wandId)) fehler.push(`Öffnung ${o.id} verweist auf unbekannte Wand`);
  }
  const raeume = new Set<string>();
  for (const r of p.raeume) {
    if (raeume.has(r.id)) fehler.push(`Raum ${r.id} doppelt`);
    raeume.add(r.id);
    if (r.knoten.some((k) => !knoten.has(k))) fehler.push(`Raum ${r.id} verweist auf unbekannten Knoten`);
  }
  const seiten = new Set<string>();
  for (const s of p.wandSeiten) {
    const key = `${s.wandId}:${s.seite}`;
    if (seiten.has(key)) fehler.push(`Wandseite ${key} doppelt`);
    seiten.add(key);
    if (!waende.has(s.wandId)) fehler.push(`Wandseite ${key} verweist auf unbekannte Wand`);
  }
  const elektro = new Set<string>();
  for (const e of p.elektro) {
    if (elektro.has(e.id)) fehler.push(`Elektro ${e.id} doppelt`);
    elektro.add(e.id);
    if (e.wandId !== null && !waende.has(e.wandId)) fehler.push(`Elektro ${e.id} verweist auf unbekannte Wand`);
    if (e.raumId !== null && !raeume.has(e.raumId)) fehler.push(`Elektro ${e.id} verweist auf unbekannten Raum`);
  }
  const moebel = new Set<string>();
  for (const m of p.einrichtung) {
    if (moebel.has(m.id)) fehler.push(`Einrichtung ${m.id} doppelt`);
    moebel.add(m.id);
    if (m.raumId !== null && !raeume.has(m.raumId)) fehler.push(`Einrichtung ${m.id} verweist auf unbekannten Raum`);
  }
  return fehler;
}

const istObjekt = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Version 1 -> 2: adds the design and furnishing fields with neutral defaults (rooms: empty gestaltung,
 * no style package; openings: no gestaltung; no wall sides, electro or furniture).
 * Works on the raw object before validation; anything malformed is left for the schema to report.
 */
export function migriereV1(roh: Record<string, unknown>): Record<string, unknown> {
  const { raeume, oeffnungen } = roh;
  return {
    ...roh,
    version: 2,
    raeume: Array.isArray(raeume) ? raeume.map((r) => (istObjekt(r) ? { gestaltung: leereRaumGestaltung(), stilpaket: null, ...r } : r)) : raeume,
    oeffnungen: Array.isArray(oeffnungen) ? oeffnungen.map((o) => (istObjekt(o) ? { gestaltung: null, ...o } : o)) : oeffnungen,
    wandSeiten: roh.wandSeiten ?? [],
    elektro: roh.elektro ?? [],
    einrichtung: roh.einrichtung ?? [],
  };
}

export type LadeErgebnis = { ok: true; projekt: Projekt } | { ok: false; fehler: string[] };

/**
 * Parse a project from JSON text or an object. Older versions are migrated first (1 -> 2).
 * Derived values (room areas, x/y/raumId of electro points and furniture) are recomputed by the caller
 * (raeume.ts: mitRaeumen).
 */
export function parseProjekt(eingabe: unknown): LadeErgebnis {
  let roh = eingabe;
  if (typeof eingabe === 'string') {
    try {
      roh = JSON.parse(eingabe);
    } catch {
      return { ok: false, fehler: ['Keine gültige JSON-Datei'] };
    }
  }
  const v = (roh as { version?: unknown } | null)?.version;
  if (typeof v === 'number' && v > PROJEKT_VERSION) return { ok: false, fehler: [`Projektversion ${v} ist neuer als dieser Planer (${PROJEKT_VERSION})`] };
  if (v === 1 && istObjekt(roh)) roh = migriereV1(roh);
  const r = projektSchema.safeParse(roh);
  if (!r.success) return { ok: false, fehler: r.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`) };
  const verweise = pruefeVerweise(r.data);
  if (verweise.length) return { ok: false, fehler: verweise };
  return { ok: true, projekt: r.data };
}

export const serialisiere = (p: Projekt): string => JSON.stringify(p);

export const knotenMap = (p: Projekt): Map<string, Knoten> => new Map(p.knoten.map((k) => [k.id, k]));
