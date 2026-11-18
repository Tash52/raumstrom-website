// Content collections. Schemas live in src/lib/schemas (shared with server, scripts, Keystatic tests).
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  faqSchema,
  featuresSchema,
  firmaSchema,
  gewerkeSchema,
  leistungSchema,
  legalSchema,
  ratgeberSchema,
  referenzSchema,
  regionSchema,
  seiteSchema,
  teamSchema,
  trendSchema,
} from './lib/schemas/index.ts';

const base = (dir: string) => `./src/content/${dir}`;
const setting = (name: string) => glob({ pattern: `${name}.yaml`, base: base('settings') });

export const collections = {
  // Settings: one file each, entry id = file name (firma, features, gewerke).
  firma: defineCollection({ loader: setting('firma'), schema: firmaSchema }),
  features: defineCollection({ loader: setting('features'), schema: featuresSchema }),
  gewerke: defineCollection({ loader: setting('gewerke'), schema: gewerkeSchema }),

  pages: defineCollection({ loader: glob({ pattern: '*.md', base: base('pages') }), schema: seiteSchema }),
  leistungen: defineCollection({
    loader: glob({ pattern: '*.md', base: base('leistungen') }),
    schema: leistungSchema,
  }),
  faq: defineCollection({ loader: glob({ pattern: '*.yaml', base: base('faq') }), schema: faqSchema }),
  ratgeber: defineCollection({
    loader: glob({ pattern: '*.md', base: base('ratgeber') }),
    schema: ratgeberSchema,
  }),
  referenzen: defineCollection({
    loader: glob({ pattern: '*.md', base: base('referenzen') }),
    schema: ({ image }) => referenzSchema(image()),
  }),
  regionen: defineCollection({
    loader: glob({ pattern: '*.md', base: base('regionen') }),
    schema: regionSchema,
  }),
  team: defineCollection({
    loader: glob({ pattern: '*.yaml', base: base('team') }),
    schema: ({ image }) => teamSchema(image()),
  }),
  // _schema.json is generated (npm run trend-schema) and not an entry.
  trends: defineCollection({
    loader: glob({ pattern: ['*.json', '!_*.json'], base: base('trends') }),
    schema: trendSchema,
  }),
  legal: defineCollection({ loader: glob({ pattern: '*.md', base: base('legal') }), schema: legalSchema }),
};
