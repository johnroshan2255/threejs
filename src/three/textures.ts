import * as THREE from 'three';

function loadRepeatTexture(path: string, repeat: [number, number]): THREE.Texture {
  const texture = new THREE.TextureLoader().load(path);
  texture.repeat.set(repeat[0], repeat[1]);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

export const brickTexture = loadRepeatTexture('/brick.jpeg', [1, 1]);
export const grassTexture = loadRepeatTexture('/grass.avif', [50, 50]);
