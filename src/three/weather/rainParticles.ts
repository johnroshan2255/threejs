import * as THREE from 'three';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { getWorldTerrainY } from '../../terrain/terrainHeight';

/** Individual rain streaks (2 vertices per drop). */
const DROP_COUNT = 5500;
const BOX_W = 50;
const BOX_H = 24;
const BOX_D = 50;
const FALL_SPEED = 32;
const WIND_X = -1.4;
/** Screen-space streak width in pixels (1 = hairline). */
const LINE_WIDTH = 2.2;

export type RainGroundHit = (
  worldX: number,
  worldZ: number,
  amount: number
) => void;

export type RainParticles = {
  points: LineSegments2;
  update: (
    dt: number,
    camera: THREE.Camera,
    intensity: number,
    onGroundHit?: RainGroundHit
  ) => void;
  onResize: (width: number, height: number) => void;
  dispose: () => void;
};

export function createRainParticles(): RainParticles {
  const positions = new Float32Array(DROP_COUNT * 2 * 3);
  const streakLens = new Float32Array(DROP_COUNT);
  const speeds = new Float32Array(DROP_COUNT);

  for (let i = 0; i < DROP_COUNT; i++) {
    const head = i * 6;
    const y = Math.random() * BOX_H;
    positions[head] = (Math.random() - 0.5) * BOX_W;
    positions[head + 1] = y;
    positions[head + 2] = (Math.random() - 0.5) * BOX_D;
    streakLens[i] = 0.25 + Math.random() * 0.45;
    speeds[i] = 0.9 + Math.random() * 0.2;
    const tail = head + 3;
    positions[tail] = positions[head]!;
    positions[tail + 1] = y + streakLens[i]!;
    positions[tail + 2] = positions[head + 2]!;
  }

  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);

  const material = new LineMaterial({
    color: 0x7a8a9a,
    linewidth: LINE_WIDTH,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    worldUnits: false,
  });
  material.resolution.set(window.innerWidth, window.innerHeight);

  const lines = new LineSegments2(geometry, material);
  lines.frustumCulled = false;
  lines.renderOrder = 12;
  lines.computeLineDistances();

  return {
    points: lines,

    onResize(width, height) {
      material.resolution.set(width, height);
    },

    update(dt, camera, intensity, onGroundHit) {
      lines.visible = intensity > 0.04;
      if (!lines.visible) return;

      material.opacity = 0.09 + intensity * 0.15;
      material.linewidth = LINE_WIDTH + intensity * 0.6;
      lines.position.copy(camera.position);

      const camX = camera.position.x;
      const camY = camera.position.y;
      const camZ = camera.position.z;
      const drop = FALL_SPEED * dt;
      const wind = WIND_X * dt * intensity;
      const hitAmount = 0.012 + intensity * 0.01;

      for (let i = 0; i < DROP_COUNT; i++) {
        const head = i * 6;
        const tail = head + 3;
        const len = streakLens[i]!;

        positions[head]! += wind;
        positions[head + 1]! -= drop * speeds[i]!;
        positions[tail] = positions[head]!;
        positions[tail + 1] = positions[head + 1]! + len;
        positions[tail + 2] = positions[head + 2]!;

        const worldX = camX + positions[head]!;
        const worldZ = camZ + positions[head + 2]!;
        const worldY = camY + positions[head + 1]!;
        const groundY = getWorldTerrainY(worldX, worldZ) + 0.08;

        if (worldY <= groundY || positions[head + 1]! < -2) {
          if (worldY <= groundY && i % 8 === 0) {
            onGroundHit?.(worldX, worldZ, hitAmount);
          }
          const y = BOX_H * (0.65 + Math.random() * 0.35);
          positions[head] = (Math.random() - 0.5) * BOX_W;
          positions[head + 1] = y;
          positions[head + 2] = (Math.random() - 0.5) * BOX_D;
          positions[tail] = positions[head]!;
          positions[tail + 1] = y + len;
          positions[tail + 2] = positions[head + 2]!;
        }
      }

      geometry.setPositions(positions);
    },

    dispose() {
      geometry.dispose();
      material.dispose();
      lines.removeFromParent();
    },
  };
}
