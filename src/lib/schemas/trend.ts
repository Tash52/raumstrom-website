import { z } from 'zod';

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Farbe als #RRGGBB');
/** Neutral names only, no protected brand or colour-system names. */
const farbe = z.object({ name: z.string().min(1), hex });

export const trendSchema = z
  .object({
    name: z.string().min(1),
    beschreibung: z.string().min(1),
    /** ISO date; the site shows "Trends <saison>" from this date on. */
    gueltig_ab: z.iso.date(),
    /** e.g. "2026/27" */
    saison: z.string().regex(/^\d{4}(\/\d{2})?$/),
    /** Internal note on sources (not shown on the website). */
    trend_quelle_notiz: z.string().min(1),
    aktiv: z.boolean(),
    wandfarben: z.array(farbe).min(1),
    putz_tapete: z.object({ art: z.enum(['putz', 'tapete', 'farbe']), beschreibung: z.string().min(1) }),
    boden: z.object({
      material: z.enum(['vinyl', 'laminat', 'parkett', 'fliese', 'teppich']),
      farbton: farbe,
      verlegemuster: z.string().optional(),
    }),
    fliesen: z
      .object({ format: z.string().min(1), farbe, verlegemuster: z.string().optional(), fuge: hex.optional() })
      .optional(),
    deckenlicht: z.object({ art: z.string().min(1), farbtemperatur_k: z.number().int().min(1800).max(6500) }),
    elektro_vorschlag: z.object({ paket: z.string().min(1), punkte: z.array(z.string().min(1)).min(1) }),
  })
  .meta({ title: 'RAUMSTROM Stilpaket', description: 'Ein Stilpaket unter src/content/trends/*.json' });

export type Trend = z.infer<typeof trendSchema>;
