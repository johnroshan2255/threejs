import * as THREE from 'three';

import { createLights } from './lights';
import { createCar } from '../entities/car/createCar';
import { ChunkManager } from '../terrain/chunkManager';
import { applySceneFog } from './sceneFog';

export function createScene(): {
  scene: THREE.Scene;
  fog: THREE.Fog;
  chunkManager: ChunkManager;
  car: ReturnType<typeof createCar>;
} {
  const scene = new THREE.Scene();
  const fog = applySceneFog(scene);

  const chunkManager = new ChunkManager(scene);
  chunkManager.loadAround(0, 0);

  const car = createCar();

  for (const light of createLights()) {
    scene.add(light);
  }

  scene.add(car.mesh);
  car.wheels.forEach((w) => scene.add(w));

  return { scene, fog, chunkManager, car };
}
