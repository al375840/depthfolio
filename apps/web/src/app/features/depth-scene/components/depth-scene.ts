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
import { HandDetector, type HandPoint } from '../ml/hand-detector';
import {
  preprocessFrame,
  normalizeDepth,
  extractDepthFromTexture,
} from '../ml/preprocessing';
import {
  buildDepthScene,
  updateParallax,
  type DepthSceneObjects,
} from '../three/scene-builder';
import { DwellTracker } from '../interaction/dwell-tracker';
import {
  mouseEventToNdc,
  handPointToNdc,
  ndcToVector,
  type PointerNdc,
} from '../interaction/pointer-coords';

type CameraStatus = 'idle' | 'live' | 'fallback' | 'denied' | 'busy';

// ─── tuning constants ────────────────────────────────────────────────────────

/** Anything slower than this and the depth model is unusable — bail to the static image. */
const FALLBACK_THRESHOLD_MS = 8000;

/** Hard cap on inference rate so we don't peg the GPU on fast machines. */
const MIN_INFERENCE_INTERVAL_MS = 1000 / 30;

/** How long the index finger must hover a hotspot to count as a click. */
const DWELL_DURATION_MS = 1500;

/** Multiplier on benchmark time to leave the GPU room to breathe between frames. */
const INFERENCE_PACING_FACTOR = 1.05;

