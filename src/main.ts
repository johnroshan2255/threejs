import './styles.css';
import { initPhysics } from './physics/world';
import { startAnimationLoop } from './three/animate';
import { createCamera } from './three/camera';
import { createControls } from './three/controls';
import { createRenderer } from './three/renderer';
import { handleResize } from './three/resize';
import { createScene } from './three/scene';

await initPhysics();

const camera = createCamera();
const renderer = createRenderer();
const controls = createControls(camera, renderer.domElement);

const { scene, grass, terrain, car } = createScene();

handleResize(camera, renderer);

startAnimationLoop(
  scene,
  camera,
  renderer,
  controls,
  grass,
  terrain,
  car
);