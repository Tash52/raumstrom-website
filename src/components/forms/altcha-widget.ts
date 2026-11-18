// ALTCHA widget (self-hosted, MIT), loaded on demand by kontakt-formular.ts (backend-api).
// CSP: the "external" build ships without inline styles and without inline/blob workers. Styles come
// from altcha.css (bundled stylesheet), the PBKDF2 worker is a separate file from /_astro/ (worker-src
// 'self'). The widget only sets styles through the CSSOM (allowed under style-src without
// 'unsafe-inline'). No requests to third parties: the challenge comes from /api/altcha, the footer link
// is hidden, the human-interaction signature (behaviour collection) is switched off.
import 'altcha/external';
import 'altcha/i18n/de';
import 'altcha/altcha.css';
import './altcha-widget.css';
import Pbkdf2Worker from 'altcha/workers/pbkdf2?worker';

export const ALTCHA_URL = '/api/altcha';
const ALGORITHMUS = 'PBKDF2/SHA-256';

export interface AltchaElement extends HTMLElement {
  configure(options: Record<string, unknown>): void;
  reset(): void;
  verify(): Promise<{ payload?: string } | null>;
  getState(): string;
}

if (!globalThis.$altcha.algorithms.has(ALGORITHMUS)) {
  globalThis.$altcha.algorithms.set(ALGORITHMUS, () => new Pbkdf2Worker());
}

/** Creates <altcha-widget> in the mount point. The payload lands in the hidden field `name`. */
export function bindeAltchaEin(platz: HTMLElement, name: string): AltchaElement {
  const vorhanden = platz.querySelector('altcha-widget');
  if (vorhanden) return vorhanden as AltchaElement;
  const widget = document.createElement('altcha-widget') as AltchaElement;
  widget.setAttribute('challenge', ALTCHA_URL);
  widget.setAttribute('name', name);
  widget.setAttribute('language', 'de');
  widget.setAttribute('type', 'checkbox');
  widget.setAttribute('display', 'standard');
  // Starts the proof of work as soon as someone fills in the form; usually done before sending.
  widget.setAttribute('auto', 'onfocus');
  platz.append(widget);
  const konfiguriere = () =>
    widget.configure({ hideFooter: true, hideLogo: true, humanInteractionSignature: false, challenge: ALTCHA_URL, name, language: 'de', auto: 'onfocus' });
  if (typeof widget.configure === 'function') konfiguriere();
  else widget.addEventListener('load', konfiguriere, { once: true });
  return widget;
}
