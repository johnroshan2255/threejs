import * as THREE from 'three';

function hash2(x: number, y: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Far Cry 4 Kyrat style warm dusty grayish-khaki dirt path & mountain soil (matching reference image 2). */
function createGroundTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const dirtA = '#9a9080';
  const dirtB = '#847a6c';

  const grad = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    0,
    size * 0.5,
    size * 0.5,
    size * 0.72
  );
  grad.addColorStop(0, '#aba090');
  grad.addColorStop(0.55, dirtA);
  grad.addColorStop(1, dirtB);
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

      r += (grain - 0.5) * 16;
      g += (grain - 0.5) * 14;
      b += (grain - 0.5) * 12;

      if (n > 0.55) {
        // Grey slate pebble / gravel grain
        r += 12;
        g += 10;
        b += 8;
      } else if (n > 0.38) {
        // Dry soil silt variation
        r -= 8;
        g -= 8;
        b -= 8;
      }

      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
  }

  ctx.putImageData(img, 0, 0);

  const pebbleColors = [
    '#7a7266',
    '#888072',
    '#686054',
    '#b4a896',
    '#5c564c',
  ];

  for (let i = 0; i < 480; i++) {
    const x = hash2(i * 1.7, i * 2.3) * size;
    const y = hash2(i * 3.1, i * 1.9) * size;
    const rx = 0.8 + hash2(i, 11) * 2.8;
    const ry = 0.6 + hash2(i, 22) * 2.2;
    const rot = hash2(i, 33) * Math.PI;

    ctx.fillStyle = pebbleColors[Math.floor(hash2(i, 44) * pebbleColors.length)]!;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(40, 35, 30, 0.14)';
    ctx.beginPath();
    ctx.ellipse(x + rx * 0.15, y + ry * 0.12, rx * 0.9, ry * 0.85, rot, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 1600; i++) {
    const x = hash2(i * 5.7, i) * size;
    const y = hash2(i, i * 4.2) * size;
    const s = 0.4 + hash2(i, 77) * 1.2;
    ctx.fillStyle = `rgba(${120 + hash2(i, 88) * 40},${110 + hash2(i, 99) * 35},${95 + hash2(i, 55) * 30},0.25)`;
    ctx.fillRect(x, y, s, s);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export const groundTexture = createGroundTexture();

/** Light riverbed / mountain sand texture. */
function createBeachSandTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, '#c8b696');
  grad.addColorStop(0.45, '#b4a080');
  grad.addColorStop(1, '#9e8b6d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2400; i++) {
    const x = hash2(i * 2.1, i) * size;
    const y = hash2(i, i * 3.3) * size;
    const g = 160 + hash2(i, 7) * 40;
    ctx.fillStyle = `rgba(${g},${g - 15},${g - 35},0.25)`;
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

export const TERRAIN_SAND_COLOR = 0xffffff;
export const TERRAIN_MUD_COLOR = TERRAIN_SAND_COLOR;
