// CC0 detail textures (public/textures/, see QUELLEN.md): KTX2/Basis, loaded on demand per category
// (holz, marmor, beton, putz), 512 px on desktop, 256 px on mobile. The KTX2 loader and its transcoder
// (/basis/, self-hosted) are only fetched when the first material needs a texture.
import * as THREE from 'three';
import type { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import type { Textur } from '../../../lib/materials/index.ts';

const DATEI: Record<Textur, string> = { holz: 'holz-eiche', marmor: 'marmor', beton: 'beton', putz: 'putz' };

/** Mean linear luminance of each texture (QUELLEN.md), used to keep the chosen colour on average. */
export const DETAIL_MITTEL: Record<Textur, number> = { holz: 0.234, marmor: 0.35, beton: 0.054, putz: 0.247 };

let lader: Promise<KTX2Loader> | null = null;
const cache = new Map<string, Promise<THREE.Texture | null>>();

function holeLader(renderer: THREE.WebGLRenderer): Promise<KTX2Loader> {
  lader ??= import('three/addons/loaders/KTX2Loader.js').then(({ KTX2Loader }) => {
    const l = new KTX2Loader();
    l.setTranscoderPath('/basis/');
    l.setWorkerLimit(1);
    l.detectSupport(renderer);
    return l;
  });
  return lader;
}

/** Detail texture (shared, never disposed while the planner runs). Resolves to null on errors. */
export function ladeDetail(t: Textur, renderer: THREE.WebGLRenderer, leicht: boolean): Promise<THREE.Texture | null> {
  const url = `/textures/${DATEI[t]}-${leicht ? 256 : 512}.ktx2`;
  let p = cache.get(url);
  if (!p) {
    p = holeLader(renderer)
      .then((l) => l.loadAsync(url))
      .then((tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.anisotropy = leicht ? 1 : Math.min(4, renderer.capabilities.getMaxAnisotropy());
        return tex as THREE.Texture;
      })
      .catch(() => null);
    cache.set(url, p);
  }
  return p;
}

/** Number of textures requested so far (tests: lazy loading per category). */
export const geladeneTexturen = () => [...cache.keys()];
