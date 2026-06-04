import * as THREE from 'three';
import type { ChunkGrassCrushMap } from '../terrain/grassCrushMap';
import {
  GRASS_CRUSH_GROW_SEC,
  GRASS_CRUSH_RECOVER_SEC,
} from '../terrain/grassCrushMap';
import { CHUNK_SIZE } from '../terrain/chunkConfig';

export type GrassShaderUniforms = {
  time: { value: number };
  ballPosition: { value: THREE.Vector3 };
  grassWindScale: { value: number };
  crushMap: { value: THREE.DataTexture };
  crushMapOrigin: { value: THREE.Vector2 };
  crushMapSize: { value: number };
  recoverSeconds: { value: number };
  growSeconds: { value: number };
};

export function createGrassShaderUniforms(
  crushMap: ChunkGrassCrushMap
): GrassShaderUniforms {
  return {
    time: { value: 0 },
    ballPosition: { value: new THREE.Vector3() },
    grassWindScale: { value: 1 },
    crushMap: { value: crushMap.texture },
    crushMapOrigin: {
      value: new THREE.Vector2(crushMap.originX, crushMap.originZ),
    },
    crushMapSize: { value: CHUNK_SIZE },
    recoverSeconds: { value: GRASS_CRUSH_RECOVER_SEC },
    growSeconds: { value: GRASS_CRUSH_GROW_SEC },
  };
}

function grassTrailGlsl(): string {
  return `
    float grassTrailHide(vec2 bladeXZ, out float trailAge) {
      vec2 uv = (bladeXZ - crushMapOrigin) / crushMapSize;
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        trailAge = 0.0;
        return 0.0;
      }

      float crushTime = texture2D(crushMap, uv).r;
      if (crushTime <= 0.0) {
        trailAge = 0.0;
        return 0.0;
      }

      trailAge = time - crushTime;
      if (trailAge < recoverSeconds) {
        return 1.0;
      }

      return 1.0 - smoothstep(
        recoverSeconds,
        recoverSeconds + growSeconds,
        trailAge
      );
    }
  `;
}

type GrassMaterial = THREE.MeshLambertMaterial | THREE.MeshStandardMaterial;

export function applyGrassWind(material: GrassMaterial, crushMap: ChunkGrassCrushMap) {
  material.customProgramCacheKey = () => 'grassWind_v11_weather';

  material.onBeforeCompile = (shader) => {
    const uniforms = createGrassShaderUniforms(crushMap);
    Object.assign(shader.uniforms, uniforms);
    material.userData.shader = shader;
    material.userData.crushMap = crushMap;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
        #include <common>

        uniform float time;
        uniform vec3 ballPosition;
        uniform float grassWindScale;
        uniform sampler2D crushMap;
        uniform vec2 crushMapOrigin;
        uniform float crushMapSize;
        uniform float recoverSeconds;
        uniform float growSeconds;

        varying vec3 vWorldPos;
        varying float vHide;
        varying float vBladeT;
        ${grassTrailGlsl()}
        `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
        #include <begin_vertex>

        float wind =
          sin(time * 3.0 + position.y * 7.0);

        transformed.x += wind * 0.025 * grassWindScale * uv.y;
        transformed.z += wind * 0.02 * grassWindScale * uv.y;

        vec3 bladePos = vec3(
          instanceMatrix[3][0],
          instanceMatrix[3][1],
          instanceMatrix[3][2]
        );

        float dist = distance(bladePos.xz, ballPosition.xz);

        float influence =
          1.0 - smoothstep(0.0, 1.0, dist);

        vec2 dir = normalize(bladePos.xz - ballPosition.xz);

        transformed.x += dir.x * influence * 0.1 * uv.y;
        transformed.z += dir.y * influence * 0.1 * uv.y;

        float trailAge;
        float hide = grassTrailHide(bladePos.xz, trailAge);
        float height = uv.y;
        float bed = 1.0 - height;

        transformed.x *= 1.0 + bed * bed * 0.5;
        transformed.z *= 1.0 + bed * bed * 0.5;

        transformed.y *= 1.0 - hide * height;
        transformed.x *= 1.0 - hide * 0.15;
        transformed.z *= 1.0 - hide * 0.15;

        vec4 worldPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vWorldPos = worldPos.xyz;
        vHide = hide;
        vBladeT = uv.y;
        `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
        #include <common>

        uniform vec3 ballPosition;
        uniform sampler2D crushMap;
        uniform vec2 crushMapOrigin;
        uniform float crushMapSize;
        uniform float recoverSeconds;
        uniform float growSeconds;
        uniform float time;

        varying vec3 vWorldPos;
        varying float vHide;
        varying float vBladeT;
        ${grassTrailGlsl()}
        `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `
        float t = clamp(vBladeT, 0.0, 1.0);
        float tShade = pow(t, 0.28);

        vec3 grassRoot = vec3(0.002, 0.003, 0.002);
        vec3 grassLow = vec3(0.03, 0.07, 0.04);
        vec3 grassMid = vec3(0.1, 0.24, 0.09);
        vec3 grassTip = vec3(0.44, 0.72, 0.26);

        vec3 grassColor = mix(
          mix(mix(grassRoot, grassLow, smoothstep(0.0, 0.28, tShade)), grassMid, smoothstep(0.15, 0.62, tShade)),
          grassTip,
          smoothstep(0.42, 1.0, tShade)
        );

        diffuseColor = vec4(grassColor, 1.0);
        `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
        float h = clamp(vBladeT, 0.0, 1.0);
        float baseShade = mix(0.02, 1.0, pow(h, 0.3));
        float bedDark = mix(0.015, 1.0, smoothstep(0.0, 0.58, h));
        outgoingLight *= baseShade * bedDark;

        float carShade = smoothstep(2.2, 0.0, distance(vWorldPos.xz, ballPosition.xz));
        outgoingLight *= mix(1.0, 0.55, carShade * 0.5);

        float trailAge;
        float hide = max(vHide, grassTrailHide(vWorldPos.xz, trailAge));
        if (hide > 0.98) discard;
        outgoingLight *= 1.0 - hide * 0.35;

        #include <opaque_fragment>
        `
    );
  };
}

export function updateGrassShaderUniforms(
  material: GrassMaterial,
  carCenter: THREE.Vector3,
  timeSec: number,
  grassWindScale = 1
) {
  const shader = material.userData.shader as
    | { uniforms: GrassShaderUniforms }
    | undefined;

  if (!shader) return;

  const crushMap = material.userData.crushMap as ChunkGrassCrushMap | undefined;

  shader.uniforms.time.value = timeSec;
  shader.uniforms.ballPosition.value.copy(carCenter);
  shader.uniforms.grassWindScale.value = grassWindScale;

  if (crushMap) {
    shader.uniforms.crushMap.value = crushMap.texture;
    shader.uniforms.crushMapOrigin.value.set(crushMap.originX, crushMap.originZ);
  }
}
