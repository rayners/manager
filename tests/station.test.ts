import { describe, expect, it } from 'vitest';
import type { Content } from '../src/sim/content';
import { createDeck, setCrate } from '../src/sim/layout';
import { Agent, checkRivals, createSim, SIM_VERSION, Sim, TICK, tick } from '../src/sim/sim';

const type = (id: string, over: Partial<Content['types'][number]> = {}): Content['types'][number] => ({
  id,
  weight: 1,
  crew: [4, 4],
  wants: { stool: 1, chair: 0, machine: 0 },
  wallet: [100, 100],
  patience: 60,
  variants: [0],
  ...over,
});
const content = (over: Partial<Content> = {}): Content => ({
  types: [type('a')],
  rivals: [],
  prices: { stool: 5, chair: 10, machine: 2 },
  service: { stool: 10, chair: 20, machine: 5 },
  arrivalEvery: [30, 30],
  stay: [120, 120],
  bayTime: 20,
  queuePatience: 60,
  scuffleCost: 50,
  rivalRange: 3,
  grudgeLimit: 10,
  ...over,
});
const run = (s: Sim, c: Content, seconds: number, each?: () => void) => {
  for (let i = 0; i < Math.round(seconds / TICK); i++) {
    tick(s, c);
    each?.();
  }
};

describe('ships', () => {
  it('arrive on their own and send a crew through the door', () => {
    const c = content({ service: { stool: 100, chair: 100, machine: 100 } });
    const s = createSim(createDeck(), 1);
    expect(s.agents).toHaveLength(0);
    run(s, c, 35);
    expect(s.agents).toHaveLength(4);
    expect(s.ships.some((x) => x.state === 'docked' || x.state === 'liberty')).toBe(true);
  });
  it('wait for the docking bay when another ship is using it', () => {
    const c = content({ arrivalEvery: [5, 5], bayTime: 40 });
    const s = createSim(createDeck(), 2);
    run(s, c, 20);
    expect(s.ships.filter((x) => x.state === 'docked')).toHaveLength(1);
    expect(s.ships.filter((x) => x.state === 'waiting').length).toBeGreaterThan(0);
  });
  it('go elsewhere when kept waiting too long, and that is lost business', () => {
    const c = content({ arrivalEvery: [5, 5], bayTime: 100, queuePatience: 10 });
    const s = createSim(createDeck(), 3);
    run(s, c, 60);
    expect(s.lostShips).toBeGreaterThan(0);
  });
  it('free the bay after unloading, so crews from different ships overlap', () => {
    const c = content({ arrivalEvery: [30, 30], bayTime: 10, stay: [200, 200], service: { stool: 100, chair: 100, machine: 100 } });
    const s = createSim(createDeck(), 4);
    run(s, c, 100);
    expect(new Set(s.agents.map((a) => a.ship)).size).toBeGreaterThan(1);
  });
  it('recall the crew when their stay is over, then leave', () => {
    const c = content({ arrivalEvery: [1000, 1000], stay: [40, 40] });
    const s = createSim(createDeck(), 5);
    s.nextShipIn = 0;
    run(s, c, 150);
    expect(s.agents).toHaveLength(0);
    expect(s.ships).toHaveLength(0);
    expect(s.departures).toBe(4);
  });
});

describe('needs and spending', () => {
  it('sends people to the kind of place that meets their need', () => {
    const c = content({ types: [type('a', { wants: { stool: 0, chair: 1, machine: 0 } })], arrivalEvery: [1000, 1000] });
    const s = createSim(createDeck(), 6);
    s.nextShipIn = 0;
    run(s, c, 20, () => {
      for (const a of s.agents) if (a.spot !== null) expect(s.deck.spots[a.spot]!.kind).toBe('chair');
    });
    expect(s.money).toBeGreaterThan(0);
  });
  it('charges the price for each service used', () => {
    const c = content({ arrivalEvery: [1000, 1000] });
    const s = createSim(createDeck(), 7);
    s.nextShipIn = 0;
    run(s, c, 25);
    expect(s.money).toBe(4 * 5);
  });
  it('skips what someone cannot afford, without charging for it', () => {
    const c = content({ types: [type('a', { wallet: [1, 1] })], arrivalEvery: [1000, 1000] });
    const s = createSim(createDeck(), 8);
    s.nextShipIn = 0;
    run(s, c, 100);
    expect(s.money).toBe(0);
  });
  it('counts someone as served when every need was met', () => {
    const c = content({ arrivalEvery: [1000, 1000] });
    const s = createSim(createDeck(), 9);
    s.nextShipIn = 0;
    run(s, c, 150);
    expect(s.served).toBe(4);
    expect(s.unhappy).toBe(0);
  });
  it('sends people home unhappy when they run out of patience waiting for a place', () => {
    const c = content({
      types: [type('a', { crew: [10, 10], patience: 5, wants: { stool: 0, chair: 0, machine: 1 } })],
      service: { stool: 1, chair: 1, machine: 200 },
      arrivalEvery: [1000, 1000],
      stay: [500, 500],
    });
    const s = createSim(createDeck(), 10);
    s.nextShipIn = 0;
    run(s, c, 100);
    expect(s.unhappy).toBeGreaterThan(0);
  });
  it('earns more when the station has more of what people want', () => {
    const c = content({
      types: [type('a', { crew: [6, 6], patience: 15, wants: { stool: 0, chair: 0, machine: 1 } })],
      service: { stool: 1, chair: 1, machine: 60 },
      arrivalEvery: [40, 40],
    });
    const few = createSim(createDeck(), 11);
    const more = createSim(createDeck(), 11);
    more.deck.spots.push({ x: 8, y: 6, kind: 'machine', facing: 'up' }, { x: 12, y: 6, kind: 'machine', facing: 'up' });
    more.spotOwners.push(null, null);
    run(few, c, 600);
    run(more, c, 600);
    expect(more.money).toBeGreaterThan(few.money);
  });
});

