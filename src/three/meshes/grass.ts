import * as THREE from 'three';
import type { PhysicsObject } from '../../physics/physics';
import { applyGrassWind } from '../../shaders/grassWind';
import { getWorldTerrainY } from '../../terrain/terrainHeight';

const BLADE_COUNT = 300000;
const FIELD_SIZE = 25;
const BLADE_WIDTH = 0.08;
const BLADE_HEIGHT = 0.44;
const BLADE_HALF_HEIGHT = BLADE_HEIGHT / 2;

function createBladeGeometry(): THREE.BufferGeometry {

  const geometry =
    new THREE.PlaneGeometry(
      BLADE_WIDTH,
      BLADE_HEIGHT,
      1,
      4
    );

  const positions =
    geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {

    const y =
      positions.getY(i);

    const normalizedY =
      (y + BLADE_HALF_HEIGHT) / BLADE_HEIGHT;

    const widthMultiplier =
      1 - normalizedY * 0.5;

    positions.setX(
      i,
      positions.getX(i) *
      widthMultiplier
    );
  }

  positions.needsUpdate = true;

  geometry.computeVertexNormals();

  geometry.translate(
    0,
    BLADE_HALF_HEIGHT,
    0
  );

  return geometry;
}

export function createGrass(): PhysicsObject {

  const bladeGeometry =
    createBladeGeometry();

  const material =
    new THREE.MeshStandardMaterial({
      color: 0x4f9d3a,
      side: THREE.DoubleSide,
    });

  applyGrassWind(material);

  const grass = new THREE.InstancedMesh(
    bladeGeometry,
    material,
    BLADE_COUNT
  );

  grass.receiveShadow = true;
  grass.castShadow = false;

  const dummy =
    new THREE.Object3D();

  for (let i = 0; i < BLADE_COUNT; i++) {

    const x =
      (Math.random() - 0.5) *
      FIELD_SIZE;

    const z =
      (Math.random() - 0.5) *
      FIELD_SIZE;

    const y = getWorldTerrainY(x, z);

    const scale =
      0.3 +
      Math.random() * 0.5;

    dummy.position.set(
      x,
      y,
      z
    );

    dummy.rotation.y =
      Math.random() *
      Math.PI;

    dummy.rotation.x =
      (Math.random() - 0.5) *
      0.2;

    dummy.rotation.z =
      (Math.random() - 0.5) *
      0.2;

    dummy.scale.set(
      scale,
      scale,
      scale
    );

    dummy.updateMatrix();

    grass.setMatrixAt(
      i,
      dummy.matrix
    );
  }

  grass.instanceMatrix.needsUpdate = true;

  return {
    mesh: grass,
    body: null,
  };
}