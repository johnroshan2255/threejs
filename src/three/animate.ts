import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { PhysicsObject } from '../physics/physics';
import { getWorld } from '../physics/world';
import type { CarEntity } from '../entities/car/createCar';
import { CarController } from '../entities/car/carController';
import { CarInput } from '../entities/car/carInput';

const _chassisQuat = new THREE.Quaternion();
const _wheelSteerQuat = new THREE.Quaternion();
const _wheelSpinQuat = new THREE.Quaternion();
const _baseWheelQuat = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(0, 0, Math.PI / 2)
);
const _yAxis = new THREE.Vector3(0, 1, 0);
const _xAxis = new THREE.Vector3(1, 0, 0);
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

    _wheelSteerQuat.setFromAxisAngle(_yAxis, steering);
    _wheelSpinQuat.setFromAxisAngle(_xAxis, spin);

    wheel.quaternion
      .copy(_chassisQuat)
      .multiply(_wheelSteerQuat)
      .multiply(_wheelSpinQuat)
      .multiply(_baseWheelQuat);
  });
}

function updateGrassWind(grass: PhysicsObject, car: CarEntity) {
  const material = grass.mesh.material as THREE.MeshStandardMaterial;
  const shader = material.userData.shader as
    | { uniforms: { time: { value: number }; ballPosition: { value: THREE.Vector3 } } }
    | undefined;

  if (!shader) return;

  shader.uniforms.time.value = performance.now() * 0.001;
  shader.uniforms.ballPosition.value.copy(car.mesh.position);
}

export function startAnimationLoop(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  controls: OrbitControls,
  grass: PhysicsObject,
  _terrain: unknown,
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

  function animate() {
    requestAnimationFrame(animate);

    input.update(world.timestep);
    world.step();
    syncCar(car);
    updateGrassWind(grass, car);

    controls.update();
    renderer.render(scene, camera);
  }

  animate();
}
