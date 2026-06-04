import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  CHUNK_SIZE,
  chunkWorldCenter,
  PROPS_PER_CHUNK,
} from '../../terrain/chunkConfig';
import { isOpenGround } from '../../terrain/fieldMask';
import { getWorld } from '../../physics/world';
import { getWorldTerrainY } from '../../terrain/terrainHeight';

const FIELD_SIZE = CHUNK_SIZE;
const REST_SPEED = 0.12;
const REST_ANG = 0.25;

const rockMaterial = new THREE.MeshStandardMaterial({
  color: 0x9a5840,
  roughness: 0.94,
  metalness: 0.02,
});

export type WorldProp = {
  mesh: THREE.Mesh;
  body: RAPIER.RigidBody;
  collider: RAPIER.Collider;
};

export type ChunkProps = {
  items: WorldProp[];
};

function hash01(chunkX: number, chunkZ: number, index: number, salt: number): number {
  const s =
    Math.sin(chunkX * 173.3 + chunkZ * 419.2 + index * 0.31 + salt * 71.1) *
    43758.5453;
  return s - Math.floor(s);
}

type RockShape = 'boulder' | 'chunk' | 'slab';

function pickRockShape(chunkX: number, chunkZ: number, index: number): RockShape {
  const v = Math.floor(hash01(chunkX, chunkZ, index, 5) * 3);
  return (['boulder', 'chunk', 'slab'] as const)[v] ?? 'boulder';
}

function makeRockBody(
  world: RAPIER.World,
  x: number,
  y: number,
  z: number
): RAPIER.RigidBody {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setLinearDamping(4.5)
      .setAngularDamping(6)
      .setCanSleep(true)
  );
  body.setEnabledRotations(false, false, false, false);
  return body;
}

function createRockProp(
  x: number,
  groundY: number,
  z: number,
  chunkX: number,
  chunkZ: number,
  index: number
): WorldProp {
  const world = getWorld();
  const size = 0.28 + hash01(chunkX, chunkZ, index, 4) * 0.35;
  const shape = pickRockShape(chunkX, chunkZ, index);
  const tint = 0.9 + hash01(chunkX, chunkZ, index, 6) * 0.15;
  const mat = rockMaterial.clone();
  mat.color.multiplyScalar(tint);

  switch (shape) {
    case 'boulder': {
      const r = size;
      const body = makeRockBody(world, x, groundY + r, z);
      const collider = world.createCollider(
        RAPIER.ColliderDesc.ball(r)
          .setFriction(1.15)
          .setRestitution(0)
          .setMass(size * 28),
        body
      );
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      body.sleep();
      return { mesh, body, collider };
    }
    case 'chunk': {
      const hx = size * (0.75 + hash01(chunkX, chunkZ, index, 7) * 0.35);
      const hy = size * (0.55 + hash01(chunkX, chunkZ, index, 8) * 0.25);
      const hz = size * (0.7 + hash01(chunkX, chunkZ, index, 9) * 0.3);
      const body = makeRockBody(world, x, groundY + hy, z);
      const collider = world.createCollider(
        RAPIER.ColliderDesc.roundCuboid(hx, hy, hz, 0.08)
          .setFriction(1.15)
          .setRestitution(0)
          .setMass(size * 30),
        body
      );
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2), mat);
      mesh.rotation.y = hash01(chunkX, chunkZ, index, 10) * Math.PI;
      mesh.rotation.z = (hash01(chunkX, chunkZ, index, 11) - 0.5) * 0.35;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      body.sleep();
      return { mesh, body, collider };
    }
    case 'slab': {
      const hx = size * 1.05;
      const hy = size * 0.32;
      const hz = size * 0.75;
      const body = makeRockBody(world, x, groundY + hy, z);
      const collider = world.createCollider(
        RAPIER.ColliderDesc.cuboid(hx, hy, hz)
          .setFriction(1.15)
          .setRestitution(0)
          .setMass(size * 32),
        body
      );
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2), mat);
      mesh.rotation.y = hash01(chunkX, chunkZ, index, 14) * Math.PI * 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      body.sleep();
      return { mesh, body, collider };
    }
  }
}

export function createPropsForChunk(
  chunkX: number,
  chunkZ: number,
  scene: THREE.Scene
): ChunkProps {
  const { x: centerX, z: centerZ } = chunkWorldCenter(chunkX, chunkZ);
  const items: WorldProp[] = [];
  const minSpacing = 2.2;

  for (let i = 0; i < PROPS_PER_CHUNK; i++) {
    for (let attempt = 0; attempt < 24; attempt++) {
      const x =
        centerX +
        (hash01(chunkX, chunkZ, i, 10 + attempt) - 0.5) * FIELD_SIZE * 0.9;
      const z =
        centerZ +
        (hash01(chunkX, chunkZ, i, 20 + attempt) - 0.5) * FIELD_SIZE * 0.9;

      if (!isOpenGround(x, z)) continue;
      if (Math.hypot(x, z) < 5) continue;

      const tooClose = items.some((p) => {
        const t = p.body.translation();
        return Math.hypot(t.x - x, t.z - z) < minSpacing;
      });
      if (tooClose) continue;

      const y = getWorldTerrainY(x, z);
      const prop = createRockProp(x, y, z, chunkX, chunkZ, i);

      scene.add(prop.mesh);
      items.push(prop);
      break;
    }
  }

  return { items };
}

function settleRock(body: RAPIER.RigidBody): void {
  const lv = body.linvel();
  const av = body.angvel();
  const speed = Math.hypot(lv.x, lv.y, lv.z);
  const spin = Math.hypot(av.x, av.y, av.z);

  if (speed > REST_SPEED || spin > REST_ANG) return;

  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  body.sleep();
}

export function syncPropMeshes(props: ChunkProps): void {
  for (const { mesh, body } of props.items) {
    const t = body.translation();
    const r = body.rotation();
    mesh.position.set(t.x, t.y, t.z);
    mesh.quaternion.set(r.x, r.y, r.z, r.w);
    settleRock(body);
  }
}

export function disposeChunkProps(props: ChunkProps): void {
  const world = getWorld();

  for (const { mesh, body, collider } of props.items) {
    mesh.removeFromParent();
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    world.removeCollider(collider, true);
    world.removeRigidBody(body);
  }

  props.items.length = 0;
}
