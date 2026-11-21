// Electrical catalogue of the planner (pure TS). Ids are stored as Elektro.typ in the project model.
// Wording: the doorbell/intercom is audio only (no video); no surveillance or "security" terms.
import type { ElektroOrt } from '../geometry/projekt.ts';

export type ElektroKategorie = 'steckdose' | 'schalter' | 'daten' | 'licht' | 'sonstiges';

export type HoehenGruppe =
  | 'steckdose'
  | 'schalter'
  | 'arbeitsplatte'
  | 'daten'
  | 'herd'
  | 'waschmaschine'
  | 'thermostat'
  | 'wandleuchte'
  | 'aussen'
  | 'klingel'
  | 'unterverteilung'
  | 'wallbox'
  | 'oben';

export interface StandardHoehe {
  name: string;
  /** Metres above finished floor (centre of the device). */
  hoehe: number;
}

/** Default mounting heights (editable by the user in the planner). */
export const STANDARDHOEHEN: Record<HoehenGruppe, StandardHoehe> = {
  steckdose: { name: 'Steckdosen', hoehe: 0.3 },
  schalter: { name: 'Schalter und Taster', hoehe: 1.05 },
  arbeitsplatte: { name: 'Küche über Arbeitsplatte', hoehe: 1.15 },
  daten: { name: 'Daten- und Antennendosen', hoehe: 0.3 },
  herd: { name: 'Herdanschluss', hoehe: 0.65 },
  waschmaschine: { name: 'Waschmaschine und Trockner', hoehe: 1.1 },
  thermostat: { name: 'Raumthermostat', hoehe: 1.5 },
  wandleuchte: { name: 'Wandleuchten', hoehe: 1.8 },
  aussen: { name: 'Außenleuchten', hoehe: 2.0 },
  klingel: { name: 'Klingel und Sprechanlage', hoehe: 1.5 },
  unterverteilung: { name: 'Unterverteilung (Mitte)', hoehe: 1.6 },
  wallbox: { name: 'Wallbox-Vorbereitung', hoehe: 1.2 },
  oben: { name: 'Lautsprecher, Access-Point, LED an der Wand', hoehe: 2.2 },
};

export interface ElektroTyp {
  id: string;
  name: string;
  /** Short symbol text for the 2D plan (2-4 characters). */
  kurz: string;
  kategorie: ElektroKategorie;
  /** Allowed mounting places; the first is the default. */
  orte: readonly ElektroOrt[];
  hoehenGruppe: HoehenGruppe;
  /** Function text for the bill of materials (Stückliste). */
  funktion: string;
}

export const KATEGORIEN: ReadonlyArray<{ id: ElektroKategorie; name: string }> = [
  { id: 'steckdose', name: 'Steckdosen' },
  { id: 'schalter', name: 'Schalter' },
  { id: 'daten', name: 'Daten und Medien' },
  { id: 'licht', name: 'Licht' },
  { id: 'sonstiges', name: 'Sonstiges' },
];

const t = (
  id: string,
  name: string,
  kurz: string,
  kategorie: ElektroKategorie,
  orte: readonly ElektroOrt[],
  hoehenGruppe: HoehenGruppe,
  funktion: string,
): ElektroTyp => ({ id, name, kurz, kategorie, orte, hoehenGruppe, funktion });

const W = ['wand'] as const;

