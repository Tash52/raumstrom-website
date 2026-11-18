// Pure helpers for the Gewerke-Kennzeichnung (no astro:content import, unit-testable).
import { PARTNER_HINWEIS, type Gewerk } from '../schemas/index.ts';

/** Gewerk by id; throws on unknown ids so typos fail the build. */
export function findGewerk(gewerke: Gewerk[], id: string): Gewerk {
  const gewerk = gewerke.find((g) => g.id === id);
  if (!gewerk) throw new Error(`Unbekanntes Gewerk "${id}" (siehe src/content/settings/gewerke.yaml)`);
  return gewerk;
}

/** Gewerke of a Leistung that are executed by a Meister-Partnerbetrieb. */
export function partnerGewerke(gewerke: Gewerk[], ids: string[]): Gewerk[] {
  return ids.map((id) => findGewerk(gewerke, id)).filter((g) => g.ausfuehrung === 'partner');
}

/** Visible notice for a Leistung; null if all its Gewerke are executed in-house. */
export function kennzeichnung(gewerke: Gewerk[], ids: string[]): string | null {
  return partnerGewerke(gewerke, ids).length > 0 ? PARTNER_HINWEIS : null;
}
