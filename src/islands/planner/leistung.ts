// Quality level of the 3D view ("leicht" = no shadows, no antialias, pixel ratio <= 1.25, 256 px textures).
// Pure function so the rule is testable; laden.ts feeds it from the browser.
//
// Why not "<= 4 cores" alone (Phase 5 a11y finding B4): many current office laptops report 4 logical cores
// and handle the planner's few draw calls well. Core count only decides at <= 2. The other signals target
// what actually limits the view: a software renderer (no GPU), a phone-sized or touch-only device (small GPU,
// battery, heat), little memory (navigator.deviceMemory, Chromium only, rounded to 0.25..8 GB).
export interface GeraeteInfo {
  webgl: boolean;
  softwareRenderer: boolean;
  /** Viewport at most 40rem wide. */
  schmal: boolean;
  /** Primary input is touch without hover (pointer: coarse and hover: none). */
  nurTouch: boolean;
  kerne?: number | undefined;
  speicherGb?: number | undefined;
}

export function istLeichtesGeraet(g: GeraeteInfo): boolean {
  if (!g.webgl || g.softwareRenderer) return true;
  if (g.schmal || g.nurTouch) return true;
  if (g.speicherGb !== undefined && g.speicherGb <= 4) return true;
  if (g.kerne !== undefined && g.kerne <= 2) return true;
  return false;
}
