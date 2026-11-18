import { z } from 'zod';
import { imagePath, slug, type ImageSchema } from './shared.ts';

export const referenzSchema = (image: ImageSchema = imagePath) =>
  z.object({
    titel: z.string().min(1),
    ort: z.string().min(1),
    jahr: z.number().int().min(2020).max(2100).nullish(),
    leistungen: z.array(slug).default([]),
    kurzbeschreibung: z.string().min(1),
    bilder: z.array(z.object({ src: image, alt: z.string().min(1) })).default([]),
    /** true = illustrative placeholder (blueprint graphic), must be visibly labelled. Never pass off as own work. */
    illustrativ: z.boolean().default(true),
    entwurf: z.boolean().default(true),
  });

export type Referenz = z.infer<ReturnType<typeof referenzSchema>>;
