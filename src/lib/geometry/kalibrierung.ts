// Scale calibration and German number formatting/parsing (pure).
import { type Punkt, abstand } from './vektor.ts';

export type KalibrierErgebnis = { ok: true; meterProPixel: number } | { ok: false; fehler: string };

/** Minimum length of the calibration line on the image (pixels). */
export const MIN_KALIBRIER_PX = 10;

/** Scale from two image points (pixels) and their real distance in metres. */
export function massstabAusStrecke(a: Punkt, b: Punkt, laengeMeter: number): KalibrierErgebnis {
  const px = abstand(a, b);
  if (px < MIN_KALIBRIER_PX) return { ok: false, fehler: 'Die Strecke ist zu kurz. Bitte zwei weiter entfernte Punkte wählen.' };
  if (!(laengeMeter > 0) || !Number.isFinite(laengeMeter)) return { ok: false, fehler: 'Bitte eine Länge größer als 0 eingeben.' };
  if (laengeMeter > 1000) return { ok: false, fehler: 'Die Länge ist unrealistisch groß.' };
  return { ok: true, meterProPixel: laengeMeter / px };
}

/**
 * Parse a length typed by the user. Accepts "88,5", "88.5", "88,5 cm", "3,45 m", "3450 mm".
 * Without unit, `standard` applies. Returns metres or null.
 */
export function parseLaenge(text: string, standard: 'cm' | 'm' = 'cm'): number | null {
  const t = text.trim().toLowerCase().replace(/\s+/g, '');
  const m = /^(\d+(?:[.,]\d+)?)(mm|cm|m)?$/.exec(t);
  if (!m) return null;
  const zahl = Number(m[1]!.replace(',', '.'));
  if (!Number.isFinite(zahl) || zahl <= 0) return null;
  const einheit = (m[2] ?? standard) as 'mm' | 'cm' | 'm';
  const faktor = { mm: 0.001, cm: 0.01, m: 1 }[einheit];
  return Number((zahl * faktor).toFixed(4));
}

const zahl = (n: number, stellen: number) =>
  n.toLocaleString('de-DE', { minimumFractionDigits: stellen, maximumFractionDigits: stellen });

/** "3,45 m"; below 1 m as "88,5 cm". */
export function formatLaenge(meter: number): string {
  if (Math.abs(meter) < 1) return `${zahl(Math.round(meter * 1000) / 10, Math.round(meter * 1000) % 10 ? 1 : 0)} cm`;
  return `${zahl(meter, 2)} m`;
}

/** "12,3 m²" */
export const formatFlaeche = (qm: number): string => `${zahl(qm, 1)} m²`;

/** Centimetres for number inputs, e.g. 0.885 -> 88.5 */
export const inZentimeter = (meter: number): number => Math.round(meter * 1000) / 10;
