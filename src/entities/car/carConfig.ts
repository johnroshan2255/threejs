// export const CAR_CONFIG = {
//   /** Uniform scale for Kenney mesh + Rapier collider / wheels. */
//   scale: 1.7,
//   mass: 120,
//   /** Grass crush stamp width (scales with car). */
//   wheelWidth: 0.58,

//   /** Main engine torque (Kenney back axle, hood / -Z). */
//   driveFrontAxleIndices: [0, 1],
//   driveRearAxleIndices: [2, 3],
//   /** Kenney front axle (+Z) — visual front wheels. */
//   steeringWheelIndices: [2, 3],

//   colliderYOffset: -0.05,
//   colliderRoundness: 0.08,
//   /** Squat collider height for low center of gravity. */
//   colliderHeightScale: 0.55,
//   /** Collider center below body origin. */
//   colliderLocalYFactor: -0.65,
//   /** Rigid-body center of mass (lowered for zero roll-over). */
//   centerOfMassY: -1.35,
//   angularDamping: 1.5,

//   spawn: { x: 0, z: 0, clearance: 1.0 },

//   suspension: {
//     restLength: 0.32,
//     maxTravel: 0.32,
//     stiffness: 55,
//     compression: 2.8,
//     relaxation: 3.2,
//     maxForce: 14000,
//   },

//   drive: {
//     engineForce: 360,
//     reverseForce: 180,
//     frontDriveRatio: 0.85,
//     brakeForce: 20,
//     maxSteerAngle: 0.45,
//     steerSmoothing: 12,
//     /** Ramp-up when pressing W/S (lower = softer launch). */
//     throttleAccelSmoothing: 4.5,
//     /** Ramp-down when releasing throttle. */
//     throttleDecelSmoothing: 8,
//     targetSpeed: 11,
//     maxSpeed: 18,
//     moveImpulse: 0.3,
//     climbBoost: 2.8,
//     hillAssistY: 0.35,
//   },
// };


export const CAR_CONFIG = {
  /** Uniform scale for Kenney mesh + Rapier collider / wheels. */
  scale: 2.6,
  mass: 210,
  /** Grass crush stamp width (scales with car). */
  wheelWidth: 0.9,

  /** Main engine torque (Kenney back axle, hood / -Z). */
  driveFrontAxleIndices: [0, 1],
  driveRearAxleIndices: [2, 3],
  /** Kenney front axle (+Z) — visual front wheels. */
  steeringWheelIndices: [2, 3],

  colliderYOffset: -0.02,          // was -0.03, a touch more clearance for gutters
  colliderRoundness: 0.22,         // was 0.18, rounder hull glides over rough terrain edges
  /** Squat collider height for low center of gravity. */
  colliderHeightScale: 0.48,       // was 0.5, slimmer belly = less snagging on ruts
  /** Collider center below body origin. */
  colliderLocalYFactor: -0.45,     // was -0.5, raises collider a bit more off the ground
  /** Rigid-body center of mass (lowered for zero roll-over). */
  centerOfMassY: -1.9,
  angularDamping: 1.8,             // was 1.5, a bit more stability on uneven ground

  spawn: { x: 0, z: 0, clearance: 1.6 },   // was 1.4, extra room for rough terrain spawn

  suspension: {
    restLength: 0.65,       // was 0.5 — off-road rigs sit taller
    maxTravel: 0.75,        // was 0.55 — more wheel droop/compression range to soak up gutters
    stiffness: 45,          // was 65 — softer spring absorbs bumps instead of bouncing the body
    compression: 4.2,       // was 3.2 — more damping so it doesn't bottom out harshly
    relaxation: 4.8,        // was 3.4 — controls rebound so it doesn't porpoise after a hit
    maxForce: 26000,        // was 20000 — bigger, faster car needs more force capacity
  },

  drive: {
    engineForce: 620,       // was 520 — faster acceleration for the bigger car
    reverseForce: 300,      // was 260
    frontDriveRatio: 0.85,
    brakeForce: 30,         // was 28
    maxSteerAngle: 0.42,    // was 0.45, very slightly tighter for stability at higher speed
    steerSmoothing: 10,     // was 12, slightly quicker steer response to correct on rough ground
    /** Ramp-up when pressing W/S (lower = softer launch). */
    throttleAccelSmoothing: 5,     // was 4.5, marginally softer launch so torque doesn't spin wheels on loose terrain
    /** Ramp-down when releasing throttle. */
    throttleDecelSmoothing: 8,
    targetSpeed: 16,        // was 11
    maxSpeed: 26,           // was 18
    moveImpulse: 0.35,      // was 0.3
    climbBoost: 4,          // was 3.4 — more help mounting gutters/ledges
    hillAssistY: 0.55,      // was 0.45
  },
};