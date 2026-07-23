import * as THREE from 'three';
import type { PerspectiveCamera } from 'three';
import type { WebGLRenderer } from 'three';
import { getWorld } from '../physics/world';
import type { CarEntity } from '../entities/car/createCar';
import { CarController } from '../entities/car/carController';
import { CarInput } from '../entities/car/carInput';
import { resetCarUpright } from '../entities/car/resetCar';
import type { ChunkManager } from '../terrain/chunkManager';
import { updateChaseCamera } from './chaseCamera';
import { ChaseCameraInput } from './chaseCameraInput';
import type { SceneLights } from './lights';
import type { WeatherSystem } from './weather/weatherSystem';
import { WeatherInput } from './weather/weatherInput';
import { createMobileControls } from '../input/mobileControls';
import type { BeachCoast } from './meshes/beachCoast';

const _wheelSteerQuat = new THREE.Quaternion();
const _wheelSpinQuat = new THREE.Quaternion();
const _steerAxis = new THREE.Vector3(0, 1, 0);
const _spinAxis = new THREE.Vector3(1, 0, 0);

function syncCar(car: CarEntity) {
  const pos = car.body.translation();
  const rot = car.body.rotation();

  car.mesh.position.set(pos.x, pos.y, pos.z);
  car.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);

  const { vehicle } = car;
  const frontSteer =
    vehicle.wheelSteering(car.steeringWheelIndices[0]) ?? 0;

  car.wheels.forEach((wheel, i) => {
    const connection = vehicle.wheelChassisConnectionPointCs(i);
    const suspension = vehicle.wheelSuspensionLength(i);
    if (!connection) return;

    wheel.position.set(
      connection.x,
      connection.y - (suspension ?? 0),
      connection.z
    );

    const steering = car.steeringWheelIndices.includes(i) ? frontSteer : 0;
    const spin = vehicle.wheelRotation(i) ?? 0;

    _wheelSteerQuat.setFromAxisAngle(_steerAxis, steering);
    _wheelSpinQuat.setFromAxisAngle(_spinAxis, spin);
    wheel.quaternion.copy(_wheelSteerQuat).multiply(_wheelSpinQuat);
  });
}

const _wheelWorldPos = [
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
];

function updateGrassEffects(
  chunkManager: ChunkManager,
  car: CarEntity,
  timeSec: number,
  grassWindScale: number
) {
  car.wheels.forEach((wheel, i) => {
    wheel.getWorldPosition(_wheelWorldPos[i]!);
  });
  chunkManager.stampGrassCrush(_wheelWorldPos, timeSec);
  chunkManager.updateGrassShaders(car.mesh.position, timeSec, grassWindScale);
}

export function startAnimationLoop(
  scene: THREE.Scene,
  camera: PerspectiveCamera,
  renderer: WebGLRenderer,
  fog: THREE.Fog,
  lights: SceneLights,
  weather: WeatherSystem,
  chunkManager: ChunkManager,
  car: CarEntity,
  beachCoast: BeachCoast
) {
  const world = getWorld();

  const controller = new CarController(
    car.body,
    car.vehicle,
    car.driveFrontAxleIndices,
    car.driveRearAxleIndices,
    car.steeringWheelIndices
  );
  const input = new CarInput(
    controller,
    () => {
      resetCarUpright(car, controller);
      syncCar(car);
    },
    () => weather.resumeAudio()
  );
  createMobileControls(input);
  const cameraInput = new ChaseCameraInput(renderer.domElement);
  new WeatherInput(weather);

  const fpsCounterEl = document.getElementById('fps-counter');
  let frameCount = 0;
  let lastFpsTime = performance.now();
  let lastTime = performance.now();

  function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    let frameDt = (now - lastTime) * 0.001;
    lastTime = now;

    if (frameDt <= 0 || isNaN(frameDt)) frameDt = 1 / 60;
    const clampedDt = Math.min(Math.max(frameDt, 0.001), 0.033);

    frameCount++;
    if (now - lastFpsTime >= 400) {
      const fps = Math.round((frameCount * 1000) / (now - lastFpsTime));
      if (fpsCounterEl) {
        fpsCounterEl.textContent = `${fps} FPS`;
      }
      frameCount = 0;
      lastFpsTime = now;
    }

    world.timestep = clampedDt;

    input.applyInput(clampedDt);
    world.step();
    input.afterPhysics(clampedDt);

    syncCar(car);
    car.lights.update(weather.getRainIntensity(), controller.isBraking());

    const pos = car.body.translation();

    chunkManager.update(pos.x, pos.z);
    const timeSec = now * 0.001;

    weather.update(clampedDt, camera, (x, z, amount) => {
      chunkManager.addPuddleWater(x, z, amount);
    });
    chunkManager.updatePuddles(
      clampedDt,
      pos.x,
      pos.z,
      weather.getRainIntensity(),
      weather.getEvaporationRate()
    );
    weather.apply(scene, fog, lights, renderer, beachCoast, pos.x, pos.y, pos.z);

    updateGrassEffects(chunkManager, car, timeSec, weather.getGrassWindScale());
    beachCoast.update(timeSec, pos.z, weather.state.fogColor);
    updateChaseCamera(camera, car, cameraInput, clampedDt);

    renderer.render(scene, camera);
  }

  animate();
}
