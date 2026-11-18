import { z } from 'zod';
import { slug } from './shared.ts';

export const AUSFUEHRUNG = ['eigen', 'partner'] as const;

export const gewerkSchema = z.object({
  id: slug,
  name: z.string().min(1),
  /** `partner` renders "Ausführung durch unseren Meister-Partnerbetrieb" (plural for several). */
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

/** Exactly one partner-executed Gewerk named. */
export const PARTNER_HINWEIS = 'Ausführung durch unseren Meister-Partnerbetrieb';
/** Several partner-executed Gewerke named (Orchestrator-Entscheidung Phase 2). */
export const PARTNER_HINWEIS_PLURAL = 'Ausführung durch unsere Meister-Partnerbetriebe';

/** Notice text for the number of partner-executed Gewerke; null for 0. */
export function partnerHinweisText(anzahl: number): string | null {
  if (anzahl <= 0) return null;
  return anzahl === 1 ? PARTNER_HINWEIS : PARTNER_HINWEIS_PLURAL;
}
