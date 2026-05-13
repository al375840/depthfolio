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
import { Router } from '@angular/router';
import * as THREE from 'three';
import { DEPTH_MODEL_URL } from '../../../core/tokens/depth-model-url.token';
import { DepthModel } from '../ml/depth-model';
import { preprocessFrame, normalizeDepth } from '../ml/preprocessing';
import { buildDepthScene, updateParallax, type DepthSceneObjects } from '../three/scene-builder';

type CameraStatus = 'idle' | 'live' | 'fallback' | 'denied' | 'busy';

const FALLBACK_THRESHOLD_MS = 8000; // only fallback if truly unusable
const MIN_INTERVAL_MS = 1000 / 30;  // cap at 30fps max

@Component({
  selector: 'app-depth-scene',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative w-full aspect-video bg-neutral-900"
         (mousemove)="onMouseMove($event)"
         (click)="onClick($event)"
         [style.cursor]="hovering() ? 'pointer' : 'default'">

      <canvas #canvas class="w-full h-full block"></canvas>

      <!-- nearest-point indicator -->
      @if (nearest(); as pt) {
        <div class="absolute pointer-events-none"
             [style.left.%]="pt.x"
             [style.top.%]="pt.y"
             style="transform: translate(-50%, -50%)">
          <div class="w-6 h-6 rounded-full border-2 border-red-400 bg-red-400/20 animate-ping absolute inset-0"></div>
          <div class="w-6 h-6 rounded-full border-2 border-red-400 bg-red-400/30"></div>
        </div>
      }

      <!-- depth/color toggle -->
      @if (status() === 'live' || isFallback()) {
        <button
          class="absolute top-2 left-2 text-[10px] text-white/60 bg-black/40 hover:bg-black/70 px-2 py-0.5 rounded transition-colors select-none"
          (click)="toggleDepthView(); $event.stopPropagation()">
          {{ showDepth() ? 'color' : 'depth' }}
        </button>
      }

      <!-- status badge -->
      @if (isFallback()) {
        <span class="absolute top-2 right-2 text-[10px] text-white/40 bg-black/30 px-2 py-0.5 rounded select-none">
          static demo
        </span>
      }
      @if (status() === 'live') {
        <span class="absolute top-2 right-2 text-[10px] text-white/40 bg-black/30 px-2 py-0.5 rounded select-none flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-green-400 inline-block animate-pulse"></span>
          live
        </span>
      }

      @if (status() === 'denied') {
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2">
          <button
            class="text-xs text-white bg-oxblood/80 hover:bg-oxblood px-4 py-1.5 rounded-full transition-colors"
            (click)="retryCamera(); $event.stopPropagation()">
            Activar cámara en vivo
          </button>
        </div>
      }
      @if (status() === 'busy') {
        <div class="absolute bottom-4 left-1/2 -translate-x-1/2">
          <button
            class="text-xs text-white/70 bg-black/40 hover:bg-black/60 px-4 py-1.5 rounded-full transition-colors"
            (click)="retryCamera(); $event.stopPropagation()">
            Cámara en uso — reintentar
          </button>
        </div>
      }

      @if (status() === 'idle') {
        <div class="absolute inset-0 flex items-center justify-center">
          <span class="text-sm text-white/40">Iniciando…</span>
        </div>
      }
    </div>
  `,
})
export class DepthScene implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private readonly modelUrl = inject(DEPTH_MODEL_URL);
  private readonly router = inject(Router);

  protected readonly status    = signal<CameraStatus>('idle');
  protected readonly hovering  = signal(false);
  protected readonly showDepth = signal(false);
  protected readonly nearest   = signal<{ x: number; y: number } | null>(null);
  protected readonly isFallback = computed(
    () => ['fallback', 'denied', 'busy'].includes(this.status()),
  );

  private scene: DepthSceneObjects | undefined;
  private model: DepthModel | undefined;
  private video: HTMLVideoElement | undefined;
  private animFrame = 0;
  private mouseX = 0;
  private mouseY = 0;
  private inferenceIntervalMs = MIN_INTERVAL_MS;

  async ngAfterViewInit(): Promise<void> {
    await this.startCamera();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrame);
    this.stopTracks();
    this.model?.dispose();
    this.scene?.dispose();
  }

  protected onMouseMove(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseY = ((e.clientY - rect.top) / rect.height) * 2 - 1;

    if (this.scene) {
      const pointer = new THREE.Vector2(this.mouseX, -this.mouseY);
      const hit = this.scene.hitTest(pointer);
      this.hovering.set(hit !== null);
    }
  }

  protected onClick(e: MouseEvent): void {
    if (!this.scene) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const route = this.scene.hitTest(new THREE.Vector2(x, y));
    if (route) {
      this.router.navigate([route]);
    }
  }

  protected toggleDepthView(): void {
    const next = !this.showDepth();
    this.showDepth.set(next);
    this.scene?.setShowDepth(next ? 1.0 : 0.0);
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
      console.log('[depth-scene] requesting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('[depth-scene] camera granted, tracks:', stream.getVideoTracks().map(t => t.label));
      this.video = await this.startVideo(stream);
      this.initScene(this.createVideoTexture());
      this.loadModel();
    } catch (err) {
      const name = err instanceof DOMException ? err.name : '';
      const isDenied = name === 'NotAllowedError' || name === 'PermissionDeniedError';
      const isBusy   = name === 'NotReadableError' || name === 'TrackStartError';
      console.warn('[depth-scene] camera init failed:', name, (err as Error).message);
      this.status.set(isDenied ? 'denied' : isBusy ? 'busy' : 'fallback');
      await this.loadFallback();
    }
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
        console.log('[depth-scene] model ready, running benchmark...');
        this.model!.benchmark();
      },
      onBenchmark: (ms) => {
        console.log(`[depth-scene] benchmark: ${ms.toFixed(0)}ms → ~${(1000/ms).toFixed(1)}fps`);
        if (ms > FALLBACK_THRESHOLD_MS) {
          console.warn('[depth-scene] device too slow (>8s) → fallback');
          this.switchToFallback();
        } else {
          // Run inference as fast as hardware allows, capped at 30fps
          this.inferenceIntervalMs = Math.max(ms * 1.05, MIN_INTERVAL_MS);
          console.log(`[depth-scene] live mode at ${(1000/this.inferenceIntervalMs).toFixed(1)}fps`);
          this.status.set('live');
          this.scheduleInference();
        }
      },
      onResult: (depth) => {
        if (!this.scene) return;
        const normalized = normalizeDepth(depth);
        this.scene.depthTexture.image.data!.set(normalized);
        this.scene.depthTexture.needsUpdate = true;
        this.nearest.set(this.findNearestPoint(normalized));
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
    }, this.inferenceIntervalMs);
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

  private findNearestPoint(depth: Float32Array): { x: number; y: number } {
    const SIZE = 256;
    let maxVal = 0;
    let maxIdx = 0;
    for (let i = 0; i < depth.length; i++) {
      if (depth[i] > maxVal) { maxVal = depth[i]; maxIdx = i; }
    }
    const col = maxIdx % SIZE;
    const row = Math.floor(maxIdx / SIZE);
    // col/row are in image space (row 0 = top); convert to CSS % (x=left, y=top)
    return { x: (col / SIZE) * 100, y: (row / SIZE) * 100 };
  }

  private switchToFallback(): void {
    this.status.set('fallback');
    this.stopTracks();
    this.loadFallback();
  }

  private stopTracks(): void {
    if (this.video?.srcObject) {
      (this.video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  }
}
