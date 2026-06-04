import type { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat';
import type RAPIER from '@dimforge/rapier3d-compat';
import { CAR_CONFIG } from './carConfig';
import {
  BEACH_WATER_WORLD_Y,
  getOceanSubmersion,
} from '../../terrain/beach';

export type DriveInput = {
  throttle: number;
  steer: number;
  braking: boolean;
};

export class CarController {
  private steerAngle = 0;
  private targetSteer = 0;
  /** Smoothed -1..1, ramps engine force gradually. */
  private throttle = 0;
  private braking = false;

  constructor(
    private body: RAPIER.RigidBody,
    private vehicle: DynamicRayCastVehicleController,
    private driveFrontAxleIndices: number[],
    private driveRearAxleIndices: number[],
    private steeringWheelIndices: number[]
  ) {}

  /** Wheel inputs — call before world.step(). */
  applyInput(dt: number, input: DriveInput) {
    this.braking = input.braking;

    const { drive } = CAR_CONFIG;
    const steerSmooth = 1 - Math.exp(-drive.steerSmoothing * dt);
    const throttleTarget = input.throttle;
    const rampingUp =
      Math.abs(throttleTarget) > Math.abs(this.throttle) + 1e-4 &&
      Math.sign(throttleTarget || this.throttle) === Math.sign(throttleTarget);
    const throttleRate = rampingUp
      ? drive.throttleAccelSmoothing
      : drive.throttleDecelSmoothing;
    const throttleSmooth = 1 - Math.exp(-throttleRate * dt);
    this.throttle += (throttleTarget - this.throttle) * throttleSmooth;

    this.targetSteer = input.steer * drive.maxSteerAngle;
    this.steerAngle += (this.targetSteer - this.steerAngle) * steerSmooth;

    for (let i = 0; i < this.vehicle.numWheels(); i++) {
      this.vehicle.setWheelSteering(i, 0);
    }
    for (const i of this.steeringWheelIndices) {
      this.vehicle.setWheelSteering(i, this.steerAngle);
    }

    const t = this.body.translation();
    const water = getOceanSubmersion(t.x, t.y, t.z);
    const engine = this.computeEngineForce() * (1 - water * 0.72);

    for (const i of this.driveRearAxleIndices) {
      this.vehicle.setWheelEngineForce(i, engine);
    }

    for (const i of this.driveFrontAxleIndices) {
      this.vehicle.setWheelEngineForce(i, engine * drive.frontDriveRatio);
    }

    const brake = this.braking ? drive.brakeForce : 0;
    for (let i = 0; i < this.vehicle.numWheels(); i++) {
      this.vehicle.setWheelBrake(i, brake);
    }
  }

  /** Vehicle update — call after world.step(). */
  afterPhysics(dt: number) {
    this.vehicle.updateVehicle(dt);
    this.applyWaterEffects();
    this.clampSpeed(CAR_CONFIG.drive.maxSpeed);
  }

  private applyWaterEffects() {
    const t = this.body.translation();
    const sub = getOceanSubmersion(t.x, t.y, t.z);
    if (sub <= 0.03) return;

    const v = this.body.linvel();
    const drag = 1 - sub * 0.2;
    this.body.setLinvel(
      { x: v.x * drag, y: v.y * (1 - sub * 0.25), z: v.z * drag },
      true
    );

    const sinkTargetY = BEACH_WATER_WORLD_Y - 0.65 * sub;
    const pull = (sinkTargetY - t.y) * this.body.mass() * 1.4 * sub;
    if (pull < 0) {
      this.body.applyImpulse({ x: 0, y: pull, z: 0 }, true);
    }
  }

  update(dt: number, input: DriveInput) {
    this.applyInput(dt, input);
    this.afterPhysics(dt);
  }

  resetDriveState() {
    this.steerAngle = 0;
    this.targetSteer = 0;
    this.throttle = 0;
    this.braking = false;

    for (let i = 0; i < this.vehicle.numWheels(); i++) {
      this.vehicle.setWheelSteering(i, 0);
      this.vehicle.setWheelEngineForce(i, 0);
      this.vehicle.setWheelBrake(i, 0);
    }
  }

  /**
   * Rapier vehicle forward is +Z; Kenney hood faces -Z.
   * Negative engine on W drives toward -Z (forward).
   */
  private computeEngineForce(): number {
    if (Math.abs(this.throttle) < 0.02) return 0;

    const { engineForce, reverseForce } = CAR_CONFIG.drive;
    const t = this.throttle;
    const mag =
      t > 0 ? engineForce * t : reverseForce * Math.abs(t);

    return -Math.sign(t) * mag;
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
