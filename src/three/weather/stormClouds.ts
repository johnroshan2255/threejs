import * as THREE from 'three';

const CLOUD_BASE_Y = 28;

type CloudPuff = {
  mesh: THREE.Mesh;
  baseOpacity: number;
  flashBoost: number;
};

export type StormClouds = {
  group: THREE.Group;
  lightningLight: THREE.DirectionalLight;
  update: (
    dt: number,
    camera: THREE.Camera,
    rainIntensity: number,
    onThunder?: () => void
  ) => void;
  dispose: () => void;
};

export function createStormClouds(): StormClouds {
  const group = new THREE.Group();
  group.name = 'storm-clouds';
  group.renderOrder = 15;

  const cloudMat = new THREE.MeshBasicMaterial({
    color: 0x3a4555,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
    fog: true,
  });

  const puffs: CloudPuff[] = [];
  const puffGeo = new THREE.SphereGeometry(1, 10, 8);

  const layouts: [number, number, number, number][] = [
    [-22, CLOUD_BASE_Y, -18, 9],
    [18, CLOUD_BASE_Y + 2, -24, 11],
    [0, CLOUD_BASE_Y + 4, -32, 13],
    [-30, CLOUD_BASE_Y - 1, 8, 8],
    [28, CLOUD_BASE_Y, 4, 10],
    [-12, CLOUD_BASE_Y + 1, 14, 7],
    [14, CLOUD_BASE_Y - 2, 20, 8],
    [-8, CLOUD_BASE_Y + 3, -8, 6],
    [6, CLOUD_BASE_Y + 2, -42, 12],
  ];

  for (const [x, y, z, r] of layouts) {
    const mesh = new THREE.Mesh(puffGeo, cloudMat.clone());
    mesh.position.set(x, y, z);
    mesh.scale.set(r * 1.35, r * 0.45, r);
    mesh.renderOrder = 15;
    group.add(mesh);
    puffs.push({
      mesh,
      baseOpacity: 0.32 + Math.random() * 0.12,
      flashBoost: 0,
    });
  }

  const lightningLight = new THREE.DirectionalLight(0xd8e8ff, 0);
  lightningLight.position.set(8, 45, -12);
  lightningLight.target.position.set(0, 0, 0);
  group.add(lightningLight);
  group.add(lightningLight.target);

  let timeUntilFlash = 6 + Math.random() * 8;
  let flashTimer = 0;
  let flashPuff: CloudPuff | null = null;

  function triggerFlash(onThunder?: () => void) {
    flashTimer = 0.12 + Math.random() * 0.18;
    flashPuff = puffs[Math.floor(Math.random() * puffs.length)]!;
    flashPuff.flashBoost = 1;
        lightningLight.intensity = 0.9 + Math.random() * 0.6;
    lightningLight.position.set(
      flashPuff.mesh.position.x + (Math.random() - 0.5) * 8,
      flashPuff.mesh.position.y + 6,
      flashPuff.mesh.position.z
    );
    onThunder?.();
  }

  return {
    group,
    lightningLight,

    update(dt, camera, rainIntensity, onThunder) {
      const active = rainIntensity > 0.55;
      group.visible = active;
      if (!active) {
        lightningLight.intensity = 0;
        return;
      }

      group.position.set(camera.position.x, 0, camera.position.z);

      const drift = dt * 0.4;
      for (const puff of puffs) {
        puff.mesh.position.x += Math.sin(puff.mesh.position.z * 0.1) * drift;
        if (puff.flashBoost > 0) {
          puff.flashBoost = Math.max(0, puff.flashBoost - dt * 5);
        }
        const mat = puff.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity =
          puff.baseOpacity +
          puff.flashBoost * 0.35 * rainIntensity;
        const lift = 1 + puff.flashBoost * 0.08;
        puff.mesh.scale.y =
          (puff.mesh.scale.x / 1.35) * 0.45 * lift;
      }

      if (flashTimer > 0) {
        flashTimer -= dt;
        lightningLight.intensity = Math.max(
          0,
          lightningLight.intensity - dt * 14
        );
      } else {
        lightningLight.intensity = 0;
      }

      timeUntilFlash -= dt;
      if (timeUntilFlash <= 0) {
        triggerFlash(onThunder);
        timeUntilFlash = 5 + Math.random() * 14 * (1.1 - rainIntensity * 0.5);
      }
    },

    dispose() {
      puffGeo.dispose();
      for (const puff of puffs) {
        (puff.mesh.material as THREE.MeshBasicMaterial).dispose();
      }
      cloudMat.dispose();
      group.removeFromParent();
    },
  };
}
