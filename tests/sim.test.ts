import { describe, expect, it } from 'vitest';
import { CONTENT } from '../src/data/visitors';
import { createDeck, isOpen } from '../src/sim/layout';
import { createSim, Sim, TICK, tick } from '../src/sim/sim';

const run = (s: Sim, seconds: number, each?: () => void) => {
  for (let i = 0; i < seconds / TICK; i++) {
    tick(s, CONTENT);
    each?.();
  }
};

describe('the crowd', () => {
  it('plays out identically from the same seed', () => {
    const a = createSim(createDeck(), 7);
    const b = createSim(createDeck(), 7);
    run(a, 200);
    run(b, 200);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('plays out differently from another seed', () => {
    const a = createSim(createDeck(), 7);
    const b = createSim(createDeck(), 8);
    run(a, 200);
    run(b, 200);
    expect(JSON.stringify(a.agents)).not.toBe(JSON.stringify(b.agents));
  });
  it('never walks anyone through a wall or a table', () => {
    const s = createSim(createDeck(), 2);
    run(s, 300, () => {
      for (const a of s.agents) expect(isOpen(s.deck, Math.round(a.x), Math.round(a.y))).toBe(true);
    });
  });
  it('never gives two people the same place', () => {
    const s = createSim(createDeck(), 4);
    run(s, 300, () => {
      const held = s.agents.map((a) => a.spot).filter((x) => x !== null);
      expect(new Set(held).size).toBe(held.length);
      expect(s.spotOwners.filter((o) => o !== null)).toHaveLength(held.length);
    });
  });
  it('keeps the previous position so the renderer can interpolate', () => {
    const s = createSim(createDeck(), 11);
    run(s, 15);
    const moving = s.agents.find((a) => a.state === 'walking')!;
    expect(Math.abs(moving.x - moving.px) + Math.abs(moving.y - moving.py)).toBeGreaterThan(0);
  });
});
