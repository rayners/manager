import { Deck, isOpen } from './layout';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

/** Walking distance to the goal from every tile (Infinity if unreachable). */
export function fieldTo(d: Deck, gx: number, gy: number): Float64Array {
  const f = new Float64Array(d.cols * d.rows).fill(Infinity);
  f[gy * d.cols + gx] = 0;
  const queue: number[] = [gy * d.cols + gx];
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head]!;
    const x = i % d.cols;
    const y = (i - x) / d.cols;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      const n = ny * d.cols + nx;
      if (isOpen(d, nx, ny) && f[n] === Infinity) {
        f[n] = f[i]! + 1;
        queue.push(n);
      }
    }
  }
  return f;
}

/** The open neighbouring tiles that are closest to the goal, and closer than here. */
export function nextSteps(d: Deck, f: Float64Array, x: number, y: number): { x: number; y: number }[] {
  let best = f[y * d.cols + x]!;
  let steps: { x: number; y: number }[] = [];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!isOpen(d, nx, ny)) continue;
    const v = f[ny * d.cols + nx]!;
    if (v === Infinity || v > best) continue;
    if (v < best) {
      best = v;
      steps = [];
    }
    if (v === best && v < f[y * d.cols + x]!) steps.push({ x: nx, y: ny });
  }
  return steps;
}

/** One route per goal tile, shared by everyone heading there, until the layout changes. */
export class PathCache {
  private version = -1;
  private fields = new Map<number, Float64Array>();

  get(d: Deck, gx: number, gy: number): Float64Array {
    if (d.version !== this.version) {
      this.fields = new Map();
      this.version = d.version;
    }
    const key = gy * d.cols + gx;
    let f = this.fields.get(key);
    if (!f) {
      f = fieldTo(d, gx, gy);
      this.fields.set(key, f);
    }
    return f;
  }
}
