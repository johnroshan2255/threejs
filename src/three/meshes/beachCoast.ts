import * as THREE from 'three';
import {
  BEACH_WATER_WORLD_Y,
  WET_SAND_START_X,
} from '../../terrain/beach';
import {
  createWaterSurfaceMaterial,
  updateWaterSurfaceMaterial,
} from '../../shaders/waterSurface';

const OCEAN_WIDTH = 5200;
const OCEAN_LENGTH = 5600;

export type BeachCoast = {
  water: THREE.Mesh;
  material: THREE.ShaderMaterial;
  update: (timeSec: number, followZ: number, fogColor?: THREE.Color) => void;
  dispose: () => void;
};

export function createBeachCoast(scene: THREE.Scene): BeachCoast {
  const waterGeo = new THREE.PlaneGeometry(
    OCEAN_WIDTH,
    OCEAN_LENGTH,
    96,
    96
  );

  const material = createWaterSurfaceMaterial();
  const water = new THREE.Mesh(waterGeo, material);

  water.rotation.x = -Math.PI / 2;
  const waterRightEdgeX = WET_SAND_START_X + 14;
  water.position.set(
    waterRightEdgeX - OCEAN_WIDTH * 0.5,
    BEACH_WATER_WORLD_Y + 0.02,
    0
  );
  water.frustumCulled = false;
  water.renderOrder = 8;

  scene.add(water);

  return {
    water,
    material,
    update(timeSec: number, followZ: number, fogColor?: THREE.Color) {
      const near = material.uniforms.fogNear!.value as number;
      const far = material.uniforms.fogFar!.value as number;
      const fog = material.uniforms.fogColor!.value as THREE.Color;
      updateWaterSurfaceMaterial(material, timeSec, near, far, fogColor ?? fog);
      water.position.z = followZ;
    },
    dispose() {
      water.removeFromParent();
      waterGeo.dispose();
      material.dispose();
    },
  };
}
