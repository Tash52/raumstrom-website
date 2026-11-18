import { describe, expect, it } from 'vitest';
import { collect, exceptionFor, isAllowed } from '../../scripts/licenses.mjs';

describe('Lizenzprüfung', () => {
  it('bewertet SPDX-Ausdrücke', () => {
    expect(isAllowed('MIT')).toBe(true);
    expect(isAllowed('(MIT OR GPL-3.0)')).toBe(true);
    expect(isAllowed('MIT AND LGPL-3.0-or-later')).toBe(false);
    expect(isAllowed('GPL-3.0')).toBe(false);
    expect(isAllowed('')).toBe(false);
  });
  it('kennt die freigegebenen Ausnahmen', () => {
    for (const n of ['gsap', 'sharp', '@img/sharp-libvips-linux-x64', 'libheif-js', '@axe-core/playwright', 'axe-core']) expect(exceptionFor(n), n).toBeDefined();
    expect(exceptionFor('left-pad')).toBeUndefined();
  });
  it('alle installierten Pakete sind erlaubt oder dokumentiert', () => {
    expect(collect().filter((r) => !r.ok)).toEqual([]);
  });
});
