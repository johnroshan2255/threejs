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
  wheels: THREE.Group[];
  vehicle: DynamicRayCastVehicleController;
  frontWheelIndices: number[];
  rearWheelIndices: number[];
};

function createWheelMesh(radius: number, width: number): THREE.Group {
  const wheel = new THREE.Group();

  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x151515,
    roughness: 0.95,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xb8b8b8,
    metalness: 0.55,
    roughness: 0.4,
  });
  const spokeMat = new THREE.MeshStandardMaterial({
    color: 0xe8e8e8,
    metalness: 0.7,
    roughness: 0.3,
  });

  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 20),
    tireMat
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  tire.receiveShadow = true;

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.62, radius * 0.07, 10, 24),
    rimMat
  );
  rim.rotation.y = Math.PI / 2;
  rim.castShadow = true;

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.22, radius * 0.22, width * 1.02, 12),
    rimMat
  );
  hub.rotation.z = Math.PI / 2;

  wheel.add(tire, rim, hub);

  const spokeCount = 5;
  for (let i = 0; i < spokeCount; i++) {
    const spoke = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.12, radius * 0.5, radius * 0.05),
      spokeMat
    );
    const angle = (i / spokeCount) * Math.PI * 2;
    spoke.position.set(0, Math.cos(angle) * radius * 0.32, Math.sin(angle) * radius * 0.32);
    spoke.rotation.x = angle;
    wheel.add(spoke);
  }

  return wheel;
}

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
    vehicle.setWheelFrictionSlip(index, 10);
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
  mesh.renderOrder = 5;

  const wheels = Array.from({ length: 4 }).map(() => {
    const wheel = createWheelMesh(wheelRadius, wheelWidth);
    wheel.renderOrder = 5;
    return wheel;
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
