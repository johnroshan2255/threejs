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

export function applyGrassWind(
  material: THREE.MeshStandardMaterial,
  crushMap: ChunkGrassCrushMap
) {
  material.customProgramCacheKey = () => 'grassWind_v4_trail';

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
        uniform sampler2D crushMap;
        uniform vec2 crushMapOrigin;
        uniform float crushMapSize;
        uniform float recoverSeconds;
        uniform float growSeconds;

        varying vec3 vWorldPos;
        varying float vHide;
        ${grassTrailGlsl()}
        `
    );

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
        #include <begin_vertex>

        float wind =
          sin(time * 3.0 + position.y * 7.0);

        transformed.x += wind * 0.025 * uv.y;
        transformed.z += wind * 0.02 * uv.y;

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

        transformed.y *= 1.0 - hide * height;
        transformed.x *= 1.0 - hide * 0.15;
        transformed.z *= 1.0 - hide * 0.15;

        vec4 worldPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vWorldPos = worldPos.xyz;
        vHide = hide;
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
        ${grassTrailGlsl()}
        `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
        #include <opaque_fragment>

        float carShade = smoothstep(2.2, 0.0, distance(vWorldPos.xz, ballPosition.xz));
        diffuseColor.rgb *= mix(1.0, 0.5, carShade * 0.65);

        float trailAge;
        float hide = max(vHide, grassTrailHide(vWorldPos.xz, trailAge));
        if (hide > 0.98) discard;
        diffuseColor.rgb *= 1.0 - hide * 0.4;
        `
    );
  };
}

export function updateGrassShaderUniforms(
  material: THREE.MeshStandardMaterial,
  carCenter: THREE.Vector3,
  timeSec: number
) {
  const shader = material.userData.shader as
    | { uniforms: GrassShaderUniforms }
    | undefined;

  if (!shader) return;

  shader.uniforms.time.value = timeSec;
  shader.uniforms.ballPosition.value.copy(carCenter);
}
