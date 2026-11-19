// Shader for the live cable (hero and journey): drawn up to uZeichnen along the tube, with current
// pulses flowing towards the end. Core tube is opaque, the sheath variant is an additive glow.
import { AdditiveBlending, Color, NormalBlending, ShaderMaterial } from 'three';

export const FARBE = {
  strom: '#c5f01e',
  kabelgruen: '#3d6300',
  graphit: '#15191e',
  graphit2: '#232a31',
  kalk: '#f4f1eb',
  kalkTief: '#e8e3d8',
  putz: '#c9c3b6',
} as const;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  uniform float uZeit;
  uniform float uZeichnen;
  uniform float uHuelle;
  uniform float uStaerke;
  uniform vec3 uKern;
  uniform vec3 uStrom;
  varying vec2 vUv;

  void main() {
    if (vUv.x > uZeichnen) discard;
    float puls = smoothstep(0.78, 1.0, fract(vUv.x * 3.0 - uZeit * 0.45));
    float kopf = (1.0 - smoothstep(0.0, 0.08, uZeichnen - vUv.x)) * step(uZeichnen, 0.995);
    float energie = max(puls, kopf);
    if (uHuelle > 0.5) {
      float rand = pow(abs(sin(vUv.y * 3.14159)), 2.0);
      gl_FragColor = vec4(uStrom, uStaerke * rand * (0.18 + 0.5 * energie));
    } else {
      float rund = 0.62 + 0.38 * sin(vUv.y * 6.28318 + 1.2);
      vec3 farbe = mix(uKern, uStrom, 0.6 + 0.4 * energie) * rund;
      gl_FragColor = vec4(farbe + uStrom * 0.35 * energie, 1.0);
    }
    #include <colorspace_fragment>
  }
`;

export function kabelMaterial(huelle: boolean, staerke = 1): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uZeit: { value: 0 },
      uZeichnen: { value: 1 },
      uHuelle: { value: huelle ? 1 : 0 },
      uStaerke: { value: staerke },
      uKern: { value: new Color(FARBE.kabelgruen) },
      uStrom: { value: new Color(FARBE.strom) },
    },
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: huelle,
    depthWrite: !huelle,
    blending: huelle ? AdditiveBlending : NormalBlending,
  });
}
