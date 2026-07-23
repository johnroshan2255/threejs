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
  material.customProgramCacheKey = () => 'grassWind_v18_soft_3d_depth';

  material.onBeforeCompile = (shader) => {
    const uniforms = createGrassShaderUniforms(crushMap);
    Object.assign(shader.uniforms, uniforms);
    material.userData.shader = shader;
    material.userData.crushMap = crushMap;

    // Soft spherical upward normal: gives gentle 3D light/shadow depth across grass blades
    shader.vertexShader = shader.vertexShader.replace(
      '#include <beginnormal_vertex>',
      `
        vec3 objectNormal = vec3(0.0, 1.0, 0.0);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(1.0, 0.0, 0.0);
        #endif
      `
    );

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

        float wind = sin(time * 2.2 + position.x * 2.2 + position.z * 1.8);
        float windWave = cos(time * 1.5 + position.z * 3.2);

        transformed.x += (wind * 0.06 + windWave * 0.02) * grassWindScale * uv.y;
        transformed.z += (windWave * 0.05 + wind * 0.02) * grassWindScale * uv.y;

        vec3 bladePos = vec3(
          instanceMatrix[3][0],
          instanceMatrix[3][1],
          instanceMatrix[3][2]
        );

        // Dynamic car push (smoothly bends grass away when car drives past)
        float dist = distance(bladePos.xz, ballPosition.xz);
        float carInfluence = 1.0 - smoothstep(0.0, 2.0, dist);
        vec2 pushDir = normalize(bladePos.xz - ballPosition.xz + vec2(0.0001));

        transformed.x += pushDir.x * carInfluence * 0.5 * uv.y;
        transformed.z += pushDir.y * carInfluence * 0.5 * uv.y;
        transformed.y *= 1.0 - carInfluence * 0.35 * uv.y;

        // Persistent tire track crush (bends & flattens grass on the ground, NEVER removes)
        float trailAge;
        float crushBend = grassTrailHide(bladePos.xz, trailAge);
        float height = uv.y;

        transformed.y *= 1.0 - crushBend * 0.6 * height;
        transformed.x += pushDir.x * crushBend * 0.3 * height;
        transformed.z += pushDir.y * crushBend * 0.3 * height;

        // Gradual height reduction near beach shore and outer world boundaries (realistic vegetation gradient)
        float beachDist = clamp(bladePos.x - 24.0, 0.0, 32.0);
        float beachTaper = smoothstep(0.0, 28.0, beachDist);

        float edgeX = smoothstep(230.0, 160.0, abs(bladePos.x));
        float edgeZ = smoothstep(230.0, 160.0, abs(bladePos.z));
        float edgeTaper = min(edgeX, edgeZ);

        float heightTaper = mix(0.28, 1.0, beachTaper * edgeTaper);
        transformed.y *= heightTaper;
        transformed.x *= mix(0.68, 1.0, heightTaper);
        transformed.z *= mix(0.68, 1.0, heightTaper);

        vec4 worldPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vWorldPos = worldPos.xyz;
        vHide = crushBend;
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

        // Richer, slightly darker sunlit green palette for natural 3D depth
        // Deeper, more natural grass palette (less neon/fluorescent)
        vec3 grassRoot = vec3(0.20, 0.35, 0.12);
        vec3 grassMid = vec3(0.28, 0.45, 0.16);
        vec3 grassTipLush = vec3(0.35, 0.55, 0.20);
        vec3 grassTipWheat = vec3(0.60, 0.52, 0.25);

        float patchNoise = sin(vWorldPos.x * 0.1) * cos(vWorldPos.z * 0.1);
        float wheatMix = smoothstep(0.1, 0.6, patchNoise * 0.5 + 0.5);
        vec3 grassTip = mix(grassTipLush, grassTipWheat, wheatMix * 0.3);

        vec3 grassColor = mix(
          mix(grassRoot, grassMid, smoothstep(0.0, 0.3, t)),
          grassTip,
          smoothstep(0.3, 1.0, t)
        );

        diffuseColor = vec4(grassColor, 1.0);
        `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
        float carShade = smoothstep(2.2, 0.0, distance(vWorldPos.xz, ballPosition.xz));
        outgoingLight *= mix(1.0, 0.90, carShade * 0.5);

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
