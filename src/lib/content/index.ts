// Read access to the central settings. Use these instead of reading YAML directly.
import { getEntry } from 'astro:content';
import type { Features, Firma, Gewerk } from '../schemas/index.ts';
import { findGewerk, kennzeichnung, partnerGewerke } from './gewerke.ts';
import { renderMitFirma } from './rechtstext.ts';

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
  return findGewerk(await getGewerke(), id);
}

/** Visible notice for a Leistung; null if all Gewerke are executed in-house. */
export async function partnerHinweis(gewerkIds: string[]): Promise<string | null> {
  return kennzeichnung(await getGewerke(), gewerkIds);
}

/** Partner-executed Gewerke of a Leistung (to name them next to the notice). */
export async function getPartnerGewerke(gewerkIds: string[]): Promise<Gewerk[]> {
  return partnerGewerke(await getGewerke(), gewerkIds);
}

/**
 * Legal text with company data: applies the marker syntax (src/lib/content/rechtstext.ts) to the
 * rendered HTML of an entry. Use with `<Fragment set:html={await renderRechtstext(entry)} />`.
 */
export async function renderRechtstext(entry: { id: string; rendered?: { html: string } }): Promise<string> {
  if (!entry.rendered) throw new Error(`Rechtstext "${entry.id}" ist nicht gerendert`);
  try {
    return renderMitFirma(entry.rendered.html, { firma: await getFirma(), features: await getFeatures() });
  } catch (e) {
    throw new Error(`src/content/legal/${entry.id}.md: ${(e as Error).message}`);
  }
}

export { renderMitFirma, MarkerFehler } from './rechtstext.ts';
export { isPlaceholder } from '../schemas/shared.ts';
