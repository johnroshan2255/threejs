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
    fogColor: 0xc88868,
    fogNear: 30,
    fogFar: 48,
    clearColor: 0xc88868,
    ambientColor: 0xbfd4ff,
    ambientIntensity: 0.45,
    sunColor: 0xfff5e6,
    sunIntensity: 1.6,
    sunDirection: new THREE.Vector3(0.45, 0.85, 0.35).normalize(),
    grassWindScale: 1,
    rainIntensity: 0,
    evaporationRate: 0.01,
    waterDeep: 0x0c4a6e,
    waterShallow: 0x48b8c8,
  },
  summer: {
    id: 'summer',
    fogColor: 0xd8a070,
    fogNear: 34,
    fogFar: 58,
    clearColor: 0xe8b888,
    ambientColor: 0xffe8c8,
    ambientIntensity: 0.58,
    sunColor: 0xfff0b0,
    sunIntensity: 1.85,
    sunDirection: new THREE.Vector3(0.35, 0.92, 0.25).normalize(),
    grassWindScale: 1.15,
    rainIntensity: 0,
    evaporationRate: 0.095,
    waterDeep: 0x0a5a7a,
    waterShallow: 0x5ad0e0,
  },
  rain: {
    id: 'rain',
    fogColor: 0x6a7588,
    fogNear: 22,
    fogFar: 38,
    clearColor: 0x5a6475,
    ambientColor: 0x9aa8c0,
    ambientIntensity: 0.32,
    sunColor: 0xc8d4e8,
    sunIntensity: 0.55,
    sunDirection: new THREE.Vector3(0.25, 0.75, 0.45).normalize(),
    grassWindScale: 1.35,
    rainIntensity: 1,
    evaporationRate: 0,
    waterDeep: 0x1a3a52,
    waterShallow: 0x3a7a8a,
  },
};

/** Seconds between random weather changes. */
export const WEATHER_CHANGE_MIN_SEC = 150;
export const WEATHER_CHANGE_MAX_SEC = 280;
export const WEATHER_TRANSITION_SEC = 10;

const WEIGHTS: { id: WeatherId; weight: number }[] = [
  { id: 'clear', weight: 0.42 },
  { id: 'summer', weight: 0.33 },
  { id: 'rain', weight: 0.25 },
];

export function pickRandomWeather(exclude?: WeatherId): WeatherId {
  const pool = exclude
    ? WEIGHTS.filter((w) => w.id !== exclude)
    : WEIGHTS;
  const total = pool.reduce((s, w) => s + w.weight, 0);
  let r = Math.random() * total;
  for (const entry of pool) {
    r -= entry.weight;
    if (r <= 0) return entry.id;
  }
  return pool[pool.length - 1]!.id;
}

export function lerpPreset(
  a: WeatherPreset,
  b: WeatherPreset,
  t: number
): WeatherPreset {
  const c1 = new THREE.Color();
  const c2 = new THREE.Color();
  const dir = new THREE.Vector3();

  const lerpColor = (hex1: number, hex2: number) => {
    c1.setHex(hex1);
    c2.setHex(hex2);
    return c1.lerp(c2, t).getHex();
  };

  dir.copy(a.sunDirection).lerp(b.sunDirection, t);
  if (dir.lengthSq() > 1e-8) dir.normalize();
  else dir.copy(b.sunDirection);

  return {
    id: t < 0.5 ? a.id : b.id,
    fogColor: lerpColor(a.fogColor, b.fogColor),
    fogNear: THREE.MathUtils.lerp(a.fogNear, b.fogNear, t),
    fogFar: THREE.MathUtils.lerp(a.fogFar, b.fogFar, t),
    clearColor: lerpColor(a.clearColor, b.clearColor),
    ambientColor: lerpColor(a.ambientColor, b.ambientColor),
    ambientIntensity: THREE.MathUtils.lerp(
      a.ambientIntensity,
      b.ambientIntensity,
      t
    ),
    sunColor: lerpColor(a.sunColor, b.sunColor),
    sunIntensity: THREE.MathUtils.lerp(a.sunIntensity, b.sunIntensity, t),
    sunDirection: dir,
    grassWindScale: THREE.MathUtils.lerp(a.grassWindScale, b.grassWindScale, t),
    rainIntensity: THREE.MathUtils.lerp(a.rainIntensity, b.rainIntensity, t),
    evaporationRate: THREE.MathUtils.lerp(
      a.evaporationRate,
      b.evaporationRate,
      t
    ),
    waterDeep: lerpColor(a.waterDeep, b.waterDeep),
    waterShallow: lerpColor(a.waterShallow, b.waterShallow),
  };
}
