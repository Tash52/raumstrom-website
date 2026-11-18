import { z } from 'zod';
import { slug } from './shared.ts';

export const faqSchema = z.object({
  frage: z.string().min(1),
  /** Short answer first (AI search), plain text or simple Markdown. */
  antwort: z.string().min(1),
  /** Leistung IDs, empty = general. */
  leistungen: z.array(slug).default([]),
  reihenfolge: z.number().int().default(0),
});

export type Faq = z.infer<typeof faqSchema>;
