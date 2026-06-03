import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat';
import { getWorldTerrainY } from '../../terrain/terrainHeight';
import { getWorld } from '../../physics/world';
import { CAR_CONFIG } from './carConfig';

export type CarEntity = {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: THREE.Mesh;
  wheels: THREE.Mesh[];
  vehicle: DynamicRayCastVehicleController;
  frontWheelIndices: number[];
  rearWheelIndices: number[];
};

export function createCar(): CarEntity {
  const world = getWorld();
  const {
    chassisSize,
    wheelRadius,
    wheelWidth,
    wheelPositions,
    frontWheelIndices,
    rearWheelIndices,
    spawn,
    colliderYOffset,
    colliderRoundness,
    mass,
    suspension,
  } = CAR_CONFIG;

  const spawnY = getWorldTerrainY(spawn.x, spawn.z) + spawn.clearance;

  const hx = chassisSize.x / 2;
  const hy = chassisSize.y / 2;
  const hz = chassisSize.z / 2;

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawn.x, spawnY, spawn.z)
      .setLinearDamping(0.1)
      .setAngularDamping(0.25)
      .setCcdEnabled(true)
  );

  const collider = world.createCollider(
    RAPIER.ColliderDesc.roundCuboid(hx, hy, hz, colliderRoundness)
      .setTranslation(0, colliderYOffset, 0)
      .setFriction(0.35)
      .setRestitution(0)
      .setMass(mass),
    body
  );

  const vehicle = world.createVehicleController(body);
  vehicle.indexUpAxis = 1;
  // Setter is literally named setIndexForwardAxis in Rapier's API.
  vehicle.setIndexForwardAxis = 2;

  const suspensionDirection = { x: 0, y: -1, z: 0 };
  const axleDirection = { x: 1, y: 0, z: 0 };

  for (const [index, position] of wheelPositions.entries()) {
    vehicle.addWheel(
      { x: position[0], y: position[1], z: position[2] },
      suspensionDirection,
      axleDirection,
      suspension.restLength,
      wheelRadius
    );

    vehicle.setWheelSuspensionStiffness(index, suspension.stiffness);
    vehicle.setWheelMaxSuspensionTravel(index, suspension.maxTravel);
    vehicle.setWheelSuspensionCompression(index, suspension.compression);
    vehicle.setWheelSuspensionRelaxation(index, suspension.relaxation);
    vehicle.setWheelMaxSuspensionForce(index, suspension.maxForce);
    vehicle.setWheelFrictionSlip(index, 8);
    vehicle.setWheelSideFrictionStiffness(index, 0.8);
  }

  // Let suspension settle on terrain before driving.
  for (let i = 0; i < 60; i++) {
    vehicle.updateVehicle(1 / 60);
    world.step();
  }

  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(chassisSize.x, chassisSize.y, chassisSize.z),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const wheelGeo = new THREE.CylinderGeometry(
    wheelRadius,
    wheelRadius,
    wheelWidth,
    16
  );

  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

  const wheels = Array.from({ length: 4 }).map(() => {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.castShadow = true;
    w.receiveShadow = true;
    return w;
  });

  return {
    body,
    collider,
    mesh,
    wheels,
    vehicle,
    frontWheelIndices,
    rearWheelIndices,
  };
}
