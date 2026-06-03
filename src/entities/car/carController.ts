import type { DynamicRayCastVehicleController } from '@dimforge/rapier3d-compat';
import type RAPIER from '@dimforge/rapier3d-compat';
import { CAR_CONFIG } from './carConfig';
import { getCarGroundForward } from './cameraDrive';

export type DriveInput = {
  throttle: number;
  steer: number;
  braking: boolean;
};

const _driveDir = { x: 0, y: 0, z: 0 };

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

  /** Wheel inputs — call before world.step(). */
  applyInput(dt: number, input: DriveInput) {
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
  }

  /** Vehicle + drive assist — call after world.step(). */
  afterPhysics(_dt: number) {
    this.vehicle.updateVehicle(_dt);
    this.applyCarDrive();
    this.clampSpeed(CAR_CONFIG.drive.maxSpeed);
  }

  update(dt: number, input: DriveInput) {
    this.applyInput(dt, input);
    this.afterPhysics(dt);
  }

  /**
   * Rapier engine axis is chassis +Z; mesh front is -Z.
   * W = negative force, S = positive.
   */
  private computeEngineForce(): number {
    if (this.throttle === 0) return 0;

    const { engineForce, reverseForce } = CAR_CONFIG.drive;
    const mag = this.throttle > 0 ? engineForce : reverseForce;

    if (this.throttle > 0) {
      const fwd = getCarGroundForward(this.body);
      const v = this.body.linvel();
      const forwardSpeed = v.x * fwd.x + v.z * fwd.z;
      if (forwardSpeed < -0.3) {
        return engineForce * 1.8;
      }
    }

    return -Math.sign(this.throttle) * mag;
  }

  /** Horizontal push along car nose — never use pitched 3D forward (caused W to go backward). */
  private applyCarDrive() {
    if (this.throttle === 0 || this.braking) return;

    const { drive } = CAR_CONFIG;
    const fwd = getCarGroundForward(this.body);
    const v = this.body.linvel();
    const forwardSpeed = v.x * fwd.x + v.z * fwd.z;
    const wantForward = this.throttle > 0;

    if (wantForward && forwardSpeed >= drive.maxSpeed) return;
    if (!wantForward && forwardSpeed <= -drive.maxSpeed) return;

    _driveDir.x = fwd.x * Math.sign(this.throttle);
    _driveDir.y = 0;
    _driveDir.z = fwd.z * Math.sign(this.throttle);

    const speedAlong = wantForward ? Math.max(0, forwardSpeed) : Math.max(0, -forwardSpeed);
    const gap = Math.max(0.55, 1 - speedAlong / drive.targetSpeed);

    let impulse = this.body.mass() * drive.moveImpulse * gap;
    if (wantForward && forwardSpeed < 0) {
      impulse *= 2;
    }

    this.body.applyImpulse(
      {
        x: _driveDir.x * impulse,
        y: 0,
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
