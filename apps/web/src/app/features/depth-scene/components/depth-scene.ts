import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import * as THREE from 'three';
import { DEPTH_MODEL_URL } from '../../../core/tokens/depth-model-url.token';
import { DepthModel } from '../ml/depth-model';
import { preprocessFrame, normalizeDepth } from '../ml/preprocessing';
import { buildDepthScene, updateParallax, type DepthSceneObjects } from '../three/scene-builder';

type CameraStatus = 'idle' | 'live' | 'fallback' | 'denied';

const BENCHMARK_THRESHOLD_MS = 250;
const TARGET_FPS = 30;

@Component({
  selector: 'app-depth-scene',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full aspect-video bg-neutral-900" (mousemove)="onMouseMove($event)">
      <canvas #canvas class="w-full h-full block"></canvas>

      @if (isFallback()) {
        <span class="absolute top-2 left-2 text-xs text-white/70 bg-black/40 px-2 py-1 rounded">
          static demo
        </span>
      }

      @if (status() === 'denied') {
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2">
          <button
            class="text-xs text-white bg-oxblood/80 hover:bg-oxblood px-3 py-1.5 rounded-full transition-colors"
            (click)="retryCamera()"
          >
            Activar cámara en vivo
          </button>
        </div>
      }

      @if (status() === 'idle') {
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-sm text-white/60">Iniciando cámara…</span>
        </div>
      }
    </div>
  `,
})
export class DepthScene implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly modelUrl = inject(DEPTH_MODEL_URL);

  protected readonly status = signal<CameraStatus>('idle');
  protected readonly isFallback = computed(
    () => this.status() === 'fallback' || this.status() === 'denied',
  );

  private scene: DepthSceneObjects | undefined;
  private model: DepthModel | undefined;
  private video: HTMLVideoElement | undefined;
  private animFrame = 0;
  private mouseX = 0;
  private mouseY = 0;
  private lastFrameTime = 0;

  async ngAfterViewInit(): Promise<void> {
    await this.startCamera();
  }

  protected async retryCamera(): Promise<void> {
    cancelAnimationFrame(this.animFrame);
    this.scene?.dispose();
    this.scene = undefined;
    this.status.set('idle');
    await this.startCamera();
  }

  private async startCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.video = await this.startVideo(stream);
      this.initScene(this.createVideoTexture());
      this.loadModel();
    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError');
      console.warn('[depth-scene] camera init failed:', err);
      this.status.set(isDenied ? 'denied' : 'fallback');
      await this.loadFallback();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrame);
    this.video?.srcObject && (this.video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    this.model?.dispose();
    this.scene?.dispose();
  }

  protected onMouseMove(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
  }

  private async startVideo(stream: MediaStream): Promise<HTMLVideoElement> {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.playsInline = true;
    await video.play();
    return video;
  }

  private createVideoTexture(): THREE.VideoTexture {
    return new THREE.VideoTexture(this.video!);
  }

  private initScene(colorTexture: THREE.Texture): void {
    cancelAnimationFrame(this.animFrame);
    this.scene?.dispose();
    this.scene = buildDepthScene(this.canvasRef.nativeElement, colorTexture);
    this.animate();
  }

  private loadModel(): void {
    this.model = new DepthModel({
      onReady: () => {
        this.model!.benchmark();
      },
      onBenchmark: (ms) => {
        if (ms > BENCHMARK_THRESHOLD_MS) {
          this.switchToFallback();
        } else {
          this.status.set('live');
          this.scheduleInference();
        }
      },
      onResult: (depth) => {
        if (!this.scene) return;
        this.scene.depthTexture.image.data!.set(normalizeDepth(depth));
        this.scene.depthTexture.needsUpdate = true;
        this.scheduleInference();
      },
      onError: () => this.switchToFallback(),
    });
    this.model.load(this.modelUrl);
  }

  private scheduleInference(): void {
    if (!this.video || !this.model) return;
    setTimeout(() => {
      const input = preprocessFrame(this.video!);
      this.model!.infer(input);
    }, 1000 / TARGET_FPS);
  }

  private animate(): void {
    this.animFrame = requestAnimationFrame(() => this.animate());
    if (!this.scene) return;
    const { renderer, scene, camera } = this.scene;
    updateParallax(camera, this.mouseX, this.mouseY);
    renderer.render(scene, camera);
  }

  private async loadFallback(): Promise<void> {
    const loader = new THREE.TextureLoader();
    const [color, depth] = await Promise.all([
      loader.loadAsync('/fallback/portrait.jpg'),
      loader.loadAsync('/fallback/portrait-depth.png'),
    ]);
    this.initScene(color);
    if (this.scene) {
      const depthData = this.extractDepthFromTexture(depth);
      this.scene.depthTexture.image.data!.set(depthData);
      this.scene.depthTexture.needsUpdate = true;
    }
  }

  private extractDepthFromTexture(texture: THREE.Texture): Float32Array {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(texture.image as HTMLImageElement, 0, 0, 256, 256);
    const { data } = ctx.getImageData(0, 0, 256, 256);
    const out = new Float32Array(256 * 256);
    for (let i = 0; i < out.length; i++) out[i] = data[i * 4] / 255;
    return out;
  }

  private switchToFallback(): void {
    this.status.set('fallback');
    this.video?.srcObject && (this.video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    this.loadFallback();
  }
}
