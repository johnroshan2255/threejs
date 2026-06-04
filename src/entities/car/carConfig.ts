export const CAR_CONFIG = {
  /** Uniform scale for Kenney mesh + Rapier collider / wheels. */
  scale: 1.7,
  mass: 100,
  /** Grass crush stamp width (scales with car). */
  wheelWidth: 0.58,

  /** Main engine torque (Kenney back axle, hood / -Z). */
  driveFrontAxleIndices: [0, 1],
  driveRearAxleIndices: [2, 3],
  /** Kenney front axle (+Z) — visual front wheels. */
  steeringWheelIndices: [2, 3],

  colliderYOffset: 0,
  colliderRoundness: 0.05,
  /** Collider half-height scale (squatter = lower mass). */
  colliderHeightScale: 0.62,
  /** Collider center below body origin (× chassis half-height). */
  colliderLocalYFactor: -0.5,
  /** Rigid-body center of mass (negative Y = lower, more stable). */
  centerOfMassY: -0.78,
  angularDamping: 0.38,

  spawn: { x: 0, z: 0, clearance: 1.0 },

  suspension: {
    restLength: 0.28,
    maxTravel: 0.28,
    stiffness: 48,
    compression: 2,
    relaxation: 2.2,
    maxForce: 10000,
  },

  drive: {
    engineForce: 340,
    reverseForce: 160,
    frontDriveRatio: 0.85,
    brakeForce: 16,
    maxSteerAngle: 0.5,
    steerSmoothing: 10,
    /** Ramp-up when pressing W/S (lower = softer launch). */
    throttleAccelSmoothing: 4.2,
    /** Ramp-down when releasing throttle. */
    throttleDecelSmoothing: 7,
    targetSpeed: 10,
    maxSpeed: 16,
    moveImpulse: 0.3,
    climbBoost: 2.5,
    hillAssistY: 0.35,
  },
};
