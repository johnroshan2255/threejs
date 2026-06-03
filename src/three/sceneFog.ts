import * as THREE from 'three';
import type { CarEntity } from '../entities/car/createCar';

export const FOG_COLOR = 0x8fb88f;

export function applySceneFog(scene: THREE.Scene): THREE.Fog {
  scene.background = new THREE.Color(FOG_COLOR);
  const fog = new THREE.Fog(FOG_COLOR, 28, 95);
  scene.fog = fog;
  return fog;
}

/** Pull far fog in while moving so loaded terrain ahead is visible sooner. */
export function updateDrivingFog(fog: THREE.Fog, car: CarEntity): void {
  const v = car.body.linvel();
  const speed = Math.hypot(v.x, v.z);
  const t = Math.min(1, speed / 4);
  fog.near = THREE.MathUtils.lerp(32, 42, t);
  fog.far = THREE.MathUtils.lerp(88, 115, t);
}
