import { z } from 'zod';
import { metaDescription, metaTitle, saeule, slug, zielgruppe } from './shared.ts';

export const leistungSchema = z.object({
  titel: z.string().min(1),
  meta_title: metaTitle,
  meta_description: metaDescription,
  kurzbeschreibung: z.string().min(1),
  saeule,
  zielgruppen: z.array(zielgruppe).min(1),
  /** IDs from settings/gewerke.yaml; drives the partner notice. */
  gewerke: z.array(slug).default([]),
  ablauf: z.array(z.object({ titel: z.string().min(1), text: z.string().min(1) })).default([]),
  /** IDs of the faq collection. */
  faq: z.array(slug).default([]),
  reihenfolge: z.number().int().default(0),
  entwurf: z.boolean().default(true),
});

export type Leistung = z.infer<typeof leistungSchema>;
