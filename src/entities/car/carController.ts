import type { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat';
import type RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { CAR_CONFIG } from './carConfig';
import { getCarForward3D } from './cameraDrive';

export type DriveInput = {
  throttle: number;
  steer: number;
  braking: boolean;
};

const _driveDir = new THREE.Vector3();

export class CarController {
  private steerAngle = 0;
  private targetSteer = 0;
  private throttle = 0;
  private braking = false;

  constructor(
    private body: RAPIER.RigidBody,
    private vehicle: DynamicRayCastVehicleController,
    private frontWheelIndices: number[],
    private rearWheelIndices: number[]
  ) {}

  update(dt: number, input: DriveInput) {
    this.throttle = input.throttle;
    this.braking = input.braking;

    const { drive } = CAR_CONFIG;
    const smooth = 1 - Math.exp(-drive.steerSmoothing * dt);

    this.targetSteer = input.steer * drive.maxSteerAngle;
    this.steerAngle += (this.targetSteer - this.steerAngle) * smooth;

    for (const i of this.frontWheelIndices) {
      this.vehicle.setWheelSteering(i, this.steerAngle);
    }

    for (const i of this.rearWheelIndices) {
      this.vehicle.setWheelSteering(i, 0);
    }

    const engine = this.computeEngineForce();

    for (const i of this.rearWheelIndices) {
      this.vehicle.setWheelEngineForce(i, engine);
    }

    for (const i of this.frontWheelIndices) {
      this.vehicle.setWheelEngineForce(i, engine * drive.frontDriveRatio);
    }

    const brake = this.braking ? drive.brakeForce : 0;
    for (let i = 0; i < this.vehicle.numWheels(); i++) {
      this.vehicle.setWheelBrake(i, brake);
    }

    this.vehicle.updateVehicle(dt);
    this.applyCarDrive();
    this.clampSpeed(drive.maxSpeed);
  }

  /** W = car forward, S = car reverse — never camera-relative. */
  private computeEngineForce(): number {
    if (this.throttle === 0) return 0;

    const { engineForce, reverseForce } = CAR_CONFIG.drive;
    return this.throttle > 0 ? -engineForce : reverseForce;
  }

  /** Push along car facing (3D, includes uphill). */
  private applyCarDrive() {
    if (this.throttle === 0 || this.braking) return;

    const { drive } = CAR_CONFIG;
    const speed = Math.abs(this.vehicle.currentVehicleSpeed());
    if (speed >= drive.maxSpeed) return;

    const fwd = getCarForward3D(this.body);
    _driveDir.copy(fwd).multiplyScalar(Math.sign(this.throttle));

    const gap = 1 - Math.min(1, speed / drive.targetSpeed);
    const climb = 1 + Math.max(0, fwd.y) * drive.climbBoost;
    const impulse = this.body.mass() * drive.moveImpulse * gap * climb;

    this.body.applyImpulse(
      {
        x: _driveDir.x * impulse,
        y: _driveDir.y * impulse,
        z: _driveDir.z * impulse,
      },
      true
    );
  }

  private clampSpeed(max: number) {
    const v = this.body.linvel();
    const horizontal = Math.hypot(v.x, v.z);
    if (horizontal <= max) return;

    const scale = max / horizontal;
    this.body.setLinvel(
      { x: v.x * scale, y: v.y, z: v.z * scale },
      true
    );
  }
}
