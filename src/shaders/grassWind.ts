import * as THREE from 'three';

export function applyGrassWind(material: THREE.MeshStandardMaterial) {
  material.customProgramCacheKey = () => 'grassWind_v2';

  material.onBeforeCompile = (shader) => {
    shader.uniforms.time = {
      value: 0,
    };

    shader.uniforms.ballPosition = {
      value: new THREE.Vector3(),
    };

    material.userData.shader = shader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `
        #include <common>

        uniform float time;
        uniform vec3 ballPosition;

        varying vec3 vWorldPos;
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

        vec4 worldPos = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vWorldPos = worldPos.xyz;
        `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `
        #include <common>

        uniform vec3 ballPosition;
        varying vec3 vWorldPos;
        `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `
        #include <opaque_fragment>

        float carShade = smoothstep(2.2, 0.0, distance(vWorldPos.xz, ballPosition.xz));
        diffuseColor.rgb *= mix(1.0, 0.5, carShade * 0.65);
        `
    );
  };
}
