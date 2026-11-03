import { describe, expect, it } from 'vitest';
import { createDeck, setCrate } from '../src/sim/layout';
import { fieldTo, nextSteps, PathCache } from '../src/sim/path';

describe('finding the way', () => {
  it('measures every reachable tile by its walking distance to the goal', () => {
    const d = createDeck();
    const f = fieldTo(d, d.door.x, d.door.y);
    expect(f[d.door.y * d.cols + d.door.x]).toBe(0);
    expect(f[d.door.y * d.cols + d.door.x - 1]).toBe(1);
  });
  it('leaves walls unreachable', () => {
    const d = createDeck();
    expect(fieldTo(d, d.door.x, d.door.y)[0]).toBe(Infinity);
  });
  it('offers only steps that get closer to the goal', () => {
    const d = createDeck();
    const f = fieldTo(d, d.door.x, d.door.y);
    for (const s of nextSteps(d, f, 5, 6)) {
      expect(f[s.y * d.cols + s.x]).toBeLessThan(f[6 * d.cols + 5]!);
    }
    expect(nextSteps(d, f, 5, 6).length).toBeGreaterThan(0);
  });
  it('walks around a crate placed in the way', () => {
    const d = createDeck();
    const before = fieldTo(d, 20, 14)[14 * d.cols + 18]!;
    setCrate(d, 19, 14);
    const after = fieldTo(d, 20, 14)[14 * d.cols + 18]!;
    expect(after).toBeGreaterThan(before);
    expect(after).not.toBe(Infinity);
  });
  it('can step off a tile that was just built over', () => {
    const d = createDeck();
    setCrate(d, 8, 14);
    expect(nextSteps(d, fieldTo(d, d.door.x, d.door.y), 8, 14).length).toBeGreaterThan(0);
  });
  it('reuses a route until the layout changes', () => {
    const d = createDeck();
    const cache = new PathCache();
    const first = cache.get(d, 5, 6);
    expect(cache.get(d, 5, 6)).toBe(first);
    setCrate(d, 8, 14);
    expect(cache.get(d, 5, 6)).not.toBe(first);
  });
});
