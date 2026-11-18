// Navigation entries (Briefing Abschnitt 6). Content can be adjusted by page-builder.
// Only links to pages that exist in src/pages are rendered, so the build never links to a 404
// (the E2E crawl fails on broken links). New pages appear automatically.

export interface NavEintrag {
  href: string;
  text: string;
}

export const HAUPTNAVIGATION: NavEintrag[] = [
  { href: '/fuer-zuhause/', text: 'Für Zuhause' },
  { href: '/fuer-unternehmen/', text: 'Für Unternehmen' },
  { href: '/leistungen/', text: 'Leistungen' },
  { href: '/raumplaner/', text: 'Raumplaner' },
  { href: '/referenzen/', text: 'Referenzen' },
  { href: '/ueber-uns/', text: 'Über uns' },
];

/** Primary call to action in header and menu (one label for the "contact" intent site-wide). */
export const ANFRAGE: NavEintrag = { href: '/kontakt/', text: 'Anfrage stellen' };

export const RECHTLICHES: NavEintrag[] = [
  { href: '/impressum/', text: 'Impressum' },
  { href: '/datenschutz/', text: 'Datenschutz' },
  { href: '/agb/', text: 'AGB' },
  { href: '/widerruf/', text: 'Widerruf' },
  { href: '/cookie-einstellungen/', text: 'Cookie-Einstellungen' },
  { href: '/barrierefreiheit/', text: 'Barrierefreiheit' },
];

const seiten = Object.keys(import.meta.glob('/src/pages/**/*.{astro,md,mdx}'));

/** Route of a page file, e.g. /src/pages/leistungen/index.astro -> /leistungen/ */
export function routeVon(datei: string): string {
  const pfad = datei
    .replace(/^\/src\/pages/, '')
    .replace(/\.(astro|md|mdx)$/, '')
    .replace(/\/index$/, '');
  return `${pfad}/`.replace(/\/+/g, '/');
}

const routen = new Set(seiten.map(routeVon));

export function existiert(href: string): boolean {
  return routen.has(href);
}

export function nurVorhandene(eintraege: NavEintrag[]): NavEintrag[] {
  return eintraege.filter((e) => existiert(e.href));
}

/** aria-current for the active entry (exact page or a sub page). */
export function istAktiv(href: string, pfad: string): boolean {
  return href === '/' ? pfad === '/' : pfad === href || pfad.startsWith(href);
}
