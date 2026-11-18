import { z } from 'zod';
import { httpsUrl, metaDescription, metaTitle, slug } from './shared.ts';

export const ratgeberSchema = z.object({
  titel: z.string().min(1),
  meta_title: metaTitle,
  meta_description: metaDescription,
  /** Team ID of the author. */
  autor: slug.nullish(),
  veroeffentlicht: z.coerce.date().nullish(),
  aktualisiert: z.coerce.date().nullish(),
  leistungen: z.array(slug).default([]),
  quellen: z.array(z.object({ titel: z.string().min(1), url: httpsUrl })).default([]),
  entwurf: z.boolean().default(true),
});

export type Ratgeber = z.infer<typeof ratgeberSchema>;
