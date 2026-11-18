import { z } from 'zod';
import { imagePath, type ImageSchema } from './shared.ts';

export const teamSchema = (image: ImageSchema = imagePath) =>
  z.object({
    name: z.string().min(1),
    rolle: z.string().min(1),
    kurztext: z.string().min(1),
    /** Optional; without photo a blueprint illustration is shown. */
    foto: image.nullish(),
    foto_alt: z.string().nullish(),
    reihenfolge: z.number().int().default(0),
  });

export type TeamMitglied = z.infer<ReturnType<typeof teamSchema>>;
