import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import type { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat';
import { getWorldTerrainY } from '../../terrain/terrainHeight';
import { getWorld } from '../../physics/world';
import { CAR_CONFIG } from './carConfig';
import { loadKenneySuvVisual } from './kenneyCarVisual';

export type CarEntity = {
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
  mesh: THREE.Group;
  wheels: THREE.Group[];
  vehicle: DynamicRayCastVehicleController;
  driveFrontAxleIndices: number[];
  driveRearAxleIndices: number[];
  steeringWheelIndices: number[];
};

export async function createCar(): Promise<CarEntity> {
  const world = getWorld();
  const {
    driveFrontAxleIndices,
    driveRearAxleIndices,
    steeringWheelIndices,
    spawn,
    colliderYOffset,
    colliderRoundness,
    mass,
    suspension,
  } = CAR_CONFIG;

  const layout = await loadKenneySuvVisual(colliderYOffset);
  const { chassisSize, physicsWheelPositions, wheelRadius } = layout;

  const spawnY = getWorldTerrainY(spawn.x, spawn.z) + spawn.clearance;

  const hx = chassisSize.x / 2;
  const hy = chassisSize.y / 2;
  const hz = chassisSize.z / 2;
  // Shorter collider so the body box doesn't sit on the ground instead of the tires.
  const colliderHy = hy * 0.82;

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(spawn.x, spawnY, spawn.z)
      .setLinearDamping(0.1)
      .setAngularDamping(0.25)
      .setCcdEnabled(true)
  );

  const collider = world.createCollider(
    RAPIER.ColliderDesc.roundCuboid(hx, colliderHy, hz, colliderRoundness)
      .setTranslation(0, colliderYOffset + hy * 0.12, 0)
      .setFriction(0.35)
      .setRestitution(0)
      .setMass(mass),
    body
  );

  const vehicle = world.createVehicleController(body);
  vehicle.indexUpAxis = 1;
  vehicle.setIndexForwardAxis = 2;

  const suspensionDirection = { x: 0, y: -1, z: 0 };
  const axleDirection = { x: 1, y: 0, z: 0 };

  for (const [index, position] of physicsWheelPositions.entries()) {
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
    vehicle.setWheelFrictionSlip(index, 12);
    vehicle.setWheelSideFrictionStiffness(index, 0.8);
  }

  for (let i = 0; i < 90; i++) {
    vehicle.updateVehicle(1 / 60);
    world.step();
  }

  const wheels = physicsWheelPositions.map((pos) => {
    const wheel = layout.wheelTemplate.clone(true);
    // Kenney rim is on +X; mirror wheels on -X so hubs face outward (not into the body).
    if (pos[0] < 0) {
      wheel.scale.x = -Math.abs(wheel.scale.x);
    }
    wheel.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = true;
      child.receiveShadow = true;
      const mats = Array.isArray(child.material)
        ? child.material
        : [child.material];
      for (const mat of mats) {
        if (mat) mat.side = THREE.DoubleSide;
      }
    });
    wheel.renderOrder = 5;
    return wheel;
  });

  return {
    body,
    collider,
    mesh: layout.body,
    wheels,
    vehicle,
    driveFrontAxleIndices,
    driveRearAxleIndices,
    steeringWheelIndices,
  };
}
