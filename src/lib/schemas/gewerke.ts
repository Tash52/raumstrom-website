import { z } from 'zod';
import { slug } from './shared.ts';

export const AUSFUEHRUNG = ['eigen', 'partner'] as const;

export const gewerkSchema = z.object({
  id: slug,
  name: z.string().min(1),
  /** `partner` renders "Ausführung durch unseren Meister-Partnerbetrieb". */
  ausfuehrung: z.enum(AUSFUEHRUNG),
  /** Wording checked by Handwerkskammer für Unterfranken. */
  hinweis_hwk_geprueft: z.boolean(),
});

export const gewerkeSchema = z
  .object({ gewerke: z.array(gewerkSchema).min(1) })
  .refine((d) => new Set(d.gewerke.map((g) => g.id)).size === d.gewerke.length, {
    message: 'Gewerke-IDs müssen eindeutig sein',
  });

export type Gewerk = z.infer<typeof gewerkSchema>;
export type Gewerke = z.infer<typeof gewerkeSchema>;

export const PARTNER_HINWEIS = 'Ausführung durch unseren Meister-Partnerbetrieb';
