import { z } from 'zod';

export const featuresSchema = z.object({
  /** Mode B of the floor-plan upload (Mistral AI, own consent). */
  floorplan_ai: z.boolean(),
  bewertungen_anzeigen: z.boolean(),
  referenzen_anzeigen: z.boolean(),
  ratgeber_anzeigen: z.boolean(),
  /** Own consent manager; stays off as long as nothing needs consent. */
  consent_manager: z.boolean(),
});

export type Features = z.infer<typeof featuresSchema>;
