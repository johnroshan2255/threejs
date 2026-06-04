import type * as THREE from 'three';

type ResizeListener = {
  onResize: (width: number, height: number) => void;
};

export function handleResize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  extra?: ResizeListener
): void {
  const apply = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    extra?.onResize(w, h);
  };
  window.addEventListener('resize', apply);
  apply();
}
