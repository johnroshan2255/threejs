import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type * as THREE from 'three';

export function createControls(
  camera: THREE.PerspectiveCamera,
  domElement: HTMLElement
): OrbitControls {
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  return controls;
}
