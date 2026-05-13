import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

export interface HandPoint {
  x: number; // 0–1 normalised, left = 0
  y: number; // 0–1 normalised, top = 0
}

export class HandDetector {
  private landmarker: HandLandmarker | null = null;
  private lastTimestampMs = -1;

  async load(): Promise<void> {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm',
    );
    this.landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 1,
    });
  }

  detect(video: HTMLVideoElement): HandPoint | null {
    if (!this.landmarker || video.readyState < 2) return null;

    const now = performance.now();
    // MediaPipe requires strictly increasing timestamps
    if (now <= this.lastTimestampMs) return null;
    this.lastTimestampMs = now;

    const result = this.landmarker.detectForVideo(video, now);
    if (!result.landmarks.length) return null;

    // Landmark 0 = wrist — closest, most stable single point
    const wrist = result.landmarks[0][0];
    return { x: wrist.x, y: wrist.y };
  }

  dispose(): void {
    this.landmarker?.close();
    this.landmarker = null;
  }
}
