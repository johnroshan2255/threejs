import type RAPIER from '@dimforge/rapier3d-compat';

const SPEED = 3;
const RADIUS = 0.5;

export function applyMovement(
  body: RAPIER.RigidBody,
  isKeyDown: (key: string) => boolean
): void {

  const vel = body.linvel();

  let x = 0;
  let z = 0;

  if (isKeyDown('w')) z -= SPEED;
  if (isKeyDown('s')) z += SPEED;
  if (isKeyDown('a')) x -= SPEED;
  if (isKeyDown('d')) x += SPEED;

  if (x !== 0 && z !== 0) {
    const factor =
      SPEED / Math.hypot(x, z);

    x *= factor;
    z *= factor;
  }

  body.setLinvel(
    {
      x,
      y: vel.y,
      z,
    },
    true
  );

  body.setAngvel(
    {
      x: z / RADIUS,
      y: 0,
      z: -x / RADIUS,
    },
    true
  );
}