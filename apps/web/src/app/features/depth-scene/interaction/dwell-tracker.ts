/**
 * Tracks how long the pointer has been resting on a specific target.
 * Used to convert "finger hovering over a hotspot" into a deliberate click,
 * without needing a physical click event.
 *
 * Usage:
 *   const tracker = new DwellTracker(1500);
 *   tracker.update(currentTargetId);   // call every frame
 *   if (tracker.justCompleted) router.navigate(tracker.target);
 *   tracker.progress;                  // 0..1, drive a UI ring
 */
export class DwellTracker {
  private target: string | null = null;
  private startedAt = 0;
  private progressValue = 0;
  private completed = false;

  constructor(private readonly durationMs: number) {}

  /** Where the pointer currently rests, or null if it's not on any target. */
  update(currentTarget: string | null): void {
    this.completed = false;

    if (currentTarget === null) {
      this.reset();
      return;
    }

    const now = performance.now();
    if (currentTarget !== this.target) {
      this.target = currentTarget;
      this.startedAt = now;
    }

    this.progressValue = Math.min((now - this.startedAt) / this.durationMs, 1);
    if (this.progressValue >= 1) {
      this.completed = true;
    }
  }

  reset(): void {
    this.target = null;
    this.startedAt = 0;
    this.progressValue = 0;
  }

  /** 0..1 — useful for a progress ring around the cursor. */
  get progress(): number {
    return this.progressValue;
  }

  /** The target the pointer is currently resting on, or null. */
  get currentTarget(): string | null {
    return this.target;
  }

  /** True for exactly one update() call when progress reaches 1. */
  get justCompleted(): boolean {
    return this.completed;
  }
}
