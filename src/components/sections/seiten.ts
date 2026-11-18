// Shared helpers for the pages (page-builder). Content only from the collections.
import { getCollection, getEntry } from 'astro:content';
import { getFirma, getFeatures, isPlaceholder } from '../../lib/content/index.ts';

/** Dev server and `npm run build:staging`: drafts are visible with a banner. Production build: never. */
export const STAGING = import.meta.env.DEV || process.env.RAUMSTROM_STAGING === '1';

export const sichtbar = (entwurf: boolean) => !entwurf || STAGING;

export async function getSeite(id: string) {
  const entry = await getEntry('pages', id);
  if (!entry) throw new Error(`src/content/pages/${id}.md fehlt`);
  return entry;
}

export type SeitenEintrag = Awaited<ReturnType<typeof getSeite>>;

export function abschnitt(seite: SeitenEintrag, id: string) {
  const a = seite.data.abschnitte.find((x) => x.id === id);
  if (!a) throw new Error(`pages/${seite.id}.md: Abschnitt "${id}" fehlt`);
  return a;
}

export async function getLeistungen() {
  const alle = await getCollection('leistungen', ({ data }) => sichtbar(data.entwurf));
  return alle.sort((a, b) => a.data.reihenfolge - b.data.reihenfolge);
}

export async function getFaqFuer(ids: string[]) {
  const faq = await getCollection('faq');
  return ids.map((id) => {
    const f = faq.find((x) => x.id === id);
    if (!f) throw new Error(`Unbekannte FAQ "${id}"`);
    return f;
  });
}

export const SAEULEN_TEXT = {
  modernisieren: 'Modernisieren',
  elektrifizieren: 'Elektrifizieren',
  'sicher-betreiben': 'Sicher betreiben',
} as const;

export { getFirma, getFeatures, isPlaceholder };
