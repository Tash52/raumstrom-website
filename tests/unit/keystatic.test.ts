import { describe, expect, it } from 'vitest';
import keystatic from '../../keystatic.config.ts';
import {
  faqSchema, featuresSchema, firmaSchema, gewerkSchema, leistungSchema, legalSchema, ratgeberSchema,
  referenzSchema, regionSchema, seiteSchema, teamSchema, trendSchema,
} from '../../src/lib/schemas/index.ts';
import type { z } from 'zod';

type Field = { kind: string; fields?: Record<string, Field>; element?: Field };
const CONTENT_FIELD = 'inhalt';

/** Field tree of a Keystatic schema, two levels deep (objects and arrays of objects). */
function keystaticKeys(schema: Record<string, Field>, prefix = ''): string[] {
  return Object.entries(schema).flatMap(([k, f]) => {
    if (!prefix && k === CONTENT_FIELD) return [];
    const nested = f.kind === 'object' ? f.fields : f.kind === 'array' && f.element?.kind === 'object' ? f.element.fields : undefined;
    return nested && !prefix ? [k, ...keystaticKeys(nested, `${k}.`)] : [`${prefix}${k}`];
  });
}

function zodKeys(schema: z.ZodType, prefix = ''): string[] {
  let s: any = schema;
  while (s.def?.innerType || (s.def?.type === 'pipe' && s.def.in)) s = s.def.innerType ?? s.def.in;
  const shape = s.shape ?? s.def?.shape;
  return Object.entries(shape as Record<string, z.ZodType>).flatMap(([k, v]) => {
    let inner: any = v;
    while (inner.def?.innerType) inner = inner.def.innerType;
    if (inner.def?.type === 'array') inner = inner.def.element;
    while (inner.def?.innerType) inner = inner.def.innerType;
    const isObject = inner.def?.type === 'object';
    return isObject && !prefix ? [k, ...zodKeys(inner, `${k}.`)] : [`${prefix}${k}`];
  });
}

const sort = (a: string[]) => [...a].sort();

describe('Keystatic-Formulare entsprechen den zod-Schemas', () => {
  const singletons = keystatic.singletons as Record<string, { schema: Record<string, Field> }>;
  const collections = keystatic.collections as Record<string, { schema: Record<string, Field>; path: string }>;

  it.each([
    ['firma', firmaSchema],
    ['features', featuresSchema],
  ] as const)('Singleton %s', (name, schema) => {
    const keys = sort(zodKeys(schema));
    expect(keys.length).toBeGreaterThan(4);
    expect(sort(keystaticKeys(singletons[name]!.schema))).toEqual(keys);
  });

  it('Singleton gewerke', () => {
    expect(sort(keystaticKeys(singletons.gewerke!.schema))).toEqual(sort(['gewerke', ...zodKeys(gewerkSchema, 'gewerke.')]));
  });

  it.each([
    ['pages', seiteSchema],
    ['leistungen', leistungSchema],
    ['faq', faqSchema],
    ['ratgeber', ratgeberSchema],
    ['referenzen', referenzSchema()],
    ['regionen', regionSchema],
    ['team', teamSchema()],
    ['trends', trendSchema],
    ['legal', legalSchema],
  ] as const)('Collection %s', (name, schema) => {
    expect(collections[name], name).toBeDefined();
    expect(collections[name]!.path).toBe(`src/content/${name}/*`);
    const keys = sort(zodKeys(schema));
    expect(keys.length).toBeGreaterThan(3);
    expect(sort(keystaticKeys(collections[name]!.schema))).toEqual(keys);
  });

  it('nutzt nur den lokalen Modus', () => {
    expect(keystatic.storage.kind).toBe('local');
  });
});
