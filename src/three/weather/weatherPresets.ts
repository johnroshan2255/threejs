import * as THREE from 'three';

export type WeatherId = 'clear' | 'summer' | 'rain';

/** Manual P-key cycle order. */
export const WEATHER_CYCLE: readonly WeatherId[] = [
  'clear',
  'summer',
  'rain',
];

export function nextWeatherInCycle(current: WeatherId): WeatherId {
  const i = WEATHER_CYCLE.indexOf(current);
  return WEATHER_CYCLE[(i + 1) % WEATHER_CYCLE.length]!;
}

export type WeatherPreset = {
  id: WeatherId;
  fogColor: number;
  fogNear: number;
  fogFar: number;
  clearColor: number;
  ambientColor: number;
  ambientIntensity: number;
  sunColor: number;
  sunIntensity: number;
  sunDirection: THREE.Vector3;
  grassWindScale: number;
  rainIntensity: number;
  /** Water depth lost per second on terrain puddles. */
  evaporationRate: number;
  waterDeep: number;
  waterShallow: number;
};

export const WEATHER_PRESETS: Record<WeatherId, WeatherPreset> = {
  clear: {
    id: 'clear',
    fogColor: 0x94b8d4,
    fogNear: 35,
    fogFar: 65,
    clearColor: 0x94b8d4,
    ambientColor: 0x98b0cc,
    ambientIntensity: 0.85,   // Drastically boosted to lift shadows
    sunColor: 0xfff6e6,
    sunIntensity: 0.65,       // Drastically reduced to prevent neon blowout
    sunDirection: new THREE.Vector3(0.45, 0.85, 0.35).normalize(),
    grassWindScale: 1,
    rainIntensity: 0,
    evaporationRate: 0.01,
    waterDeep: 0x0c4a6e,
    waterShallow: 0x48b8c8,
  },
  summer: {
    id: 'summer',
    fogColor: 0x9ab8d0,
    fogNear: 38,
    fogFar: 70,
    clearColor: 0x9ab8d0,
    ambientColor: 0xa0b8d4,
    ambientIntensity: 0.90,   // Drastically boosted to lift shadows
    sunColor: 0xfff8ee,
    sunIntensity: 0.70,       // Drastically reduced to prevent neon blowout
    sunDirection: new THREE.Vector3(0.3, 0.9, 0.25).normalize(),
    grassWindScale: 0.8,
    rainIntensity: 0,
    evaporationRate: 0.02,
    waterDeep: 0x0e5a84,
    waterShallow: 0x58c4d4,
  },
  rain: {
    id: 'rain',
    fogColor: 0x5a6874,
    fogNear: 20,
    fogFar: 45,
    clearColor: 0x5a6874,
    ambientColor: 0x8898a8,
    ambientIntensity: 0.45,
    sunColor: 0x90a0b0,
    sunIntensity: 0.7,
    sunDirection: new THREE.Vector3(0.2, 0.95, 0.1).normalize(),
    grassWindScale: 2.2,
    rainIntensity: 0.85,
    evaporationRate: 0.0,
    waterDeep: 0x082e46,
    waterShallow: 0x347c8c,
  },
};

export const WEATHER_TRANSITION_SEC = 10;
export const WEATHER_CHANGE_MIN_SEC = 45;
export const WEATHER_CHANGE_MAX_SEC = 90;

export function pickRandomWeather(avoid?: WeatherId): WeatherId {
  const ids = WEATHER_CYCLE.filter((id) => id !== avoid);
  return ids[Math.floor(Math.random() * ids.length)]!;
}

export function lerpPreset(
  a: WeatherPreset,
  b: WeatherPreset,
  t: number
): WeatherPreset {
  const clampedT = Math.max(0, Math.min(1, t));
  const cFog = new THREE.Color(a.fogColor).lerp(
    new THREE.Color(b.fogColor),
    clampedT
  );
  const cClear = new THREE.Color(a.clearColor).lerp(
    new THREE.Color(b.clearColor),
    clampedT
  );
  const cAmb = new THREE.Color(a.ambientColor).lerp(
    new THREE.Color(b.ambientColor),
    clampedT
  );
  const cSun = new THREE.Color(a.sunColor).lerp(
    new THREE.Color(b.sunColor),
    clampedT
  );
  const cDeep = new THREE.Color(a.waterDeep).lerp(
    new THREE.Color(b.waterDeep),
    clampedT
  );
  const cShallow = new THREE.Color(a.waterShallow).lerp(
    new THREE.Color(b.waterShallow),
    clampedT
  );

  const sunDir = a.sunDirection.clone().lerp(b.sunDirection, clampedT).normalize();

  return {
    id: b.id,
    fogColor: cFog.getHex(),
    fogNear: THREE.MathUtils.lerp(a.fogNear, b.fogNear, clampedT),
    fogFar: THREE.MathUtils.lerp(a.fogFar, b.fogFar, clampedT),
    clearColor: cClear.getHex(),
    ambientColor: cAmb.getHex(),
    ambientIntensity: THREE.MathUtils.lerp(
      a.ambientIntensity,
      b.ambientIntensity,
      clampedT
    ),
    sunColor: cSun.getHex(),
    sunIntensity: THREE.MathUtils.lerp(
      a.sunIntensity,
      b.sunIntensity,
      clampedT
    ),
    sunDirection: sunDir,
    grassWindScale: THREE.MathUtils.lerp(
      a.grassWindScale,
      b.grassWindScale,
      clampedT
    ),
    rainIntensity: THREE.MathUtils.lerp(
      a.rainIntensity,
      b.rainIntensity,
      clampedT
    ),
    evaporationRate: THREE.MathUtils.lerp(
      a.evaporationRate,
      b.evaporationRate,
      clampedT
    ),
    waterDeep: cDeep.getHex(),
    waterShallow: cShallow.getHex(),
  };
}
