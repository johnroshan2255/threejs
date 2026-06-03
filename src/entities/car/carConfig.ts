export const CAR_CONFIG = {
  chassisSize: { x: 0.8, y: 0.28, z: 1.7 },
  mass: 50,

  wheelRadius: 0.22,
  wheelWidth: 0.17,

  /** Front at -Z (Rapier vehicle forward); rear at +Z. */
  wheelPositions: [
    [-0.55, -0.12, -0.85],
    [0.55, -0.12, -0.85],
    [-0.55, -0.12, 0.85],
    [0.55, -0.12, 0.85],
  ] as [number, number, number][],

  frontWheelIndices: [0, 1],
  rearWheelIndices: [2, 3],

  colliderYOffset: 0.05,
  colliderRoundness: 0.05,

  spawn: { x: 0, z: 0, clearance: 1.2 },

  suspension: {
    restLength: 0.26,
    maxTravel: 0.22,
    stiffness: 35,
    compression: 2,
    relaxation: 2.2,
    maxForce: 10000,
  },

  drive: {
    engineForce: 90,
    reverseForce: 65,
    frontDriveRatio: 0.25,
    brakeForce: 12,
    maxSteerAngle: 0.38,
    steerSmoothing: 10,
    targetSpeed: 2.5,
    maxSpeed: 3,
    moveImpulse: 0.14,
    climbBoost: 4,
  },
};
