import * as THREE from 'three';
import type { PhysicsObject } from '../../physics/physics';
import { applyGrassWind } from '../../shaders/grassWind';
import { ChunkGrassCrushMap } from '../../terrain/grassCrushMap';
import {
  CHUNK_SIZE,
  GRASS_BLADES_PER_CHUNK,
  chunkWorldCenter,
} from '../../terrain/chunkConfig';
import { getWorldTerrainY } from '../../terrain/terrainHeight';

const FIELD_SIZE = CHUNK_SIZE;
const BLADE_WIDTH = 0.08;
const BLADE_HEIGHT = 0.44;
const BLADE_HALF_HEIGHT = BLADE_HEIGHT / 2;

let bladeGeometry: THREE.BufferGeometry | null = null;

function getBladeGeometry(): THREE.BufferGeometry {
  if (bladeGeometry) return bladeGeometry;

  const geometry = new THREE.PlaneGeometry(BLADE_WIDTH, BLADE_HEIGHT, 1, 4);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const y = positions.getY(i);
    const normalizedY = (y + BLADE_HALF_HEIGHT) / BLADE_HEIGHT;
    const widthMultiplier = 1 - normalizedY * 0.5;
    positions.setX(i, positions.getX(i) * widthMultiplier);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.translate(0, BLADE_HALF_HEIGHT, 0);
  bladeGeometry = geometry;
  return geometry;
}

export function createGrassMaterialForChunk(
  crushMap: ChunkGrassCrushMap
): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: 0x4f9d3a,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 8,
  });
  applyGrassWind(material, crushMap);
  return material;
}

/** 300k blades — same placement as the original createGrass(). */
export function createGrassForChunk(
  chunkX: number,
  chunkZ: number,
  material: THREE.MeshStandardMaterial
): THREE.InstancedMesh {
  const grass = new THREE.InstancedMesh(
    getBladeGeometry(),
    material,
    GRASS_BLADES_PER_CHUNK
  );

  grass.receiveShadow = true;
  grass.castShadow = false;
  grass.frustumCulled = false;

  const { x: centerX, z: centerZ } = chunkWorldCenter(chunkX, chunkZ);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < GRASS_BLADES_PER_CHUNK; i++) {
    const x = centerX + (Math.random() - 0.5) * FIELD_SIZE;
    const z = centerZ + (Math.random() - 0.5) * FIELD_SIZE;
    const y = getWorldTerrainY(x, z);
    const scale = 0.3 + Math.random() * 0.5;

    dummy.position.set(x, y, z);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.rotation.x = (Math.random() - 0.5) * 0.2;
    dummy.rotation.z = (Math.random() - 0.5) * 0.2;
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
  }

  grass.instanceMatrix.needsUpdate = true;
  grass.geometry.boundingSphere = new THREE.Sphere(
    new THREE.Vector3(centerX, 2, centerZ),
    FIELD_SIZE * 0.85
  );

  return grass;
}

export function disposeGrassMesh(grass: THREE.InstancedMesh): void {
  grass.removeFromParent();
}

export function createGrass(): PhysicsObject {
  const crushMap = new ChunkGrassCrushMap(0, 0);
  const material = createGrassMaterialForChunk(crushMap);
  const grass = createGrassForChunk(0, 0, material);

  return {
    mesh: grass,
    body: null,
  };
}
