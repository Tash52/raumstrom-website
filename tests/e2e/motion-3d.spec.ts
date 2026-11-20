// motion-3d (Phase 3): fallbacks (reduced motion, no WebGL, weak device), lazy 3D, keyboard use of
// slider and journey, pause switch, zero foreign requests and no CSP violations with 3D running.
import { expect, test, type Page } from '@playwright/test';

const BASE_HOST = '127.0.0.1';

/** Collect CSP violations and foreign requests for the whole test. */
async function beobachten(page: Page) {
  const fremd: string[] = [];
  const csp: string[] = [];
  page.on('request', (r) => {
    const u = new URL(r.url());
    if (!['http:', 'https:'].includes(u.protocol)) return;
    if (u.hostname !== BASE_HOST) fremd.push(r.url());
  });
  page.on('console', (m) => {
    if (/Content Security Policy|Refused to/i.test(m.text())) csp.push(m.text());
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      (window as unknown as { __csp: string[] }).__csp ??= [];
      (window as unknown as { __csp: string[] }).__csp.push(`${e.violatedDirective} ${e.blockedURI}`);
    });
  });
  return {
    fremd,
    csp,
    async cspImDokument() {
      return page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp ?? []);
    },
  };
}

async function heroZustand(page: Page) {
  return page.locator('[data-hero]').getAttribute('data-hero-zustand');
}

