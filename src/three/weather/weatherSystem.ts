import * as THREE from 'three';
import { updateSunLighting, type SceneLights } from '../lights';
import type { BeachCoast } from '../meshes/beachCoast';
import {
  createRainParticles,
  type RainGroundHit,
  type RainParticles,
} from './rainParticles';
import { createStormClouds, type StormClouds } from './stormClouds';
import { createWeatherAudio, type WeatherAudio } from './weatherAudio';
import {
  lerpPreset,
  nextWeatherInCycle,
  pickRandomWeather,
  WEATHER_CHANGE_MAX_SEC,
  WEATHER_CHANGE_MIN_SEC,
  WEATHER_PRESETS,
  WEATHER_TRANSITION_SEC,
  type WeatherId,
  type WeatherPreset,
} from './weatherPresets';

export type WeatherState = {
  preset: WeatherPreset;
  fogColor: THREE.Color;
  fogNear: number;
  fogFar: number;
};

export type WeatherSystem = {
  state: WeatherState;
  rain: RainParticles;
  storm: StormClouds;
  audio: WeatherAudio;
  resumeAudio: () => void;
  update: (
    dt: number,
    camera: THREE.Camera,
    onRainGroundHit?: RainGroundHit
  ) => void;
  getRainIntensity: () => number;
  getEvaporationRate: () => number;
  apply: (
    scene: THREE.Scene,
    fog: THREE.Fog,
    lights: SceneLights,
    renderer: THREE.WebGLRenderer,
    beachCoast: BeachCoast,
    followX: number,
    followY: number,
    followZ: number
  ) => void;
  getGrassWindScale: () => number;
  /** Advance clear → summer → rain → clear (10s blend). */
  cycleWeather: () => void;
  dispose: () => void;
};

function clonePreset(p: WeatherPreset): WeatherPreset {
  return { ...p, sunDirection: p.sunDirection.clone() };
}

function scheduleNextChange(): number {
  return (
    WEATHER_CHANGE_MIN_SEC +
    Math.random() * (WEATHER_CHANGE_MAX_SEC - WEATHER_CHANGE_MIN_SEC)
  );
}

export function createWeatherSystem(
  initial: WeatherId = pickRandomWeather()
): WeatherSystem {
  let activeId: WeatherId = initial;
  let active = clonePreset(WEATHER_PRESETS[initial]);
  let targetId = pickRandomWeather(initial);
  let transitionT = 1;
  let timeUntilChange = scheduleNextChange();

  const fogColor = new THREE.Color(active.fogColor);
  const rain = createRainParticles();
  const storm = createStormClouds();
  const audio = createWeatherAudio();

  const state: WeatherState = {
    preset: active,
    fogColor,
    fogNear: active.fogNear,
    fogFar: active.fogFar,
  };

  function startTransition(id: WeatherId) {
    if (id === activeId && transitionT >= 1) return;
    targetId = id;
    transitionT = 0;
  }

  function finishTransitionIfNeeded() {
    if (transitionT >= 1) return;
    activeId = targetId;
    active = clonePreset(WEATHER_PRESETS[targetId]);
    transitionT = 1;
  }

  function syncStateFromPreset(p: WeatherPreset) {
    state.preset = p;
    state.fogColor.setHex(p.fogColor);
    state.fogNear = p.fogNear;
    state.fogFar = p.fogFar;
  }

  return {
    state,
    rain,
    storm,
    audio,

    resumeAudio: () => audio.resume(),

    update(dt, camera, onRainGroundHit) {
      if (transitionT < 1) {
        transitionT = Math.min(1, transitionT + dt / WEATHER_TRANSITION_SEC);
        if (transitionT >= 1) {
          activeId = targetId;
          active = clonePreset(WEATHER_PRESETS[targetId]);
        }
      } else {
        timeUntilChange -= dt;
        if (timeUntilChange <= 0) {
          timeUntilChange = scheduleNextChange();
          startTransition(pickRandomWeather(activeId));
        }
      }

      const p =
        transitionT >= 1
          ? active
          : lerpPreset(active, WEATHER_PRESETS[targetId], transitionT);
      syncStateFromPreset(p);

      rain.update(dt, camera, p.rainIntensity, onRainGroundHit);
      storm.update(dt, camera, p.rainIntensity, () => audio.playThunder());
      audio.update(p.rainIntensity, dt);
    },

    getRainIntensity: () => state.preset.rainIntensity,

    getEvaporationRate: () => state.preset.evaporationRate,

    apply(scene, fog, lights, renderer, beachCoast, followX, followY, followZ) {
      const p = state.preset;

      scene.background = state.fogColor;
      fog.color.copy(state.fogColor);
      fog.near = state.fogNear;
      fog.far = state.fogFar;

      renderer.setClearColor(state.fogColor);

      updateSunLighting(lights, followX, followY, followZ, p);

      beachCoast.material.uniforms.fogColor!.value.copy(state.fogColor);
      beachCoast.material.uniforms.fogNear!.value = state.fogNear;
      beachCoast.material.uniforms.fogFar!.value = state.fogFar;
      beachCoast.material.uniforms.uSunDirection!.value.copy(p.sunDirection);
      beachCoast.material.uniforms.uDeepColor!.value.setHex(p.waterDeep);
      beachCoast.material.uniforms.uShallowColor!.value.setHex(p.waterShallow);
    },

    getGrassWindScale: () => state.preset.grassWindScale,

    cycleWeather() {
      finishTransitionIfNeeded();
      const next = nextWeatherInCycle(activeId);
      if (next === activeId) return;
      startTransition(next);
      timeUntilChange = scheduleNextChange();
    },

    dispose() {
      rain.dispose();
      storm.dispose();
      audio.dispose();
    },
  };
}
