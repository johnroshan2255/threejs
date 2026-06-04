import * as THREE from 'three';

function loadRepeatTexture(path: string, repeat: [number, number]): THREE.Texture {
  const texture = new THREE.TextureLoader().load(path);
  texture.repeat.set(repeat[0], repeat[1]);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.NearestFilter;
  return texture;
}

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Mars-like dusty ground: terracotta soil covered in small pebbles. */
function createGroundTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const dustA = '#b86848';
  const dustB = '#a45438';

  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.72
  );
  grad.addColorStop(0, '#c07858');
  grad.addColorStop(0.55, dustA);
  grad.addColorStop(1, dustB);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  const data = img.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = hash2(x * 0.35, y * 0.35);
      const grain = hash2(x * 1.7 + 90, y * 1.9);

      let r = data[i]!;
      let g = data[i + 1]!;
      let b = data[i + 2]!;

      r += (grain - 0.5) * 18;
      g += (grain - 0.5) * 14;
      b += (grain - 0.5) * 10;

      if (n > 0.52) {
        const pebble = hash2(x * 0.12 + 40, y * 0.11);
        const lift = (pebble - 0.5) * 55;
        r += lift + 12;
        g += lift * 0.75 + 6;
        b += lift * 0.55 + 2;
      } else if (n > 0.38) {
        r -= 8;
        g -= 10;
        b -= 12;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
  }

  ctx.putImageData(img, 0, 0);

  const pebbleColors = [
    '#8f4a34',
    '#9a553c',
    '#b06a4c',
    '#7a3f2c',
    '#c48262',
    '#6e3828',
  ];

  for (let i = 0; i < 520; i++) {
    const x = hash2(i * 1.7, i * 2.3) * size;
    const y = hash2(i * 3.1, i * 1.9) * size;
    const rx = 0.8 + hash2(i, 11) * 3.2;
    const ry = 0.6 + hash2(i, 22) * 2.4;
    const rot = hash2(i, 33) * Math.PI;

    ctx.fillStyle = pebbleColors[Math.floor(hash2(i, 44) * pebbleColors.length)]!;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(60, 28, 18, 0.12)';
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.15, y + ry * 0.12, rx * 0.9, ry * 0.85, rot, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 1800; i++) {
    const x = hash2(i * 5.7, i) * size;
    const y = hash2(i, i * 4.2) * size;
    const s = 0.4 + hash2(i, 77) * 1.2;
    ctx.fillStyle = `rgba(${90 + hash2(i, 88) * 40},${45 + hash2(i, 99) * 25},${30 + hash2(i, 55) * 20},0.35)`;
    ctx.fillRect(x, y, s, s);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const brickTexture = loadRepeatTexture('/brick.jpeg', [1, 1]);
export const grassTexture = loadRepeatTexture('/grass.avif', [50, 50]);

export const groundTexture = createGroundTexture();

/** Light beach sand (shells / fine grains). */
function createBeachSandTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#f8edd0');
  grad.addColorStop(0.45, '#edd9a8');
  grad.addColorStop(1, '#dcc090');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2400; i++) {
    const x = hash2(i * 2.1, i) * size;
    const y = hash2(i, i * 3.3) * size;
    const g = 200 + hash2(i, 7) * 40;
    ctx.fillStyle = `rgba(${g},${g - 15},${g - 45},0.25)`;
    ctx.fillRect(x, y, 0.8 + hash2(i, 9), 0.8 + hash2(i, 11));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const beachSandTexture = createBeachSandTexture();

/** Tint multiplied with groundTexture (white = use texture as-is). */
export const TERRAIN_SAND_COLOR = 0xffffff;
/** @deprecated Use TERRAIN_SAND_COLOR */
export const TERRAIN_MUD_COLOR = TERRAIN_SAND_COLOR;
