import type * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';

export type PhysicsObject = {
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody | null;
};
