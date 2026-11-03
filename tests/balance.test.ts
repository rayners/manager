import { describe, expect, it } from 'vitest';
import { CONTENT } from '../src/data/visitors';
import { createDeck } from '../src/sim/layout';
import { createSim, TICK, tick } from '../src/sim/sim';
import { VARIANTS } from '../src/render/sprites';

describe('the real visitor table', () => {
  it('has three visitor types, each usable and drawable', () => {
    expect(CONTENT.types).toHaveLength(3);
    for (const t of CONTENT.types) {
      expect(Object.values(t.wants).some((w) => w > 0)).toBe(true);
      for (const v of t.variants) expect(VARIANTS[v]).toBeDefined();
    }
  });
  it('only names rivals that exist', () => {
    const ids = CONTENT.types.map((t) => t.id);
    for (const pair of CONTENT.rivals) for (const id of pair) expect(ids).toContain(id);
    expect(CONTENT.rivals.length).toBeGreaterThan(0);
  });
  it('keeps the starting bar lively and profitable across seeds, an hour at a time', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const s = createSim(createDeck(), seed);
      let peak = 0;
      for (let i = 0; i < 3600 / TICK; i++) {
        tick(s, CONTENT);
        peak = Math.max(peak, s.agents.length);
      }
      expect(s.money, `seed ${seed}`).toBeGreaterThan(0);
      expect(peak, `seed ${seed}`).toBeGreaterThanOrEqual(8);
      expect(s.served, `seed ${seed}`).toBeGreaterThan(s.unhappy);
      expect(s.scuffles, `seed ${seed}`).toBeGreaterThan(0);
    }
  });
});
