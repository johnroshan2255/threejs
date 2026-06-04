import * as THREE from 'three';
import {
  collectBodyLampMaterials,
  setColormapLampGlow,
} from './carBodyLampGlow';
import type { CarLightAnchors } from './lightAnchors';

const RAIN_HEADLIGHT_THRESHOLD = 0.08;

export type CarLights = {
  group: THREE.Group;
  update: (rainIntensity: number, braking: boolean) => void;
  dispose: () => void;
};

export function createCarLights(
  anchors: CarLightAnchors,
  scale: number,
  bodyRoot: THREE.Object3D
): CarLights {
  const group = new THREE.Group();
  group.name = 'car-lights';

  const bodyMaterials = collectBodyLampMaterials(bodyRoot);
  const headSpots: THREE.SpotLight[] = [];
  const fwd = anchors.forward;

  for (const pos of [anchors.headLeft, anchors.headRight]) {
    const spot = new THREE.SpotLight(0xffeebb, 0, 28 * scale, Math.PI / 6, 0.5, 1.2);
    spot.position.copy(pos);
    spot.target.position.copy(pos.clone().add(fwd.clone().multiplyScalar(18 * scale)));
    group.add(spot);
    group.add(spot.target);
    headSpots.push(spot);
  }

  let headBlend = 0;
  let brakeBlend = 0;

  return {
    group,
    update(rainIntensity, braking) {
      const headTarget = rainIntensity > RAIN_HEADLIGHT_THRESHOLD ? 1 : 0;
      const brakeTarget = braking ? 1 : 0;

      headBlend += (headTarget - headBlend) * 0.14;
      brakeBlend += (brakeTarget - brakeBlend) * 0.28;

      const headGlow = headBlend * (2.2 + rainIntensity * 1.8);
      const brakeGlow = brakeBlend * 3.2;
      const spotIntensity = headBlend * (0.9 + rainIntensity * 1.6);

      setColormapLampGlow(bodyMaterials, headGlow, brakeGlow);

      for (const spot of headSpots) {
        spot.intensity = spotIntensity;
      }
    },
    dispose() {
      for (const spot of headSpots) {
        spot.dispose();
      }
      setColormapLampGlow(bodyMaterials, 0, 0);
      group.removeFromParent();
    },
  };
}
