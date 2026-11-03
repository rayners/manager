/** A rolling window of frame times. */
export class FrameStats {
  private samples: number[] = [];
  constructor(private size: number) {}

  add(ms: number): void {
    this.samples.push(ms);
    if (this.samples.length > this.size) this.samples.shift();
  }
  clear(): void {
    this.samples = [];
  }
  average(): number {
    if (!this.samples.length) return 0;
    return this.samples.reduce((a, b) => a + b, 0) / this.samples.length;
  }
  fps(): number {
    const avg = this.average();
    return avg ? 1000 / avg : 0;
  }
  p95(): number {
    if (!this.samples.length) return 0;
    const sorted = [...this.samples].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length * 0.95)]!;
  }
}
