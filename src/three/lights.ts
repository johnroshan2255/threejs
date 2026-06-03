import * as THREE from 'three';

export function createLights(): THREE.Light[] {
  const ambientLight = new THREE.AmbientLight(0xbfd4ff, 0.45);

  const sun = new THREE.DirectionalLight(0xfff5e6, 1.6);
  sun.position.set(10, 14, 8);
  sun.castShadow = true;

  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 45;
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 16;
  sun.shadow.camera.bottom = -16;
  sun.shadow.bias = -0.0002;
  sun.shadow.normalBias = 0.03;

  return [ambientLight, sun];
}
