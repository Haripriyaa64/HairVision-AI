export interface FrameRateLimiterOptions {
  fps?: number;
}

export class ARFrameRateLimiter {
  private readonly interval: number;
  private lastTime = 0;

  constructor(options: FrameRateLimiterOptions = {}) {
    const fps = Math.max(1, options.fps ?? 30);

    this.interval = 1000 / fps;
  }

  shouldProcess(timestamp: number): boolean {
    if (this.lastTime === 0) {
      this.lastTime = timestamp;
      return true;
    }

    const elapsed = timestamp - this.lastTime;

    if (elapsed < this.interval) {
      return false;
    }

    this.lastTime = timestamp;

    return true;
  }

  reset(): void {
    this.lastTime = 0;
  }
}