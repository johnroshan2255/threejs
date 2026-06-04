import * as THREE from 'three';

import { createLights, type SceneLights } from './lights';
import { createCar } from '../entities/car/createCar';
import { ChunkManager } from '../terrain/chunkManager';
import { applySceneFog } from './sceneFog';
import { createBeachCoast, type BeachCoast } from './meshes/beachCoast';
import { createWeatherSystem, type WeatherSystem } from './weather/weatherSystem';

export async function createScene(): Promise<{
  scene: THREE.Scene;
  fog: THREE.Fog;
  lights: SceneLights;
  weather: WeatherSystem;
  chunkManager: ChunkManager;
  car: Awaited<ReturnType<typeof createCar>>;
  beachCoast: BeachCoast;
}> {
  const scene = new THREE.Scene();
  const fog = applySceneFog(scene);
  const lights = createLights();

  const chunkManager = new ChunkManager(scene);
  chunkManager.loadAround(0, 0);

  const beachCoast = createBeachCoast(scene);
  const car = await createCar();
  const weather = createWeatherSystem();

  scene.add(lights.sunTarget);
  for (const light of lights.all) {
    scene.add(light);
  }

  scene.add(weather.rain.points);
  scene.add(weather.storm.group);
  scene.add(car.mesh);
  car.wheels.forEach((w) => car.mesh.add(w));

  return { scene, fog, lights, weather, chunkManager, car, beachCoast };
}
