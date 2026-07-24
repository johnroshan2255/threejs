import './styles.css';
import * as THREE from 'three';
import { initPhysics } from './physics/world';
import { startAnimationLoop } from './three/animate';
import { createCamera } from './three/camera';
import { createRenderer } from './three/renderer';
import { handleResize } from './three/resize';
import { createScene } from './three/scene';
import { createLoadingScreen } from './ui/loadingScreen';

const loading = createLoadingScreen();

function createAssetManager(
  onProgress: (ratio: number) => void
): THREE.LoadingManager {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    if (total > 0) onProgress(loaded / total);
  };
  return manager;
}

async function bootstrap() {
  loading.setStatus('Initializing physics…');
  loading.setProgress(0.05);
  await initPhysics();
  loading.setProgress(0.25);

  loading.setStatus('Loading world…');
  const manager = createAssetManager((ratio) => {
    // Physics done at 25%; assets fill 25% → 90%.
    loading.setProgress(0.25 + ratio * 0.65);
  });

  const camera = createCamera();
  const renderer = createRenderer();
  renderer.domElement.style.cursor = 'grab';

  const { scene, fog, lights, weather, chunkManager, car, beachCoast } =
    await createScene(manager);

  weather.apply(scene, fog, lights, renderer, beachCoast, 0, 0, 0);

  loading.setStatus('Almost ready…');
  loading.setProgress(0.95);

  // Warm the first frame so Start Game isn't a blank hitch.
  renderer.render(scene, camera);
  loading.setProgress(1);
  loading.setStatus('Ready');

  loading.showStartButton(() => {
    loading.hide();

    const hint = document.createElement('div');
    hint.id = 'controls-hint';
    hint.textContent = 'WASD · Space brake · R reset · P change weather';
    document.body.appendChild(hint);

    const fpsCounter = document.createElement('div');
    fpsCounter.id = 'fps-counter';
    fpsCounter.textContent = '60 FPS';
    document.body.appendChild(fpsCounter);

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
  });
}

bootstrap().catch((err) => {
  console.error(err);
  loading.setStatus('Failed to load. Check the console.');
});
