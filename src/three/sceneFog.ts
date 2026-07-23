import * as THREE from 'three';
import type { CarEntity } from '../entities/car/createCar';

/** Far Cry 4 Kyrat alpine mountain sky atmosphere. */
export const FOG_COLOR = 0x94b8d4;

/** Linear fog distance thresholds. */
export const FOG_NEAR = 35;
export const FOG_FAR = 65;

export function applySceneFog(scene: THREE.Scene): THREE.Fog {
  scene.background = new THREE.Color(FOG_COLOR);
  const fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
  scene.fog = fog;
  return fog;
}

export function updateDrivingFog(fog: THREE.Fog, _car: CarEntity): void {
  fog.near = FOG_NEAR;
  fog.far = FOG_FAR;
  fog.color.set(FOG_COLOR);
}
