import RAPIER from '@dimforge/rapier3d-compat';

let world: RAPIER.World;

export async function initPhysics() {
  await RAPIER.init();

  world = new RAPIER.World({
    x: 0,
    y: -9.81,
    z: 0,
  });

  const params = world.integrationParameters;
  params.numSolverIterations = 12;

  return world;
}

export function getWorld() {
  return world;
}