// MaterialRef -> three.js material. Procedural canvas textures for patterns and structures, an optional
// CC0 detail texture multiplied in the shader (luminance only, normalised to its mean, so the chosen
// colour stays the average colour). Materials are cached by their normalised reference and disposed
// when no longer used for two rebuilds.
import * as THREE from 'three';
import type { MaterialRef } from '../../../lib/geometry/index.ts';
import { type Kategorie, STANDARD, materialVon, normalisiereRef, standardRef, stilVon } from '../../../lib/materials/index.ts';
import { zeichneOberflaeche } from '../gestalten/zeichnen.ts';
import { DETAIL_MITTEL, ladeDetail } from './texturen.ts';

const WEISS = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
WEISS.needsUpdate = true;

interface Eintrag {
  mat: THREE.MeshStandardMaterial;
  texturen: THREE.Texture[];
  runde: number;
}

/** Inject the detail texture into MeshStandardMaterial (uv in metres, transformed by detailMatrix). */
function mitDetail(mat: THREE.MeshStandardMaterial, uniforms: Record<string, THREE.IUniform>) {
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform mat3 detailMatrix;\nvarying vec2 vDetailUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvDetailUv = (detailMatrix * vec3(uv, 1.0)).xy;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D detailMap;\nuniform float detailStaerke;\nuniform float detailMittel;\nvarying vec2 vDetailUv;')
      .replace(
        '#include <map_fragment>',
        '#include <map_fragment>\nfloat detailL = dot(texture2D(detailMap, vDetailUv).rgb, vec3(0.2126, 0.7152, 0.0722)) / detailMittel;\ndiffuseColor.rgb *= mix(1.0, clamp(detailL, 0.25, 2.2), detailStaerke);',
      );
  };
  mat.customProgramCacheKey = () => 'raumstrom-detail';
}

export class MaterialCache {
  private karte = new Map<string, Eintrag>();
  private runde = 0;

  private renderer: THREE.WebGLRenderer;
  private leicht: boolean;
  private neuZeichnen: () => void;

  constructor(renderer: THREE.WebGLRenderer, leicht: boolean, neuZeichnen: () => void) {
    this.renderer = renderer;
    this.leicht = leicht;
    this.neuZeichnen = neuZeichnen;
  }

  beginne(): void {
    this.runde++;
  }

  /** Material for a reference in a category; extra rotation in degrees (e.g. none). */
  hole(ref: MaterialRef | null, kategorie: Kategorie): THREE.MeshStandardMaterial {
    const norm = normalisiereRef(ref ?? standardRef(STANDARD[kategorie]), kategorie)!;
    const key = `${kategorie}|${JSON.stringify(norm)}`;
    const alt = this.karte.get(key);
    if (alt) {
      alt.runde = this.runde;
      return alt.mat;
    }
    const e = this.baue(norm);
    e.runde = this.runde;
    this.karte.set(key, e);
    return e.mat;
  }

  /** Door leaf material for a style (panels drawn on the leaf faces) and colour. */
  holeTuer(stil: string | undefined, farbe: string | undefined): THREE.MeshStandardMaterial {
    const s = stil ?? 'tuer.glatt';
    const f = farbe ?? stilVon(s)?.farbe ?? '#f4f2ee';
    const key = `tuer|${s}|${f}`;
    const alt = this.karte.get(key);
    if (alt) {
      alt.runde = this.runde;
      return alt.mat;
    }
    let mat: THREE.MeshStandardMaterial;
    const texturen: THREE.Texture[] = [];
    if (s === 'tuer.ganzglas') {
      mat = new THREE.MeshStandardMaterial({ color: f, roughness: 0.1, transparent: true, opacity: 0.45, depthWrite: false });
    } else {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 256;
      const ctx = c.getContext('2d')!;
      ctx.fillStyle = f;
      ctx.fillRect(0, 0, 128, 256);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 3;
      if (s === 'tuer.kassette') {
        ctx.strokeRect(20, 20, 88, 95);
        ctx.strokeRect(20, 135, 88, 100);
      } else if (s === 'tuer.landhaus') {
        for (const [y, h] of [[18, 60], [92, 60], [166, 70]] as const) ctx.strokeRect(18, y, 92, h);
      } else if (s === 'tuer.lisenen') {
        for (const y of [60, 110, 160, 210]) {
          ctx.beginPath();
          ctx.moveTo(12, y);
          ctx.lineTo(116, y);
          ctx.stroke();
        }
      } else if (s === 'tuer.holz') {
        ctx.globalAlpha = 0.25;
        for (let i = 0; i < 18; i++) {
          ctx.beginPath();
          ctx.moveTo(7 * i + 3, 0);
          ctx.bezierCurveTo(7 * i + 6, 80, 7 * i, 170, 7 * i + 4, 256);
          ctx.stroke();
        }
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      texturen.push(tex);
      mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 });
    }
    this.karte.set(key, { mat, texturen, runde: this.runde });
    return mat;
  }

  private baue(ref: MaterialRef): Eintrag {
    const m = materialVon(ref.material)!;
    const d = m.darstellung;
    const farbe = ref.farbe ?? m.standard.farbe ?? '#eeeeee';
    const texturen: THREE.Texture[] = [];
    const bild = zeichneOberflaeche(ref, this.leicht ? 128 : 256, this.leicht ? 512 : 1024);
    const mat = new THREE.MeshStandardMaterial({ roughness: d.rauheit, metalness: d.metall ?? 0 });
    const drehung = THREE.MathUtils.degToRad((bild?.drehungGrad ?? 0) + (ref.richtungGrad ?? 0));
    if (bild) {
      const tex = new THREE.CanvasTexture(bild.canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1 / bild.breite, 1 / bild.hoehe);
      tex.rotation = drehung;
      tex.anisotropy = this.leicht ? 1 : Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      texturen.push(tex);
      mat.map = tex;
      if (bild.relief && !this.leicht) {
        mat.bumpMap = tex;
        mat.bumpScale = 1.2;
      }
    } else mat.color.set(farbe);
    if (d.textur) {
      const groesse = d.texturGroesse ?? 1.5;
      const uniforms: Record<string, THREE.IUniform> = {
        detailMap: { value: WEISS },
        detailStaerke: { value: 0 },
        detailMittel: { value: DETAIL_MITTEL[d.textur] },
        detailMatrix: { value: new THREE.Matrix3().setUvTransform(0, 0, 1 / groesse, 1 / groesse, drehung, 0, 0) },
      };
      mitDetail(mat, uniforms);
      void ladeDetail(d.textur, this.renderer, this.leicht).then((tex) => {
        if (!tex) return;
        uniforms.detailMap!.value = tex;
        uniforms.detailStaerke!.value = d.texturStaerke ?? 0.5;
        this.neuZeichnen();
      });
    }
    return { mat, texturen, runde: this.runde };
  }

  /** Dispose materials not used in the last two rebuilds. */
  aufraeumen(): void {
    for (const [k, e] of this.karte) {
      if (this.runde - e.runde < 2) continue;
      e.mat.dispose();
      for (const t of e.texturen) t.dispose();
      this.karte.delete(k);
    }
  }

  get anzahl(): number {
    return this.karte.size;
  }

  dispose(): void {
    for (const e of this.karte.values()) {
      e.mat.dispose();
      for (const t of e.texturen) t.dispose();
    }
    this.karte.clear();
  }
}
