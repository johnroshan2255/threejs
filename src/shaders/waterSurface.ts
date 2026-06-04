import * as THREE from 'three';
import { FOG_COLOR, FOG_FAR, FOG_NEAR } from '../three/sceneFog';
import { WET_SAND_START_X } from '../terrain/beach';

export type WaterSurfaceUniforms = {
  uTime: { value: number };
  uSunDirection: { value: THREE.Vector3 };
  uDeepColor: { value: THREE.Color };
  uShallowColor: { value: THREE.Color };
  uShoreFadeStartX: { value: number };
  uShoreFadeWidth: { value: number };
  fogColor: { value: THREE.Color };
  fogNear: { value: number };
  fogFar: { value: number };
};

export function createWaterSurfaceMaterial(): THREE.ShaderMaterial {
  const uniforms: WaterSurfaceUniforms = {
    uTime: { value: 0 },
    uSunDirection: { value: new THREE.Vector3(0.4, 0.9, 0.35).normalize() },
    uDeepColor: { value: new THREE.Color(0x0c4a6e) },
    uShallowColor: { value: new THREE.Color(0x48b8c8) },
    uShoreFadeStartX: { value: WET_SAND_START_X + 10 },
    uShoreFadeWidth: { value: 16 },
    fogColor: { value: new THREE.Color(FOG_COLOR) },
    fogNear: { value: FOG_NEAR },
    fogFar: { value: FOG_FAR },
  };

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vFoam;

      void main() {
        vec3 pos = position;

        float w1 = sin(pos.x * 0.85 + uTime * 1.4) * 0.04;
        float w2 = sin(pos.y * 0.72 + uTime * 1.1) * 0.035;
        float w3 = sin((pos.x + pos.y) * 0.65 + uTime * 0.75) * 0.025;
        pos.z += w1 + w2 + w3;

        vec4 world = modelMatrix * vec4(pos, 1.0);
        vWorldPos = world.xyz;
        vFoam = 0.5 + 0.5 * sin(pos.x * 2.0 + pos.y * 1.6 + uTime * 1.8);

        vec3 n = normalize(vec3(
          -0.06 * cos(pos.x * 0.85 + uTime * 1.4),
          -0.05 * cos(pos.y * 0.72 + uTime * 1.1),
          1.0
        ));
        vNormal = normalize(normalMatrix * n);

        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDirection;
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform float uShoreFadeStartX;
      uniform float uShoreFadeWidth;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vFoam;

      void main() {
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 normal = normalize(vNormal);
        float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 2.5);

        float offshore = smoothstep(
          uShoreFadeStartX + 2.0,
          uShoreFadeStartX - uShoreFadeWidth,
          vWorldPos.x
        );

        vec3 wetSand = vec3(0.78, 0.7, 0.58);
        vec3 foam = vec3(0.94, 0.92, 0.86);

        vec3 water = mix(uDeepColor, uShallowColor, offshore * 0.9 + 0.08);
        water = mix(water, wetSand, (1.0 - offshore) * 0.72);

        float foamBand = smoothstep(
          uShoreFadeStartX + 1.0,
          uShoreFadeStartX - 5.0,
          vWorldPos.x
        );
        water = mix(water, foam, foamBand * vFoam * 0.35 * (1.0 - offshore * 0.5));

        float spec = pow(max(dot(reflect(-uSunDirection, normal), viewDir), 0.0), 56.0);
        vec3 color = water + vec3(0.85, 0.92, 1.0) * spec * 0.55 * offshore;

        float beachFade = smoothstep(
          uShoreFadeStartX,
          uShoreFadeStartX - uShoreFadeWidth * 0.85,
          vWorldPos.x
        );
        float alpha = offshore * mix(0.82, 0.94, fresnel);
        alpha *= beachFade;

        if (alpha < 0.03) discard;

        float dist = length(vWorldPos - cameraPosition);
        float fogT = smoothstep(fogNear, fogFar, dist);
        color = mix(color, fogColor, fogT);
        alpha *= 1.0 - fogT * 0.85;

        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -2,
    fog: true,
  });
}

export function updateWaterSurfaceMaterial(
  material: THREE.ShaderMaterial,
  timeSec: number,
  fogNear = FOG_NEAR,
  fogFar = FOG_FAR,
  fogColor?: THREE.Color
): void {
  material.uniforms.uTime!.value = timeSec;
  material.uniforms.fogNear!.value = fogNear;
  material.uniforms.fogFar!.value = fogFar;
  if (fogColor) {
    material.uniforms.fogColor!.value.copy(fogColor);
  }
}
