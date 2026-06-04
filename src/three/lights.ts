import * as THREE from 'three';
import type { WeatherPreset } from './weather/weatherPresets';

const SUN_DISTANCE = 44;
const SHADOW_HALF_EXTENT = 34;

export type SceneLights = {
  ambient: THREE.AmbientLight;
  hemi: THREE.HemisphereLight;
  sun: THREE.DirectionalLight;
  sunTarget: THREE.Object3D;
  all: THREE.Light[];
};

export function createLights(): SceneLights {
  const ambient = new THREE.AmbientLight(0xbfd4ff, 0.38);

  const hemi = new THREE.HemisphereLight(0xc8d8f0, 0x5a5048, 0.42);

  const sun = new THREE.DirectionalLight(0xfff5e6, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 90;
  sun.shadow.camera.left = -SHADOW_HALF_EXTENT;
  sun.shadow.camera.right = SHADOW_HALF_EXTENT;
  sun.shadow.camera.top = SHADOW_HALF_EXTENT;
  sun.shadow.camera.bottom = -SHADOW_HALF_EXTENT;
  sun.shadow.bias = -0.00015;
  sun.shadow.normalBias = 0.025;
  sun.shadow.radius = 2;

  const sunTarget = new THREE.Object3D();
  sunTarget.name = 'sun-target';
  sun.target = sunTarget;

  return { ambient, hemi, sun, sunTarget, all: [ambient, hemi, sun] };
}

const _center = new THREE.Vector3();
const _sunPos = new THREE.Vector3();

/** Move sun + shadow frustum with the player; sync colors from weather. */
export function updateSunLighting(
  lights: SceneLights,
  followX: number,
  followY: number,
  followZ: number,
  preset: WeatherPreset
): void {
  _center.set(followX, followY + 0.4, followZ);
  lights.sunTarget.position.copy(_center);

  _sunPos.copy(preset.sunDirection).multiplyScalar(SUN_DISTANCE).add(_center);
  lights.sun.position.copy(_sunPos);

  lights.sun.color.setHex(preset.sunColor);
  lights.sun.intensity = preset.sunIntensity;
  lights.ambient.color.setHex(preset.ambientColor);
  lights.ambient.intensity = preset.ambientIntensity * 0.88;

  lights.hemi.color.setHex(preset.ambientColor);
  lights.hemi.groundColor.setHex(0x4a4438);
  lights.hemi.intensity = preset.ambientIntensity * 0.5;

  lights.sun.target.updateMatrixWorld();
  lights.sun.updateMatrixWorld();
}
