import * as THREE from 'three';

const LAMP_GLOW_KEY = 'kenneyColormapLamp_v1';

export function bindColormapLampGlow(
  material: THREE.MeshStandardMaterial
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uLampGlow = { value: 0 };
    shader.uniforms.uBrakeGlow = { value: 0 };

    shader.fragmentShader =
      `
      uniform float uLampGlow;
      uniform float uBrakeGlow;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `
      #include <emissivemap_fragment>
      float headMask = step(0.72, diffuseColor.r) * step(0.68, diffuseColor.g)
        * (1.0 - step(0.52, diffuseColor.b));
      float brakeMask = step(0.58, diffuseColor.r) * (1.0 - step(0.42, diffuseColor.g))
        * (1.0 - step(0.38, diffuseColor.b));
      totalEmissiveRadiance += vec3(1.35, 1.05, 0.35) * headMask * uLampGlow;
      totalEmissiveRadiance += vec3(1.6, 0.22, 0.06) * brakeMask * uBrakeGlow;
    `
    );

    material.userData.lampShader = shader;
  };

  material.customProgramCacheKey = () => LAMP_GLOW_KEY;
}

export function collectBodyLampMaterials(
  root: THREE.Object3D
): THREE.MeshStandardMaterial[] {
  const mats: THREE.MeshStandardMaterial[] = [];
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.name.toLowerCase().includes('wheel')) return;
    const m = child.material;
    if (m instanceof THREE.MeshStandardMaterial) mats.push(m);
    else if (Array.isArray(m)) {
      for (const entry of m) {
        if (entry instanceof THREE.MeshStandardMaterial) mats.push(entry);
      }
    }
  });
  return mats;
}

export function setColormapLampGlow(
  materials: THREE.MeshStandardMaterial[],
  headGlow: number,
  brakeGlow: number
): void {
  for (const mat of materials) {
    const shader = mat.userData.lampShader as
      | { uniforms: { uLampGlow: { value: number }; uBrakeGlow: { value: number } } }
      | undefined;
    if (!shader) continue;
    shader.uniforms.uLampGlow.value = headGlow;
    shader.uniforms.uBrakeGlow.value = brakeGlow;
  }
}
