import type { PhysicsObject } from './physics';

export function syncMesh({ mesh, body }: PhysicsObject): void {
  if (!body) return;
  const { x, y, z } = body.translation();
  mesh.position.set(x, y, z);
}