describe('rivals', () => {
  const rivalsContent = content({ types: [type('a'), type('b')], rivals: [['a', 'b']] });
  const seated = (s: Sim, id: number, kind: string, spot: number, x: number, y: number): Agent => {
    const a: Agent = {
      id, type: kind, ship: 0, variant: 0, x, y, px: x, py: y, nx: x, ny: y, gx: x, gy: y,
      state: 'dwelling', spot, dwell: 1000, wants: [], wallet: 0, patience: 60, grudge: 0, scuffled: false,
      facing: 'up', walked: 0,
    };
    s.agents.push(a);
    s.spotOwners[spot] = id;
    return a;
  };

  it('builds a grudge when rivals sit close together, then a scuffle costs money', () => {
    const s = createSim(createDeck(), 12);
    const a = seated(s, 900, 'a', 0, 2, 5);
    const b = seated(s, 901, 'b', 1, 4, 5);
    for (let i = 0; i < 9 / TICK; i++) checkRivals(s, rivalsContent);
    expect(a.grudge).toBeGreaterThan(0);
    expect(s.scuffles).toBe(0);
    for (let i = 0; i < 2 / TICK; i++) checkRivals(s, rivalsContent);
    expect(s.scuffles).toBe(1);
    expect(s.money).toBe(-50);
    expect(a.state).toBe('leaving');
    expect(b.state).toBe('leaving');
    expect(s.spotOwners[0]).toBeNull();
  });
  it('leaves rivals alone when the layout keeps them apart', () => {
    const s = createSim(createDeck(), 13);
    seated(s, 900, 'a', 0, 2, 5);
    seated(s, 901, 'b', 1, 15, 13);
    for (let i = 0; i < 60 / TICK; i++) checkRivals(s, rivalsContent);
    expect(s.scuffles).toBe(0);
  });
  it('ignores people of the same type', () => {
    const s = createSim(createDeck(), 14);
    seated(s, 900, 'a', 0, 2, 5);
    seated(s, 901, 'a', 1, 4, 5);
    for (let i = 0; i < 60 / TICK; i++) checkRivals(s, rivalsContent);
    expect(s.scuffles).toBe(0);
  });
  it('lets a grudge fade once the rival has gone', () => {
    const s = createSim(createDeck(), 15);
    const a = seated(s, 900, 'a', 0, 2, 5);
    const b = seated(s, 901, 'b', 1, 4, 5);
    for (let i = 0; i < 5 / TICK; i++) checkRivals(s, rivalsContent);
    b.x = b.nx = 15;
    b.y = b.ny = 13;
    for (let i = 0; i < 6 / TICK; i++) checkRivals(s, rivalsContent);
    expect(a.grudge).toBe(0);
  });
  it('prefers a seat away from a rival when one is free', () => {
    const c = content({ types: [type('a', { crew: [1, 1] }), type('b', { crew: [1, 1] })], rivals: [['a', 'b']], arrivalEvery: [1000, 1000], service: { stool: 100, chair: 100, machine: 100 } });
    const s = createSim(createDeck(), 16);
    seated(s, 900, 'b', 0, s.deck.spots[0]!.x, s.deck.spots[0]!.y);
    s.ships.push({ id: 50, type: 'a', state: 'docked', toUnload: 1, unloadIn: 0, waited: 0, bayLeft: 20, stayLeft: 100 });
    run(s, c, 20);
    const visitor = s.agents.find((a) => a.id !== 900)!;
    const spot = s.deck.spots[visitor.spot!]!;
    expect(Math.abs(spot.x - s.deck.spots[0]!.x) + Math.abs(spot.y - s.deck.spots[0]!.y)).toBeGreaterThan(3);
  });
});

describe('the whole station', () => {
  it('stays deterministic and survives a save', () => {
    const c = content({ types: [type('a'), type('b', { wants: { stool: 1, chair: 1, machine: 1 } })], rivals: [['a', 'b']] });
    const s = createSim(createDeck(), 17);
    run(s, c, 200);
    const copy = JSON.parse(JSON.stringify(s)) as Sim;
    expect(copy.version).toBe(SIM_VERSION);
    run(s, c, 200);
    run(copy, c, 200);
    expect(JSON.stringify(copy)).toBe(JSON.stringify(s));
  });
  it('keeps working when crates block the way mid-visit', () => {
    const c = content();
    const s = createSim(createDeck(), 18);
    run(s, c, 40);
    setCrate(s.deck, 12, 6);
    setCrate(s.deck, 12, 10);
    const before = s.departures;
    run(s, c, 300);
    expect(s.departures).toBeGreaterThan(before);
  });
});
