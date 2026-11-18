import { z } from 'zod';
import { metaDescription, metaTitle, slug } from './shared.ts';

/** Regional page. Only generated if `entwurf: false` and the body has own content. */
export const regionSchema = z.object({
  ort: z.string().min(1),
  meta_title: metaTitle,
  meta_description: metaDescription,
  /** Individual facts: building stock, distance, local references. */
  besonderheiten: z.string().min(1),
  anfahrt: z.string().nullish(),
  referenzen: z.array(slug).default([]),
  entwurf: z.boolean().default(true),
});

export type Region = z.infer<typeof regionSchema>;