// ─────────────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-depth-scene',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block w-full h-full' },
  template: `
    <div class="relative w-full h-full bg-neutral-900"
         (mousemove)="onMouseMove($event)"
         (click)="onClick($event)"
         [style.cursor]="hovering() ? 'pointer' : 'default'">

      <canvas #canvas class="w-full h-full block"></canvas>

      <!-- index finger cursor + dwell progress ring -->
      @if (handPoint(); as pt) {
        <div class="absolute pointer-events-none"
             [style.left.%]="pt.x * 100"
             [style.top.%]="pt.y * 100"
             style="transform: translate(-50%, -50%)">
          <svg width="48" height="48" viewBox="0 0 48 48"
               class="absolute" style="top:-8px;left:-8px">
            <circle cx="24" cy="24" r="19" fill="none"
                    stroke="white" stroke-width="2" opacity="0.2"/>
            <circle cx="24" cy="24" r="19" fill="none"
                    stroke="white" stroke-width="2.5"
                    stroke-dasharray="119.38"
                    [style.stroke-dashoffset]="119.38 * (1 - dwellProgress())"
                    style="transform:rotate(-90deg);transform-origin:24px 24px;transition:stroke-dashoffset 50ms linear"/>
          </svg>
          <div class="w-4 h-4 rounded-full bg-white/80 border border-white/50"></div>
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
  private readonly router   = inject(Router);

  // ─── UI state (read by the template) ──────────────────────────────────────
  protected readonly status        = signal<CameraStatus>('idle');
  protected readonly hovering      = signal(false);
  protected readonly showDepth     = signal(false);
  protected readonly handPoint     = signal<HandPoint | null>(null);
  protected readonly dwellProgress = signal(0);
  protected readonly isFallback    = computed(
    () => ['fallback', 'denied', 'busy'].includes(this.status()),
  );

  // ─── runtime state ────────────────────────────────────────────────────────
  private scene?: DepthSceneObjects;
  private depthModel?: DepthModel;
  private handDetector?: HandDetector;
  private video?: HTMLVideoElement;
  private animationFrameId = 0;

  /** Last known pointer position in NDC, used to drive parallax. */
  private pointer: PointerNdc = { x: 0, y: 0 };

  /** Computed at benchmark time; how often to run a depth-model inference. */
  private inferenceIntervalMs = MIN_INFERENCE_INTERVAL_MS;

  private readonly dwell = new DwellTracker(DWELL_DURATION_MS);

  // ─── lifecycle ────────────────────────────────────────────────────────────
  async ngAfterViewInit(): Promise<void> {
    await this.startCamera();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.stopCameraTracks();
    this.depthModel?.dispose();
    this.handDetector?.dispose();
    this.scene?.dispose();
  }

  // ─── mouse fallback (works alongside hand control) ────────────────────────
  protected onMouseMove(e: MouseEvent): void {
    this.pointer = mouseEventToNdc(e);
    if (this.scene) {
      const hit = this.scene.hitTest(ndcToVector(this.pointer));
      this.hovering.set(hit !== null);
    }
  }

  protected onClick(e: MouseEvent): void {
    if (!this.scene) return;
    const ndc = mouseEventToNdc(e);
    const route = this.scene.hitTest(ndcToVector(ndc));
    if (route) this.router.navigate([route]);
  }

  protected toggleDepthView(): void {
    const next = !this.showDepth();
    this.showDepth.set(next);
    this.scene?.setShowDepth(next ? 1.0 : 0.0);
  }

  protected async retryCamera(): Promise<void> {
    cancelAnimationFrame(this.animationFrameId);
    this.scene?.dispose();
    this.scene = undefined;
    this.status.set('idle');
    await this.startCamera();
  }

  // ─── camera & scene bootstrap ─────────────────────────────────────────────
  private async startCamera(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      this.video = await this.attachStreamToVideoElement(stream);
      this.initScene(new THREE.VideoTexture(this.video));
      this.loadDepthModel();
      this.loadHandDetector();
    } catch (err) {
      this.status.set(this.classifyCameraError(err));
      await this.loadFallback();
    }
  }

  private classifyCameraError(err: unknown): CameraStatus {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'denied';
    if (name === 'NotReadableError' || name === 'TrackStartError')      return 'busy';
    return 'fallback';
  }

  private async attachStreamToVideoElement(stream: MediaStream): Promise<HTMLVideoElement> {
    const video = document.createElement('video');
    video.srcObject = stream;
    video.playsInline = true;
    await video.play();
    return video;
  }

  private initScene(colorTexture: THREE.Texture): void {
    cancelAnimationFrame(this.animationFrameId);
    this.scene?.dispose();
    this.scene = buildDepthScene(this.canvasRef.nativeElement, colorTexture);
    this.runAnimationLoop();
  }

  // ─── depth model ──────────────────────────────────────────────────────────
  private loadDepthModel(): void {
    this.depthModel = new DepthModel({
      onReady: () => this.depthModel!.benchmark(),
      onBenchmark: (ms) => this.applyBenchmarkResult(ms),
      onResult: (depth) => this.applyDepthResult(depth),
      onError:  () => this.switchToFallback(),
    });
    this.depthModel.load(this.modelUrl);
  }

  private applyBenchmarkResult(ms: number): void {
    if (ms > FALLBACK_THRESHOLD_MS) {
      this.switchToFallback();
      return;
    }
    // Pace inferences just slower than the GPU can produce them.
    this.inferenceIntervalMs = Math.max(ms * INFERENCE_PACING_FACTOR, MIN_INFERENCE_INTERVAL_MS);
    this.status.set('live');
    this.scheduleNextInference();
  }

  private applyDepthResult(depth: Float32Array): void {
    if (!this.scene) return;
    const normalized = normalizeDepth(depth);
    this.scene.depthTexture.image.data!.set(normalized);
    this.scene.depthTexture.needsUpdate = true;
    this.scheduleNextInference();
  }

  private scheduleNextInference(): void {
    if (!this.video || !this.depthModel) return;
    setTimeout(() => {
      this.depthModel!.infer(preprocessFrame(this.video!));
    }, this.inferenceIntervalMs);
  }

  // ─── hand tracking ────────────────────────────────────────────────────────
  private loadHandDetector(): void {
    this.handDetector = new HandDetector();
    this.handDetector.load().catch(() => {
      // Hand control is optional — if MediaPipe fails to load,
      // the user can still navigate with the mouse.
      this.handDetector = undefined;
    });
  }

  // ─── render loop ──────────────────────────────────────────────────────────
  private runAnimationLoop(): void {
    this.animationFrameId = requestAnimationFrame(() => this.runAnimationLoop());
    if (!this.scene) return;

    this.processHandFrame();

    updateParallax(this.scene.camera, this.pointer.x, this.pointer.y);
    this.scene.renderer.render(this.scene.scene, this.scene.camera);
  }

  /** Detect the hand, drive the pointer & cursor, and update the dwell timer. */
  private processHandFrame(): void {
    if (!this.video || !this.handDetector || !this.scene) return;

    const pt = this.handDetector.detect(this.video);
    this.handPoint.set(pt);

    if (!pt) {
      this.dwell.update(null);
      this.dwellProgress.set(0);
      return;
    }

    // Hand position takes over the pointer when visible.
    this.pointer = handPointToNdc(pt);

    const route = this.scene.hitTest(ndcToVector(this.pointer));
    this.dwell.update(route);
    this.dwellProgress.set(this.dwell.progress);

    if (this.dwell.justCompleted && route) {
      this.dwell.reset();
      this.dwellProgress.set(0);
      this.router.navigate([route]);
    }
  }

  // ─── fallback (still image when camera or model isn't usable) ─────────────
  private async loadFallback(): Promise<void> {
    const loader = new THREE.TextureLoader();
    const [color, depth] = await Promise.all([
      loader.loadAsync('/fallback/portrait.jpg'),
      loader.loadAsync('/fallback/portrait-depth.png'),
    ]);
    this.initScene(color);
    if (this.scene) {
      this.scene.depthTexture.image.data!.set(extractDepthFromTexture(depth));
      this.scene.depthTexture.needsUpdate = true;
    }
  }

  private switchToFallback(): void {
    this.status.set('fallback');
    this.stopCameraTracks();
    this.loadFallback();
  }

  private stopCameraTracks(): void {
    if (this.video?.srcObject) {
      (this.video.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  }
}
