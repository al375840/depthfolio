/// <reference lib="webworker" />
import * as ort from 'onnxruntime-web/webgpu';

let session: ort.InferenceSession | undefined;

self.onmessage = async (e: MessageEvent) => {
  const { type } = e.data;

  if (type === 'init') {
    try {
      ort.env.wasm.wasmPaths = '/onnxruntime/';
      session = await ort.InferenceSession.create(e.data.modelUrl as string, {
        executionProviders: ['webgpu', 'wasm'],
        graphOptimizationLevel: 'all',
      });
      const [inputName] = session.inputNames;
      const [outputName] = session.outputNames;
      self.postMessage({ type: 'ready', inputName, outputName });
    } catch (err) {
      console.error('[depth-worker] session init failed:', err);
      self.postMessage({ type: 'error', message: String(err) });
    }
  } else if (type === 'infer' && session) {
    const tensor = new ort.Tensor('float32', e.data.input as Float32Array, [1, 3, 256, 256]);
    const result = await session.run({ [e.data.inputName as string]: tensor });
    const depth = result[e.data.outputName as string].data as Float32Array;
    self.postMessage({ type: 'result', depth }, [depth.buffer as ArrayBuffer]);
  } else if (type === 'benchmark') {
    const start = performance.now();
    const tensor = new ort.Tensor('float32', new Float32Array(3 * 256 * 256), [1, 3, 256, 256]);
    await session!.run({ [e.data.inputName as string]: tensor });
    self.postMessage({ type: 'benchmark-result', ms: performance.now() - start });
  }
};
