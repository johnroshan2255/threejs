import * as THREE from 'three';
import type { PhysicsObject } from '../physics/physics';

import { createLights } from './lights';
import { createGrass } from './meshes/grass';
import { createTerrain } from '../terrain/terrain';
import { createCar } from '../entities/car/createCar';

export function createScene(): {
  scene: THREE.Scene;
  grass: PhysicsObject;
  terrain: PhysicsObject;
  car: any;
} {
  const scene = new THREE.Scene();

  const grass = createGrass();
  const terrain = createTerrain();
  const car = createCar();

  scene.background = new THREE.Color(0x90ee90);

  for (const light of createLights()) {
    scene.add(light);
  }

  scene.add(grass.mesh);
  scene.add(terrain.mesh);


  scene.add(car.mesh);
  car.wheels.forEach((w: THREE.Mesh) => scene.add(w));

  return { scene, grass, terrain, car };
}