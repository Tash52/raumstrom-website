// Read access to the central settings. Use these instead of reading YAML directly.
import { getEntry } from 'astro:content';
import { PARTNER_HINWEIS, type Features, type Firma, type Gewerk } from '../schemas/index.ts';

async function setting<T>(collection: 'firma' | 'features' | 'gewerke'): Promise<T> {
  const entry = await getEntry(collection, collection);
  if (!entry) throw new Error(`src/content/settings/${collection}.yaml fehlt`);
  return entry.data as T;
}

export const getFirma = () => setting<Firma>('firma');
export const getFeatures = () => setting<Features>('features');
export async function getGewerke(): Promise<Gewerk[]> {
  return (await setting<{ gewerke: Gewerk[] }>('gewerke')).gewerke;
}

/** Gewerk by id; throws on unknown ids so typos fail the build. */
export async function getGewerk(id: string): Promise<Gewerk> {
  const gewerk = (await getGewerke()).find((g) => g.id === id);
  if (!gewerk) throw new Error(`Unbekanntes Gewerk "${id}" (siehe src/content/settings/gewerke.yaml)`);
  return gewerk;
}

/** Visible notice for a Leistung; null if all Gewerke are executed in-house. */
export async function partnerHinweis(gewerkIds: string[]): Promise<string | null> {
  const gewerke = await Promise.all(gewerkIds.map(getGewerk));
  return gewerke.some((g) => g.ausfuehrung === 'partner') ? PARTNER_HINWEIS : null;
}

export { isPlaceholder } from '../schemas/shared.ts';
