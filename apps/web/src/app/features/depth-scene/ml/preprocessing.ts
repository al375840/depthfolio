import * as THREE from 'three';

// MiDaS was trained on ImageNet, so we have to apply the same normalisation
// it expects, otherwise predictions degrade.
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD  = [0.229, 0.224, 0.225];
const MODEL_SIZE    = 256;

/**
 * Read a frame from a <video> or <img>, downsize it to the model's input
 * resolution, and lay the pixels out in CHW (channel-major) order — that's
 * what MiDaS expects, not the HWC layout that getImageData gives us.
 */
export function preprocessFrame(source: HTMLVideoElement | HTMLImageElement): Float32Array {
  const canvas = new OffscreenCanvas(MODEL_SIZE, MODEL_SIZE);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, MODEL_SIZE, MODEL_SIZE);
  const { data } = ctx.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE);

  const chw = new Float32Array(3 * MODEL_SIZE * MODEL_SIZE);
  for (let i = 0; i < MODEL_SIZE * MODEL_SIZE; i++) {
    for (let c = 0; c < 3; c++) {
      const raw = data[i * 4 + c] / 255;
      chw[c * MODEL_SIZE * MODEL_SIZE + i] = (raw - IMAGENET_MEAN[c]) / IMAGENET_STD[c];
    }
  }
  return chw;
}

/**
 * MiDaS outputs inverse depth as arbitrary floats. Squash them to 0..1
 * (per-frame) so the shader can use them as a displacement amount.
 */
export function normalizeDepth(raw: Float32Array): Float32Array {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] < min) min = raw[i];
    if (raw[i] > max) max = raw[i];
  }
  const range = max - min || 1;
  const out = new Float32Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    out[i] = (raw[i] - min) / range;
  }
  return out;
}

/**
 * Read a pre-baked depth texture (e.g. the fallback PNG) and turn it back
 * into the same 0..1 Float32Array that the live MiDaS pipeline produces.
 * Uses the red channel only — the asset is greyscale.
 */
export function extractDepthFromTexture(texture: THREE.Texture, size = 256): Float32Array {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(texture.image as HTMLImageElement, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  const out = new Float32Array(size * size);
  for (let i = 0; i < out.length; i++) {
    out[i] = data[i * 4] / 255;
  }
  return out;
}
