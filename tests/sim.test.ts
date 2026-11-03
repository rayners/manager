import { describe, expect, it } from 'vitest';
import { createDeck, isOpen, setCrate } from '../src/sim/layout';
import { createSim, setPopulation, TICK, tick } from '../src/sim/sim';

const run = (sim: ReturnType<typeof createSim>, seconds: number, each?: () => void) => {
  for (let i = 0; i < seconds / TICK; i++) {
    tick(sim);
    each?.();
  }
};

describe('the crowd', () => {
  it('fills up to the requested number of people, arriving through the door', () => {
    const sim = createSim(createDeck(), 1, 20);
    tick(sim);
    expect(sim.agents.length).toBeGreaterThan(0);
    expect(sim.agents.length).toBeLessThan(20);
    const a = sim.agents[0]!;
    expect(Math.round(a.x)).toBeGreaterThan(sim.deck.cols - 4);
    run(sim, 30);
    expect(sim.agents).toHaveLength(20);
  });
  it('plays out identically from the same seed', () => {
    const a = createSim(createDeck(), 7, 20);
    const b = createSim(createDeck(), 7, 20);
    run(a, 60);
    run(b, 60);
    expect(JSON.stringify(a.agents)).toBe(JSON.stringify(b.agents));
  });
  it('plays out differently from another seed', () => {
    const a = createSim(createDeck(), 7, 20);
    const b = createSim(createDeck(), 8, 20);
    run(a, 60);
    run(b, 60);
    expect(JSON.stringify(a.agents)).not.toBe(JSON.stringify(b.agents));
  });
  it('survives a trip through JSON, as a save would', () => {
    const sim = createSim(createDeck(), 3, 20);
    run(sim, 20);
    const copy = JSON.parse(JSON.stringify(sim));
    run(sim, 20);
    run(copy, 20);
    expect(JSON.stringify(copy.agents)).toBe(JSON.stringify(sim.agents));
  });
  it('never walks anyone through a wall or a table', () => {
    const sim = createSim(createDeck(), 2, 50);
    run(sim, 120, () => {
      for (const a of sim.agents) {
        expect(isOpen(sim.deck, Math.round(a.x), Math.round(a.y))).toBe(true);
      }
    });
  });
  it('never seats two people in one place', () => {
    const sim = createSim(createDeck(), 4, 100);
    run(sim, 120, () => {
      const seated = sim.agents.filter((a) => a.state === 'dwelling' && a.spot !== null).map((a) => a.spot);
      expect(new Set(seated).size).toBe(seated.length);
    });
  });
  it('actually uses the seats and sends visitors home', () => {
    const sim = createSim(createDeck(), 5, 20);
    let seated = 0;
    run(sim, 300, () => {
      seated = Math.max(seated, sim.agents.filter((a) => a.state === 'dwelling' && a.spot !== null).length);
    });
    expect(seated).toBeGreaterThan(5);
    expect(sim.departures).toBeGreaterThan(0);
  });
  it('has nobody stuck when a crate lands on their route', () => {
    const sim = createSim(createDeck(), 6, 50);
    run(sim, 30);
    for (const c of [{ x: 12, y: 6 }, { x: 12, y: 10 }, { x: 12, y: 14 }]) setCrate(sim.deck, c.x, c.y);
    const before = sim.departures;
    run(sim, 300);
    expect(sim.departures).toBeGreaterThan(before);
  });
  it('shrinks to a lower population by letting people leave', () => {
    const sim = createSim(createDeck(), 9, 50);
    run(sim, 60);
    setPopulation(sim, 20);
    run(sim, 600);
    expect(sim.agents).toHaveLength(20);
  });
  it('frees the seat of someone who leaves', () => {
    const sim = createSim(createDeck(), 10, 20);
    run(sim, 300);
    const held = sim.agents.map((a) => a.spot).filter((s) => s !== null);
    const owners = sim.spotOwners.filter((o) => o !== null);
    expect(owners.length).toBe(held.length);
  });
  it('keeps the previous position so the renderer can interpolate', () => {
    const sim = createSim(createDeck(), 11, 5);
    run(sim, 5);
    const moving = sim.agents.find((a) => a.state === 'walking')!;
    expect(Math.abs(moving.x - moving.px) + Math.abs(moving.y - moving.py)).toBeGreaterThan(0);
  });
});
