import * as THREE from 'three';
import type { PerspectiveCamera } from 'three';
import type { WebGLRenderer } from 'three';
import { getWorld } from '../physics/world';
import type { CarEntity } from '../entities/car/createCar';
import { CarController } from '../entities/car/carController';
import { CarInput } from '../entities/car/carInput';
import type { ChunkManager } from '../terrain/chunkManager';
import { updateChaseCamera } from './chaseCamera';
import { ChaseCameraInput } from './chaseCameraInput';
import { updateDrivingFog } from './sceneFog';

const _chassisQuat = new THREE.Quaternion();
const _wheelSteerQuat = new THREE.Quaternion();
const _wheelSpinQuat = new THREE.Quaternion();
const _steerAxis = new THREE.Vector3(0, 1, 0);
const _spinAxis = new THREE.Vector3(1, 0, 0);
const _wheelLocal = new THREE.Vector3();

function syncCar(car: CarEntity) {
  const pos = car.body.translation();
  const rot = car.body.rotation();

  car.mesh.position.set(pos.x, pos.y, pos.z);
  _chassisQuat.set(rot.x, rot.y, rot.z, rot.w);
  car.mesh.quaternion.copy(_chassisQuat);

  const { vehicle } = car;

  const frontSteer =
    vehicle.wheelSteering(car.frontWheelIndices[0]) ?? 0;

  car.wheels.forEach((wheel, i) => {
    const connection = vehicle.wheelChassisConnectionPointCs(i);
    const suspension = vehicle.wheelSuspensionLength(i);

    if (!connection) return;

    _wheelLocal.set(
      connection.x,
      connection.y - (suspension ?? 0),
      connection.z
    );
    _wheelLocal.applyQuaternion(_chassisQuat);

    wheel.position.set(
      pos.x + _wheelLocal.x,
      pos.y + _wheelLocal.y,
      pos.z + _wheelLocal.z
    );

    const isFront = car.frontWheelIndices.includes(i);
    const steering = isFront ? frontSteer : 0;
    const spin = vehicle.wheelRotation(i) ?? 0;

    // Steer around chassis Y, spin around chassis X (Rapier axle). Mesh is already
    // oriented on X via tire.rotation.z — do not add an extra Z-90 (that stood wheels up).
    _wheelSteerQuat.setFromAxisAngle(_steerAxis, steering);
    _wheelSpinQuat.setFromAxisAngle(_spinAxis, spin);

    wheel.quaternion
      .copy(_chassisQuat)
      .multiply(_wheelSteerQuat)
      .multiply(_wheelSpinQuat);
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
  timeSec: number
) {
  car.wheels.forEach((wheel, i) => {
    _wheelWorldPos[i]?.copy(wheel.position);
  });
  chunkManager.stampGrassCrush(_wheelWorldPos, timeSec);
  chunkManager.updateGrassShaders(car.mesh.position, timeSec);
}

export function startAnimationLoop(
  scene: THREE.Scene,
  camera: PerspectiveCamera,
  renderer: WebGLRenderer,
  fog: THREE.Fog,
  chunkManager: ChunkManager,
  car: CarEntity
) {
  const world = getWorld();
  world.timestep = 1 / 60;

  const controller = new CarController(
    car.body,
    car.vehicle,
    car.frontWheelIndices,
    car.rearWheelIndices
  );
  const input = new CarInput(controller);
  const cameraInput = new ChaseCameraInput(renderer.domElement);

  function animate() {
    requestAnimationFrame(animate);

    const dt = world.timestep;

    input.applyInput(dt);
    world.step();
    input.afterPhysics(dt);
    syncCar(car);

    const pos = car.body.translation();
    const vel = car.body.linvel();

    chunkManager.update(pos.x, pos.z, vel.x, vel.z);
    updateGrassEffects(chunkManager, car, performance.now() * 0.001);
    updateDrivingFog(fog, car);
    updateChaseCamera(camera, car, cameraInput, dt);

    renderer.render(scene, camera);
  }

  animate();
}
