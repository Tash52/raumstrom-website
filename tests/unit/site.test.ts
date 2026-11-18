import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { siteConfig } from '../../server/site.mjs';
import { htmlFileFor, indexierbar, isNoindexHtml } from '../../scripts/lib/noindex.mjs';

describe('siteConfig (site + security.allowedDomains)', () => {
  it('Domain aus firma.yaml, https, mit www', () => {
    const c = siteConfig({ domain: 'raumstrom.de' });
    expect(c.site).toBe('https://raumstrom.de');
    expect(c.allowedDomains).toEqual([
      { hostname: 'raumstrom.de', protocol: 'https' },
      { hostname: 'www.raumstrom.de', protocol: 'https' },
    ]);
    expect(c.problems).toEqual([]);
  });

  it('SITE_URL überschreibt, Staging erlaubt localhost', () => {
    const c = siteConfig({ domain: 'raumstrom.de', siteUrl: 'https://staging.raumstrom.de', staging: true });
    expect(c.site).toBe('https://staging.raumstrom.de');
    expect(c.allowedDomains.map((d) => d.hostname)).toEqual(['staging.raumstrom.de', 'localhost', '127.0.0.1']);
    expect(siteConfig({ domain: 'raumstrom.de' }).allowedDomains.some((d) => d.hostname === 'localhost')).toBe(false);
  });

  it.each([
    ['http://raumstrom.de', /https/],
    ['https://localhost', /localhost/],
    ['https://raumstrom.de/pfad', /Protokoll und Host/],
    ['kein url', /gültige URL/],
  ])('meldet %s', (siteUrl, msg) => {
    expect(siteConfig({ domain: 'raumstrom.de', siteUrl }).problems.join(' ')).toMatch(msg);
  });
});

describe('Sitemap ohne noindex-Seiten', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'noindex-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const client = pathToFileURL(dir + path.sep);
  mkdirSync(path.join(dir, 'kontakt/danke'), { recursive: true });
  writeFileSync(path.join(dir, 'index.html'), '<head><meta name="description" content="noindex im Text"></head>');
  writeFileSync(path.join(dir, 'kontakt/danke/index.html'), '<head><meta content="noindex, nofollow" name="robots"></head>');

  it('erkennt robots-noindex in beliebiger Attributreihenfolge', () => {
    expect(isNoindexHtml('<meta name="robots" content="noindex">')).toBe(true);
    expect(isNoindexHtml("<meta content='noindex,follow' name='robots'>")).toBe(true);
    expect(isNoindexHtml('<meta name="robots" content="index, follow">')).toBe(false);
    expect(isNoindexHtml('<meta name="description" content="noindex">')).toBe(false);
  });

  it('filtert nach gebautem HTML, fehlende Seiten fallen heraus', () => {
    expect(htmlFileFor(client, 'https://raumstrom.de/kontakt/danke/').pathname).toMatch(/kontakt\/danke\/index\.html$/);
    expect(indexierbar(client, 'https://raumstrom.de/')).toBe(true);
    expect(indexierbar(client, 'https://raumstrom.de/kontakt/danke/')).toBe(false);
    expect(indexierbar(client, 'https://raumstrom.de/gibt-es-nicht/')).toBe(false);
  });
});