export const ELEKTRO_TYPEN: readonly ElektroTyp[] = [
  // sockets
  t('steckdose.1fach', 'Steckdose einfach', 'SD', 'steckdose', W, 'steckdose', 'Schutzkontakt-Steckdose, einfach'),
  t('steckdose.2fach', 'Steckdose 2-fach', 'SD2', 'steckdose', W, 'steckdose', 'Schutzkontakt-Steckdose, 2-fach'),
  t('steckdose.3fach', 'Steckdose 3-fach', 'SD3', 'steckdose', W, 'steckdose', 'Schutzkontakt-Steckdose, 3-fach'),
  t('steckdose.usb', 'Steckdose mit USB-A/C', 'USB', 'steckdose', W, 'steckdose', 'Steckdose mit USB-A- und USB-C-Ladeanschluss'),
  t('steckdose.aussen', 'Außensteckdose IP44', 'IP44', 'steckdose', W, 'steckdose', 'Außensteckdose, spritzwassergeschützt (IP44), mit Klappdeckel'),
  t('steckdose.herd', 'Herdanschluss 400 V', 'HA', 'steckdose', W, 'herd', 'Herdanschlussdose 400 V, eigener Stromkreis'),
  t('steckdose.waschmaschine', 'Waschmaschine / Trockner', 'WM', 'steckdose', W, 'waschmaschine', 'Geräteanschluss Waschmaschine oder Trockner, eigener Stromkreis'),
  t('steckdose.boden', 'Bodensteckdose', 'BD', 'steckdose', ['boden'], 'steckdose', 'Bodensteckdose mit Klappdeckel'),
  // switches
  t('schalter.aus', 'Ausschalter', 'AS', 'schalter', W, 'schalter', 'Ausschalter'),
  t('schalter.wechsel', 'Wechselschalter', 'WS', 'schalter', W, 'schalter', 'Wechselschalter (Licht von zwei Stellen)'),
  t('schalter.kreuz', 'Kreuzschalter', 'KS', 'schalter', W, 'schalter', 'Kreuzschalter (Licht von drei und mehr Stellen)'),
  t('schalter.taster', 'Taster', 'TA', 'schalter', W, 'schalter', 'Taster (z. B. für Stromstoßschalter)'),
  t('schalter.dimmer', 'Dimmer', 'DIM', 'schalter', W, 'schalter', 'Dimmer für dimmbare Leuchten'),
  t('schalter.smart', 'Smart-Schalter', 'SMT', 'schalter', W, 'schalter', 'Smart-Schalter (vernetzt, per App oder Szene)'),
  t('schalter.bewegungsmelder', 'Bewegungsmelder', 'BM', 'schalter', ['wand', 'decke'], 'schalter', 'Bewegungs- oder Präsenzmelder für Licht'),
  // data and media
  t('daten.lan-1', 'LAN-Dose Cat.7, 1-fach', 'LAN', 'daten', W, 'daten', 'Datendose Cat.7, 1-fach'),
  t('daten.lan-2', 'LAN-Dose Cat.7, 2-fach', 'LAN2', 'daten', W, 'daten', 'Datendose Cat.7, 2-fach'),
  t('daten.tv', 'TV/SAT-Dose', 'TV', 'daten', W, 'daten', 'Antennendose TV/Radio/SAT'),
  t('daten.glasfaser', 'Glasfaser-Anschluss', 'GF', 'daten', W, 'daten', 'Glasfaser-Teilnehmeranschluss (Anschlussdose)'),
  t('daten.wlan', 'WLAN-Access-Point', 'AP', 'daten', ['decke', 'wand'], 'oben', 'WLAN-Access-Point mit Netzwerkanschluss'),
  t('daten.lautsprecher', 'Einbaulautsprecher', 'LS', 'daten', ['decke', 'wand'], 'oben', 'Einbaulautsprecher mit Lautsprecherleitung'),
  // light
  t('licht.decke', 'Deckenauslass', 'DA', 'licht', ['decke'], 'oben', 'Deckenauslass für Leuchte'),
  t('licht.spot', 'Einbauspot', 'SP', 'licht', ['decke'], 'oben', 'Einbauspot (LED)'),
  t('licht.wand', 'Wandleuchte', 'WL', 'licht', W, 'wandleuchte', 'Wandauslass für Wandleuchte'),
  t('licht.led', 'LED-Streifen / Lichtvoute', 'LED', 'licht', ['decke', 'wand'], 'oben', 'LED-Streifen bzw. Lichtvoute mit Netzteil'),
  t('licht.aussen', 'Außenleuchte', 'AL', 'licht', W, 'aussen', 'Außenleuchte (wettergeschützt)'),
  // other
  t('sonst.rauchwarnmelder', 'Rauchwarnmelder', 'RWM', 'sonstiges', ['decke'], 'oben', 'Rauchwarnmelder'),
  t('sonst.thermostat', 'Raumthermostat', 'TH', 'sonstiges', W, 'thermostat', 'Raumthermostat'),
  t('sonst.klingel', 'Klingel / Sprechanlage (Audio)', 'KL', 'sonstiges', W, 'klingel', 'Klingel bzw. Sprechanlage, nur Audio'),
  t('sonst.wallbox', 'Wallbox-Vorbereitung', 'WB', 'sonstiges', W, 'wallbox', 'Vorbereitung Wallbox (Leitung und Absicherung)'),
  t('sonst.unterverteilung', 'Unterverteilung', 'UV', 'sonstiges', W, 'unterverteilung', 'Unterverteilung (Stromkreisverteiler)'),
];

const TYPEN = new Map(ELEKTRO_TYPEN.map((x) => [x.id, x]));
export const elektroTypVon = (id: string | undefined): ElektroTyp | undefined => (id ? TYPEN.get(id) : undefined);
export const typenDerKategorie = (k: ElektroKategorie): ElektroTyp[] => ELEKTRO_TYPEN.filter((x) => x.kategorie === k);

/** Height for a new point of this type; `eigene` = user's edited standard heights. */
export function hoeheFuer(typ: string, eigene: Partial<Record<HoehenGruppe, number>> = {}): number {
  const g = elektroTypVon(typ)?.hoehenGruppe ?? 'steckdose';
  const h = eigene[g] ?? STANDARDHOEHEN[g].hoehe;
  return Math.max(0, Math.min(6, h));
}

/** Where a point of this type may sit when the user clicked a wall (true) or inside a room (false). */
export function ortFuer(typ: string, anWand: boolean): ElektroOrt | null {
  const x = elektroTypVon(typ);
  if (!x) return null;
  if (anWand && x.orte.includes('wand')) return 'wand';
  if (!anWand) return x.orte.find((o) => o !== 'wand') ?? null;
  return null;
}
