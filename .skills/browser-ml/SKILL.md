---
name: browser-ml
description: Run a depth estimation (or any ONNX) model in the browser using ONNX Runtime Web with WebGPU acceleration and WASM fallback. Covers worker setup, SharedArrayBuffer transfer, model caching, and the gotchas that consume hours.
---

# Browser-side ML inference

## What and why

The goal is to run a neural network in the visitor's browser at interactive frame rates (15–30 fps for a 256x256 input). Server-side inference is excluded by cost, latency and privacy concerns.

**Library**: ONNX Runtime Web. Chosen over TensorFlow.js because:

- WebGPU support is first-class and more mature.
- ONNX format is the lingua franca of model interchange; converting from PyTorch / HuggingFace is trivial.
- Quantisation tooling is better.

**Model**: MiDaS-small ONNX (~25 MB FP32, ~7 MB INT8 quantised). For higher quality, Depth-Anything-V2-Small (~50 MB FP32). Both are monocular depth estimation models — input an RGB image, output a single-channel depth map.

## Setup

```bash
npm install onnxruntime-web
```

Place the `.onnx` model file in `public/models/`. The Static Web Apps config should cache `*.onnx` for 1 year, immutable.

## Minimum-viable usage

```typescript
import * as ort from 'onnxruntime-web/webgpu';

// Configure WASM paths if you want WASM fallback to work:
ort.env.wasm.wasmPaths = '/onnxruntime/';

const session = await ort.InferenceSession.create('/models/midas-small.onnx', {
  executionProviders: ['webgpu', 'wasm'],
  graphOptimizationLevel: 'all',
});

// Build input tensor — model-specific. For MiDaS-small: NCHW float32, 256x256, range [0,1].
const input = new ort.Tensor('float32', preprocessedFloat32Array, [1, 3, 256, 256]);

const output = await session.run({ 'input.1': input }); // input name depends on the model
const depthTensor = output['output']; // again, depends on model
const depthData = depthTensor.data as Float32Array;   // length 256*256
```

## Web worker setup (mandatory)

Inference at 30 fps on the main thread blocks input and animation. Always run ONNX in a worker.

```typescript
// depth-worker.ts
import * as ort from 'onnxruntime-web/webgpu';

let session: ort.InferenceSession;

self.onmessage = async (e) => {
  if (e.data.type === 'init') {
    session = await ort.InferenceSession.create(e.data.modelUrl, {
      executionProviders: ['webgpu', 'wasm'],
    });
    self.postMessage({ type: 'ready' });
  } else if (e.data.type === 'infer') {
    const tensor = new ort.Tensor('float32', e.data.input, e.data.shape);
    const result = await session.run({ [e.data.inputName]: tensor });
    const depth = result[e.data.outputName].data as Float32Array;
    self.postMessage({ type: 'result', depth }, [depth.buffer]); // transfer ownership
  }
};
```

Main thread side:

```typescript
const worker = new Worker(new URL('./depth-worker.ts', import.meta.url), { type: 'module' });
worker.postMessage({ type: 'init', modelUrl: '/models/midas-small.onnx' });
```

## SharedArrayBuffer for zero-copy

Transfer is faster than copy, but `SharedArrayBuffer` is faster than transfer because both threads share the same memory. Required for multi-threaded WASM execution provider as well.

To use `SharedArrayBuffer`, the page must be served with these headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Configured per-route in `staticwebapp.config.json`. See `azure-static-web-apps-deploy` skill.

## Preprocessing pipeline

For MiDaS-small specifically (other models will differ — read the model card):

```typescript
function preprocess(imageData: ImageData): Float32Array {
  // 1. Resize source image to 256x256 (use a temp canvas or OffscreenCanvas).
  // 2. Convert RGBA to RGB (drop alpha).
  // 3. Normalise to [0,1] by dividing by 255.
  // 4. MiDaS expects ImageNet normalisation: subtract mean [0.485, 0.456, 0.406], divide by std [0.229, 0.224, 0.225].
  // 5. Transpose from HWC to CHW (interleave channels).
  // ...
}
```

## Gotchas

- **First inference is slow** (model warmup, shader compilation on WebGPU). Run one throwaway inference at app start so the first user frame doesn't stutter.
- **WebGPU is only available in HTTPS contexts.** It will silently fall back to WASM on `http://`. Test deployed, not just locally.
- **CSP headers strip `unsafe-eval`** — but ONNX Runtime Web needs it for the WASM threaded backend. Add `'unsafe-eval'` to `script-src` or use the non-threaded build.
- **Model input/output names are not standardised.** Always inspect with `session.inputNames` and `session.outputNames` once and hardcode them. Don't assume `'input'` and `'output'`.
- **Depth output range is model-specific.** MiDaS gives an inverse depth, range varies per frame. Always normalise to `[0,1]` per-frame before texturing.
- **Don't recreate tensors per frame**, reuse the buffer where possible. Memory pressure becomes a problem at 30 fps.

## Quantisation (optimisation step)

If model size or inference speed becomes a problem, quantise to INT8:

```bash
python -m onnxruntime.quantization \
  --input model.onnx --output model.int8.onnx --quant_format QDQ
```

Loses ~5% accuracy on depth, gains ~3x speed and 4x size reduction. Worth it for portfolio scenarios.

## Further reading

- [ONNX Runtime Web docs](https://onnxruntime.ai/docs/tutorials/web/)
- [MiDaS model card](https://github.com/isl-org/MiDaS)
- [Depth-Anything-V2](https://github.com/DepthAnything/Depth-Anything-V2)
