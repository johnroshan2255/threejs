import * as THREE from 'three';
import type { CarEntity } from '../entities/car/createCar';

/** Matches sky / horizon — hides far water edge. */
export const FOG_COLOR = 0xc88868;

/** Linear fog: full opacity by ~FOG_FAR units from camera. */
export const FOG_NEAR = 30;
export const FOG_FAR = 48;

export function applySceneFog(scene: THREE.Scene): THREE.Fog {
  scene.background = new THREE.Color(FOG_COLOR);
  const fog = new THREE.Fog(FOG_COLOR, FOG_NEAR, FOG_FAR);
  scene.fog = fog;
  return fog;
}

/** Keep thick fog hugging the drive — do not push far plane out while moving. */
export function updateDrivingFog(fog: THREE.Fog, _car: CarEntity): void {
  fog.near = FOG_NEAR;
  fog.far = FOG_FAR;
  fog.color.set(FOG_COLOR);
}
