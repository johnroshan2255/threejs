import * as THREE from 'three';
import { beachSandTexture, groundTexture } from '../three/textures';
import { CHUNK_SIZE } from '../terrain/chunkConfig';
import type { ChunkPuddleMap } from '../terrain/puddleMap';

const emptyPuddleTexture = (() => {
  const data = new Float32Array([0]);
  const tex = new THREE.DataTexture(
    data,
    1,
    1,
    THREE.RedFormat,
    THREE.FloatType
  );
  tex.needsUpdate = true;
  return tex;
})();

function applyPuddleUniforms(
  shader: THREE.WebGLProgramParametersWithUniforms,
  map: ChunkPuddleMap | null
): void {
  shader.uniforms.puddleMap!.value = map?.texture ?? emptyPuddleTexture;
  shader.uniforms.puddleOrigin!.value.set(map?.originX ?? 0, map?.originZ ?? 0);
  shader.uniforms.puddleSize!.value = CHUNK_SIZE;
}

/**
 * Terrain material that blends mud (inland) and sand (beach) textures per vertex.
 */
export function createTerrainBlendMaterial(): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: groundTexture,
    vertexColors: true,
    roughness: 0.93,
    metalness: 0.01,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.sandMap = { value: beachSandTexture };
    shader.uniforms.puddleMap = { value: emptyPuddleTexture };
    shader.uniforms.puddleOrigin = { value: new THREE.Vector2() };
    shader.uniforms.puddleSize = { value: CHUNK_SIZE };

    shader.vertexShader =
      `
      attribute float aSandMix;
      attribute float aWetMix;
      varying float vSandMix;
      varying float vWetMix;
      varying vec2 vWorldXZ;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      `
      #include <worldpos_vertex>
      vSandMix = aSandMix;
      vWetMix = aWetMix;
      vWorldXZ = worldPosition.xz;
    `
    );

    shader.fragmentShader =
      `
      uniform sampler2D sandMap;
      uniform sampler2D puddleMap;
      uniform vec2 puddleOrigin;
      uniform float puddleSize;
      varying float vSandMix;
      varying float vWetMix;
      varying vec2 vWorldXZ;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <map_fragment>',
      `
      #ifdef USE_MAP
        vec4 mudSample = texture2D(map, vMapUv);
        vec4 sandSample = texture2D(sandMap, vMapUv);
        vec4 texelColor = mix(mudSample, sandSample, vSandMix);
        texelColor.rgb = mix(texelColor.rgb, vec3(0.78, 0.7, 0.58), vWetMix * 0.55);
        texelColor.rgb = mix(texelColor.rgb, vec3(0.55, 0.72, 0.78), vWetMix * vSandMix * 0.12);

        float pUx = (vWorldXZ.x - puddleOrigin.x) / puddleSize;
        float pUz = (vWorldXZ.y - puddleOrigin.y) / puddleSize;
        if (pUx >= 0.0 && pUx <= 1.0 && pUz >= 0.0 && pUz <= 1.0) {
          float pDepth = texture2D(puddleMap, vec2(pUx, 1.0 - pUz)).r;
          float puddleWet = smoothstep(0.006, 0.14, pDepth);
          texelColor.rgb = mix(texelColor.rgb, vec3(0.4, 0.5, 0.58), puddleWet * 0.72);
          texelColor.rgb = mix(texelColor.rgb, vec3(0.25, 0.42, 0.55), puddleWet * puddleWet * 0.4);
        }

        diffuseColor *= texelColor;
      #endif
    `
    );

    material.userData.shader = shader;
    applyPuddleUniforms(shader, material.userData.puddleMap as ChunkPuddleMap | null);
  };

  material.customProgramCacheKey = () => 'terrain_blend_v2';

  return material;
}

export function bindTerrainPuddleMap(
  material: THREE.MeshStandardMaterial,
  map: ChunkPuddleMap | null
): void {
  material.userData.puddleMap = map;
  const shader = material.userData.shader as
    | THREE.WebGLProgramParametersWithUniforms
    | undefined;
  if (shader) applyPuddleUniforms(shader, map);
}
