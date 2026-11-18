import { z } from 'zod';
import { metaDescription, metaTitle, slug } from './shared.ts';

/** Page texts (src/content/pages/*.md). Body = main text, `abschnitte` = named blocks. */
export const seiteSchema = z.object({
  titel: z.string().min(1),
  meta_title: metaTitle,
  meta_description: metaDescription,
  abschnitte: z
    .array(
      z.object({
        id: slug,
        label: z.string().optional(),
        titel: z.string().min(1),
        text: z.string().min(1),
      }),
    )
    .default([]),
  entwurf: z.boolean().default(true),
});

export type Seite = z.infer<typeof seiteSchema>;
