import './styles.css';
import { initPhysics } from './physics/world';
import { startAnimationLoop } from './three/animate';
import { createCamera } from './three/camera';
import { createRenderer } from './three/renderer';
import { handleResize } from './three/resize';
import { createScene } from './three/scene';
await initPhysics();

const camera = createCamera();
const renderer = createRenderer();
renderer.domElement.style.cursor = 'grab';

const { scene, fog, lights, weather, chunkManager, car, beachCoast } =
  await createScene();

weather.apply(scene, fog, lights, renderer, beachCoast, 0, 0, 0);

const hint = document.createElement('div');
hint.id = 'controls-hint';
hint.textContent = 'WASD · Space brake · R reset · P change weather';
document.body.appendChild(hint);

handleResize(camera, renderer, weather.rain);

startAnimationLoop(
  scene,
  camera,
  renderer,
  fog,
  lights,
  weather,
  chunkManager,
  car,
  beachCoast
);