test.describe('Motion und 3D', () => {
  test('Reduced Motion: Standbild (vollständig geöffnete Wand), kein WebGL, Linien statisch', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    const hero = page.locator('[data-hero]');
    await expect(hero).toHaveAttribute('data-hero-zustand', 'poster');
    await expect(hero).toHaveAttribute('data-hero-grund', 'reduzierte-bewegung');
    await expect(page.locator('canvas')).toHaveCount(0);
    // <source media="(prefers-reduced-motion: reduce)"> picks the fully opened wall
    const src = await hero.locator('img').evaluate((img: HTMLImageElement) => img.currentSrc);
    expect(src).toContain('hero-komplett');
    // No GSAP: section cables keep their full static drawing
    const linie = page.locator('[data-leitung]').first();
    expect(await linie.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
    await expect(page.locator('html')).not.toHaveClass(/leitung-aktiv/);
    await expect(page.locator('[data-journey]')).toHaveAttribute('data-journey-zustand', 'statisch');
    for (const a of await page.locator('[data-journey-panel] a').all()) await expect(a).toBeVisible();
    await expect(page.locator('[data-motion-pause]').first()).toBeHidden();
  });

  test('Ohne WebGL: Standbild bleibt, Inhalte vollständig', async ({ page }) => {
    await page.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, typ: string, ...rest: unknown[]) {
        if (/webgl/i.test(typ)) return null;
        return (orig as (...a: unknown[]) => unknown).call(this, typ, ...rest);
      } as typeof orig;
    });
    await page.goto('/?3d=erzwingen');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000);
    const hero = page.locator('[data-hero]');
    await expect(hero).toHaveAttribute('data-hero-zustand', 'poster');
    await expect(hero).toHaveAttribute('data-hero-grund', 'kein-webgl');
    await expect(page.locator('canvas')).toHaveCount(0);
    await expect(hero.locator('img')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[data-journey-panel] h3')).toHaveCount(3);
  });

  test('Schwaches Gerät (2 Kerne): kein 3D', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => 2 }));
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    await expect(page.locator('[data-hero]')).toHaveAttribute('data-hero-grund', 'schwaches-geraet:kerne');
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('3D-Hero: lädt nach dem Laden, 0 Fremd-Requests, keine CSP-Verstöße, Pause schaltbar und gespeichert', async ({ page }) => {
    test.slow();
    const b = await beobachten(page);
    await page.goto('/?3d=erzwingen');
    await expect.poll(() => heroZustand(page), { timeout: 30_000 }).toBe('3d');
    await expect(page.locator('[data-hero] canvas')).toHaveCount(1);
    const pause = page.locator('[data-hero] [data-motion-pause]');
    await expect(pause).toBeVisible();
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
    await pause.click();
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveClass(/bewegung-pausiert/);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/bewegung-pausiert/);
    await expect(page.locator('[data-hero] [data-motion-pause]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('[data-hero] [data-motion-pause]').click();
    // Scroll through the page (journey, slider, cables)
    for (let i = 0; i < 30; i++) await page.mouse.wheel(0, 500);
    await page.waitForTimeout(1500);
    expect(b.fremd).toEqual([]);
    expect(b.csp).toEqual([]);
    expect(await b.cspImDokument()).toEqual([]);
  });

  test('Software-Renderer (SwiftShader/llvmpipe): Standbild statt 3D', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', { get: () => 8 });
      const echt = WebGL2RenderingContext.prototype.getParameter;
      WebGL2RenderingContext.prototype.getParameter = function (this: WebGL2RenderingContext, p: number) {
        // UNMASKED_RENDERER_WEBGL (0x9246) and RENDERER report a CPU rasteriser, whatever the runner has
        if (p === 0x9246 || p === this.RENDERER) return 'llvmpipe (LLVM 15.0.7, 256 bits)';
        return echt.call(this, p);
      } as typeof echt;
    });
    await page.goto('/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(3500);
    const hero = page.locator('[data-hero]');
    await expect(hero).toHaveAttribute('data-hero-zustand', 'poster');
    await expect(hero).toHaveAttribute('data-hero-grund', 'software-renderer');
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('Pause stoppt die Render-Schleife (keine Draw-Calls mehr), Fortsetzen startet sie wieder', async ({ page }) => {
    test.slow();
    await page.addInitScript(() => {
      const w = window as unknown as { __draws: number };
      w.__draws = 0;
      const proto = WebGL2RenderingContext.prototype as unknown as Record<string, (...a: unknown[]) => unknown>;
      for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
        const echt = proto[name]!;
        proto[name] = function (this: unknown, ...a: unknown[]) {
          w.__draws++;
          return echt.apply(this, a);
        };
      }
    });
    await page.goto('/?3d=erzwingen');
    await expect.poll(() => heroZustand(page), { timeout: 30_000 }).toBe('3d');
    const draws = () => page.evaluate(() => (window as unknown as { __draws: number }).__draws);
    const pause = page.locator('[data-hero] [data-motion-pause]');
    // Running: the cable pulse renders continuously
    const a = await draws();
    await page.waitForTimeout(1000);
    expect(await draws()).toBeGreaterThan(a);
    // Keyboard, not the mouse: pointer moves would (legitimately) render the parallax easing
    await pause.focus();
    await page.keyboard.press('Enter');
    await expect(pause).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(1000); // last easing frames settle
    const b = await draws();
    await page.waitForTimeout(2000);
    expect(await draws()).toBe(b);
    await page.keyboard.press('Enter');
    await expect(pause).toHaveAttribute('aria-pressed', 'false');
    await page.waitForTimeout(1000);
    expect(await draws()).toBeGreaterThan(b);
  });

  test('Seiten ohne 3D laden keinen 3D-Chunk', async ({ page }) => {
    const js: number[] = [];
    page.on('response', async (r) => {
      if (r.url().endsWith('.js')) js.push(Number(r.headers()['content-length'] ?? (await r.body()).length));
    });
    await page.goto('/leistungen/trockenbau/');
    await page.waitForLoadState('load');
    await page.waitForTimeout(1500);
    // three.js + R3F chunk is several hundred KB; nothing of that size may arrive here
    expect(Math.max(0, ...js)).toBeLessThan(200_000);
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('Slider: Tastatur (Pfeiltasten) wechselt Vorher / Hinter der Wand / Nachher', async ({ page }) => {
    await page.goto('/');
    const slider = page.locator('[data-wslider]');
    await slider.scrollIntoViewIfNeeded();
    const vorher = slider.getByRole('radio', { name: 'Vorher' });
    await vorher.focus();
    await expect(vorher).toBeChecked();
    await page.keyboard.press('ArrowRight');
    await expect(slider.getByRole('radio', { name: 'Hinter der Wand' })).toBeChecked();
    await expect(slider.locator('.wslider-satz[data-zustand="1"]')).toBeVisible();
    await page.keyboard.press('ArrowRight');
    await expect(slider.getByRole('radio', { name: 'Nachher' })).toBeChecked();
    await expect(slider.locator('.wslider-satz[data-zustand="2"]')).toBeVisible();
    await expect(slider.locator('.wslider-satz[data-zustand="0"]')).toBeHidden();
  });

  test('Slider funktioniert ohne JavaScript', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/');
    const slider = page.locator('[data-wslider]');
    await slider.getByRole('radio', { name: 'Nachher' }).check();
    await expect(slider.locator('.wslider-satz[data-zustand="2"]')).toBeVisible();
    await ctx.close();
  });

  test('Journey (Desktop): gepinnt, 3D erst nahe der Sichtweite, Tastaturfokus holt das Panel', async ({ page }, info) => {
    test.skip(info.project.name === 'mobile', 'Auf Mobilgeräten statische Karten');
    test.slow();
    await page.goto('/?3d=erzwingen');
    const j = page.locator('[data-journey]');
    await expect(j).toHaveAttribute('data-journey-zustand', 'gepinnt', { timeout: 15_000 });
    await page.waitForTimeout(2500);
    // Far below the fold: no journey canvas yet
    await expect(j.locator('canvas')).toHaveCount(0);
    await j.scrollIntoViewIfNeeded();
    await expect(j).toHaveAttribute('data-journey-zustand', '3d', { timeout: 30_000 });
    // Focus a link in the last panel: the journey scrolls it into place
    const letzter = j.locator('[data-journey-panel]').last();
    await letzter.locator('a').first().focus();
    await expect(letzter).toHaveClass(/ist-aktiv/, { timeout: 5_000 });
    await expect(letzter.locator('a').first()).toBeInViewport({ timeout: 5_000 });
  });

  test('Mobil: Journey als statische Karten mit Standbildern', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile', 'nur Mobil');
    await page.goto('/');
    const j = page.locator('[data-journey]');
    await j.scrollIntoViewIfNeeded();
    await expect(j).toHaveAttribute('data-journey-zustand', 'statisch');
    await expect(j.locator('.journey-panel-bild img').first()).toBeVisible();
  });

  test('Prozess-Leitung: alle Schritte vorhanden, Knoten schalten beim Scrollen ein', async ({ page }) => {
    await page.goto('/leistungen/komplettrenovierung/');
    const p = page.locator('[data-prozess]');
    await expect(p).toHaveClass(/prozess-aktiv/, { timeout: 10_000 });
    const schritte = p.locator('[data-prozess-schritt]');
    expect(await schritte.count()).toBeGreaterThan(1);
    await schritte.last().scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 400);
    await expect(schritte.first()).toHaveClass(/ist-an/, { timeout: 5_000 });
  });
});
