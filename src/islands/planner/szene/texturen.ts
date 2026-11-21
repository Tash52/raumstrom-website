// CC0 detail textures (public/textures/, see QUELLEN.md): WebP, loaded on demand per category
// (holz, marmor, beton, putz), 512 px on desktop, 256 px on mobile; mipmaps are generated on the GPU.
// Why not KTX2/Basis: three's Basis transcoder (Emscripten/embind) evaluates strings as code inside its
// worker, which the strict CSP (no 'unsafe-eval') blocks; see docs/agent-reports/5-planner-design.md.
import * as THREE from 'three';
import type { Textur } from '../../../lib/materials/index.ts';

const DATEI: Record<Textur, string> = { holz: 'holz-eiche', marmor: 'marmor', beton: 'beton', putz: 'putz' };

/** Mean linear luminance of each texture (QUELLEN.md), used to keep the chosen colour on average. */
export const DETAIL_MITTEL: Record<Textur, number> = { holz: 0.234, marmor: 0.35, beton: 0.054, putz: 0.247 };

const lader = new THREE.TextureLoader();
const cache = new Map<string, Promise<THREE.Texture | null>>();

/** Detail texture (shared, never disposed while the planner runs). Resolves to null on errors. */
export function ladeDetail(t: Textur, renderer: THREE.WebGLRenderer, leicht: boolean): Promise<THREE.Texture | null> {
  const url = `/textures/${DATEI[t]}-${leicht ? 256 : 512}.webp`;
  let p = cache.get(url);
  if (!p) {
    p = lader
      .loadAsync(url)
      .then((tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = leicht ? 1 : Math.min(4, renderer.capabilities.getMaxAnisotropy());
        return tex;
      })
      .catch(() => null);
    cache.set(url, p);
  }
  return p;
}
