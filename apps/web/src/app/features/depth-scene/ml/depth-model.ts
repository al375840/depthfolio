export type ModelStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface DepthModelCallbacks {
  onReady(): void;
  onResult(depth: Float32Array): void;
  onBenchmark(ms: number): void;
  onError(err: unknown): void;
}

export class DepthModel {
  private worker: Worker | undefined;
  private inputName = '';
  private outputName = '';

  constructor(private readonly callbacks: DepthModelCallbacks) {}

  load(modelUrl: string): void {
    this.worker = new Worker(new URL('./depth-worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e: MessageEvent) => this.handleMessage(e);
    this.worker.onerror = (e) => this.callbacks.onError(e);
    this.worker.postMessage({ type: 'init', modelUrl });
  }

  infer(input: Float32Array): void {
    this.worker?.postMessage({ type: 'infer', input, inputName: this.inputName, outputName: this.outputName }, [input.buffer]);
  }

  benchmark(): void {
    this.worker?.postMessage({ type: 'benchmark', inputName: this.inputName, outputName: this.outputName });
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = undefined;
  }

  private handleMessage(e: MessageEvent): void {
    const { type } = e.data;
    if (type === 'ready') {
      this.inputName = e.data.inputName as string;
      this.outputName = e.data.outputName as string;
      this.callbacks.onReady();
    } else if (type === 'result') {
      this.callbacks.onResult(e.data.depth as Float32Array);
    } else if (type === 'benchmark-result') {
      this.callbacks.onBenchmark(e.data.ms as number);
    } else if (type === 'error') {
      this.callbacks.onError(new Error(e.data.message as string));
    }
  }
}
