import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';

/** Kenney mesh front faces -Z. */
const _localForward = new THREE.Vector3(0, 0, -1);
const _worldForward = new THREE.Vector3();
const _cameraDir = new THREE.Vector3();
const _quat = new THREE.Quaternion();

/** Chassis -Z is the front of the car (matches wheel layout). */
export function getCarGroundForward(body: RAPIER.RigidBody): THREE.Vector3 {
  getCarForward3D(body);
  _worldForward.y = 0;

  if (_worldForward.lengthSq() < 1e-6) {
    return _worldForward.set(0, 0, -1);
  }

  return _worldForward.normalize();
}

/** Full 3D forward (includes pitch) — needed to climb hills. */
export function getCarForward3D(body: RAPIER.RigidBody): THREE.Vector3 {
  const r = body.rotation();
  _quat.set(r.x, r.y, r.z, r.w);
  _worldForward.copy(_localForward).applyQuaternion(_quat);

  if (_worldForward.lengthSq() < 1e-6) {
    return _worldForward.set(0, 0, -1);
  }

  return _worldForward.normalize();
}

/** Horizontal direction the camera is looking. */
export function getCameraGroundForward(
  camera: THREE.PerspectiveCamera
): THREE.Vector3 {
  camera.getWorldDirection(_cameraDir);
  _cameraDir.y = 0;

  if (_cameraDir.lengthSq() < 1e-6) {
    return _cameraDir.set(0, 0, -1);
  }

  return _cameraDir.normalize();
}

export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

export function yawFromDirection(dir: THREE.Vector3): number {
  return Math.atan2(dir.x, dir.z);
}
