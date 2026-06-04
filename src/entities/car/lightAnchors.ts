import * as THREE from 'three';

export type CarLightAnchors = {
  headLeft: THREE.Vector3;
  headRight: THREE.Vector3;
  brakeLeft: THREE.Vector3;
  brakeRight: THREE.Vector3;
  brakeCenter: THREE.Vector3;
  /** Visual forward (hood direction) in body space. */
  forward: THREE.Vector3;
};

const _v = new THREE.Vector3();

/**
 * Find headlight / taillight centers from Kenney body geometry (after layout).
 */
export function computeCarLightAnchors(suvRoot: THREE.Object3D): CarLightAnchors {
  const points: THREE.Vector3[] = [];

  suvRoot.updateMatrixWorld(true);
  suvRoot.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (child.name.toLowerCase().includes('wheel')) return;

    const posAttr = child.geometry.attributes.position;
    if (!posAttr) return;

    const world = child.matrixWorld;
    for (let i = 0; i < posAttr.count; i++) {
      _v.fromBufferAttribute(posAttr as THREE.BufferAttribute, i);
      _v.applyMatrix4(world);
      suvRoot.worldToLocal(_v);
      points.push(_v.clone());
    }
  });

  if (points.length === 0) {
    throw new Error('No body vertices for light anchors');
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }

  const midX = (minX + maxX) * 0.5;
  const zSpan = maxZ - minZ;

  const frontBand = points.filter((p) => p.z > maxZ - zSpan * 0.12);
  const frontBumper = frontBand.filter(
    (p) => p.y < minY + (maxY - minY) * 0.45 && Math.abs(p.x - midX) > (maxX - minX) * 0.22
  );
  const headPool = frontBumper.length >= 8 ? frontBumper : frontBand;

  const backBand = points.filter((p) => p.z < minZ + zSpan * 0.12);
  const backPool = backBand.filter(
    (p) => Math.abs(p.x - midX) > (maxX - minX) * 0.18
  );

  const headLeft = averagePoints(headPool.filter((p) => p.x < midX));
  const headRight = averagePoints(headPool.filter((p) => p.x >= midX));
  const brakeLeft = averagePoints(backPool.filter((p) => p.x < midX));
  const brakeRight = averagePoints(backPool.filter((p) => p.x >= midX));

  const brakeCenter = brakeLeft.clone().add(brakeRight).multiplyScalar(0.5);
  brakeCenter.y += 0.08;

  return {
    headLeft,
    headRight,
    brakeLeft,
    brakeRight,
    brakeCenter,
    forward: new THREE.Vector3(0, 0, 1),
  };
}

function averagePoints(pts: THREE.Vector3[]): THREE.Vector3 {
  if (pts.length === 0) return new THREE.Vector3();
  const sum = new THREE.Vector3();
  for (const p of pts) sum.add(p);
  return sum.multiplyScalar(1 / pts.length);
}

/** Convert anchors from suv local space to body group space. */
export function anchorsToBodySpace(
  anchors: CarLightAnchors,
  suvOffset: THREE.Vector3
): CarLightAnchors {
  const add = (v: THREE.Vector3) => v.clone().add(suvOffset);
  return {
    headLeft: add(anchors.headLeft),
    headRight: add(anchors.headRight),
    brakeLeft: add(anchors.brakeLeft),
    brakeRight: add(anchors.brakeRight),
    brakeCenter: add(anchors.brakeCenter),
    forward: anchors.forward.clone(),
  };
}
