const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];
const MODEL_SIZE = 256;

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
