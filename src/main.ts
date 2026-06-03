import './styles.css';
import { initPhysics } from './physics/world';
import { startAnimationLoop } from './three/animate';
import { createCamera } from './three/camera';
import { createRenderer } from './three/renderer';
import { handleResize } from './three/resize';
import { createScene } from './three/scene';
import { FOG_COLOR } from './three/sceneFog';

await initPhysics();

const camera = createCamera();
const renderer = createRenderer();
renderer.setClearColor(FOG_COLOR);
renderer.domElement.style.cursor = 'grab';

const { scene, fog, chunkManager, car } = createScene();

handleResize(camera, renderer);

startAnimationLoop(scene, camera, renderer, fog, chunkManager, car);
