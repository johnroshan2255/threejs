import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BUSHES_PER_CHUNK,
  CHUNK_SIZE,
  chunkWorldCenter,
} from '../../terrain/chunkConfig';
import { hasGrass } from '../../terrain/fieldMask';
import { getWorldTerrainY } from '../../terrain/terrainHeight';

const FIELD_SIZE = CHUNK_SIZE;

let bushGeometry: THREE.BufferGeometry | null = null;

/** Simple bush: 3 small cones in a clump (reads as leaves, not a rock). */
function createBushGeometry(): THREE.BufferGeometry {
  if (bushGeometry) return bushGeometry;

  const parts: THREE.BufferGeometry[] = [];
  const tilts = [
    { x: 0, y: 0, z: 0, ry: 0 },
    { x: 0.22, y: 0, z: 0.12, ry: 2.1 },
    { x: -0.18, y: 0, z: 0.1, ry: 4.2 },
  ];

  for (const t of tilts) {
    const cone = new THREE.ConeGeometry(0.38, 0.85, 6);
    cone.translate(t.x, 0.42, t.z);
    const m = new THREE.Matrix4().makeRotationFromEuler(
      new THREE.Euler(0.12, t.ry, 0, 'YXZ')
    );
    cone.applyMatrix4(m);
    parts.push(cone);
  }

  const merged = mergeGeometries(parts);
  if (!merged) {
    return new THREE.ConeGeometry(0.4, 0.9, 6);
  }

  merged.computeVertexNormals();
  bushGeometry = merged;
  return bushGeometry;
}

function hash01(chunkX: number, chunkZ: number, index: number, salt: number): number {
  const s =
    Math.sin(chunkX * 173.3 + chunkZ * 419.2 + index * 0.31 + salt * 71.1) *
    43758.5453;
  return s - Math.floor(s);
}

export function createBushMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0x3d7a38,
    roughness: 0.85,
    metalness: 0,
  });
}

export function createBushesForChunk(
  chunkX: number,
  chunkZ: number,
  material: THREE.MeshStandardMaterial
): THREE.InstancedMesh {
  const bushes = new THREE.InstancedMesh(
    createBushGeometry(),
    material,
    BUSHES_PER_CHUNK
  );

  bushes.castShadow = true;
  bushes.receiveShadow = true;
  bushes.frustumCulled = false;
  bushes.renderOrder = 10;

  const { x: centerX, z: centerZ } = chunkWorldCenter(chunkX, chunkZ);
  const dummy = new THREE.Object3D();

  let placed = 0;

  for (let i = 0; i < BUSHES_PER_CHUNK; i++) {
    for (let attempt = 0; attempt < 16; attempt++) {
      const x =
        centerX +
        (hash01(chunkX, chunkZ, i, 1 + attempt) - 0.5) * FIELD_SIZE * 0.85;
      const z =
        centerZ +
        (hash01(chunkX, chunkZ, i, 2 + attempt) - 0.5) * FIELD_SIZE * 0.85;

      if (!hasGrass(x, z)) continue;

      const scale = 1.05 + hash01(chunkX, chunkZ, i, 3) * 0.85;

      dummy.position.set(x, getWorldTerrainY(x, z), z);
      dummy.rotation.y = hash01(chunkX, chunkZ, i, 4) * Math.PI * 2;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      bushes.setMatrixAt(placed, dummy.matrix);
      placed++;
      break;
    }
  }

  bushes.instanceMatrix.needsUpdate = true;
  bushes.count = placed;
  bushes.geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(centerX, 2.2, centerZ),
    FIELD_SIZE
  );

  return bushes;
}

export function disposeBushesMesh(bushes: THREE.InstancedMesh): void {
  bushes.removeFromParent();
}
