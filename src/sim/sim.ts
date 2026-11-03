import type { Content, VisitorType } from './content';
import { Deck, Facing, isOpen, SpotKind } from './layout';
import { nextSteps, PathCache } from './path';

export const TICK = 0.1;
export const SIM_VERSION = 1;
const SPEED = 2.6; // tiles per second
const UNLOAD_EVERY = 0.6;
const MILL_FOR: [number, number] = [2, 5];
const KINDS: SpotKind[] = ['stool', 'chair', 'machine'];

export interface Agent {
  id: number;
  type: string;
  ship: number;
  variant: number;
  x: number;
  y: number;
  /** Position at the previous tick, for the renderer to interpolate from. */
  px: number;
  py: number;
  /** The tile currently being walked onto. */
  nx: number;
  ny: number;
  gx: number;
  gy: number;
  state: 'walking' | 'dwelling' | 'leaving';
  /** The place this person holds or is heading to; null while looking for one. */
  spot: number | null;
  dwell: number;
  wants: SpotKind[];
  wallet: number;
  patience: number;
  grudge: number;
  scuffled: boolean;
  facing: Facing;
  /** Distance walked, which drives the walk cycle. */
  walked: number;
}

export interface Ship {
  id: number;
  type: string;
  /** Waiting for the bay, docked and unloading, or holding while the crew is aboard the station. */
  state: 'waiting' | 'docked' | 'liberty';
  toUnload: number;
  unloadIn: number;
  waited: number;
  bayLeft: number;
  stayLeft: number;
}

/** Everything here is plain JSON: no DOM, clock or Math.random. */
export interface Sim {
  version: number;
  deck: Deck;
  rng: number;
  time: number;
  nextShipIn: number;
  nextId: number;
  agents: Agent[];
  ships: Ship[];
  spotOwners: (number | null)[];
  money: number;
  departures: number;
  served: number;
  unhappy: number;
  lostShips: number;
  scuffles: number;
}

// Routes are derived data, so they live outside the saved state.
const caches = new WeakMap<Deck, PathCache>();
function field(d: Deck, x: number, y: number) {
  let c = caches.get(d);
  if (!c) caches.set(d, (c = new PathCache()));
  return c.get(d, x, y);
}

function random(s: Sim): number {
  s.rng = (s.rng + 0x6d2b79f5) | 0;
  let t = Math.imul(s.rng ^ (s.rng >>> 15), 1 | s.rng);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const between = (s: Sim, [lo, hi]: [number, number]) => lo + random(s) * (hi - lo);
const pick = <T>(s: Sim, items: T[]): T => items[Math.floor(random(s) * items.length)]!;

export function createSim(deck: Deck, seed: number): Sim {
  return {
    version: SIM_VERSION,
    deck,
    rng: seed | 0,
    time: 0,
    nextShipIn: 10,
    nextId: 0,
    agents: [],
    ships: [],
    spotOwners: deck.spots.map(() => null),
    money: 0,
    departures: 0,
    served: 0,
    unhappy: 0,
    lostShips: 0,
    scuffles: 0,
  };
}

function typeOf(c: Content, id: string): VisitorType {
  return c.types.find((t) => t.id === id)!;
}

function areRivals(c: Content, a: string, b: string): boolean {
  return c.rivals.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function releaseSpot(s: Sim, a: Agent): void {
  if (a.spot !== null) s.spotOwners[a.spot] = null;
  a.spot = null;
}

function sendHome(s: Sim, a: Agent): void {
  releaseSpot(s, a);
  a.state = 'leaving';
  a.gx = s.deck.door.x;
  a.gy = s.deck.door.y;
}

/** A free place of this kind, away from this person's rivals if there is a choice. */
function findSpot(s: Sim, c: Content, a: Agent, kind: SpotKind): number | null {
  const free: number[] = [];
  s.deck.spots.forEach((spot, i) => {
    if (spot.kind === kind && s.spotOwners[i] === null) free.push(i);
  });
  if (!free.length) return null;
  const rivals = s.agents.filter((o) => o.spot !== null && areRivals(c, a.type, o.type));
  const calm = free.filter((i) => {
    const spot = s.deck.spots[i]!;
    return rivals.every((o) => {
      const held = s.deck.spots[o.spot!]!;
      return Math.abs(held.x - spot.x) + Math.abs(held.y - spot.y) > c.rivalRange;
    });
  });
  return pick(s, calm.length ? calm : free);
}

function chooseGoal(s: Sim, c: Content, a: Agent): void {
  a.wants = a.wants.filter((kind) => c.prices[kind] <= a.wallet);
  if (!a.wants.length || a.patience <= 0) {
    sendHome(s, a);
    return;
  }
  a.state = 'walking';
  for (const kind of a.wants) {
    const i = findSpot(s, c, a, kind);
    if (i !== null) {
      const spot = s.deck.spots[i]!;
      s.spotOwners[i] = a.id;
      a.spot = i;
      a.gx = spot.x;
      a.gy = spot.y;
      return;
    }
  }
  // Everything this person wants is taken, so they hang around for now.
  a.spot = null;
  for (;;) {
    const x = Math.floor(random(s) * s.deck.cols);
    const y = Math.floor(random(s) * s.deck.rows);
    if (s.deck.cells[y * s.deck.cols + x] === '.') {
      a.gx = x;
      a.gy = y;
      return;
    }
  }
}

function disembark(s: Sim, c: Content, ship: Ship): void {
  const t = typeOf(c, ship.type);
  const wants = KINDS.filter((kind) => random(s) < t.wants[kind]);
  const { x, y } = s.deck.door;
  const a: Agent = {
    id: s.nextId++,
    type: t.id,
    ship: ship.id,
    variant: pick(s, t.variants),
    x,
    y,
    px: x,
    py: y,
    nx: x,
    ny: y,
    gx: x,
    gy: y,
    state: 'walking',
    spot: null,
    dwell: 0,
    wants: wants.length ? wants : KINDS.filter((kind) => t.wants[kind] > 0).slice(0, 1),
    wallet: Math.round(between(s, t.wallet)),
    patience: t.patience,
    grudge: 0,
    scuffled: false,
    facing: 'left',
    walked: 0,
  };
  s.agents.push(a);
  chooseGoal(s, c, a);
}

function arrive(s: Sim, c: Content, a: Agent): boolean {
  if (a.state === 'leaving') {
    s.departures++;
    if (a.scuffled || a.wants.length) s.unhappy++;
    else s.served++;
    return false;
  }
  a.state = 'dwelling';
  if (a.spot === null) {
    a.dwell = between(s, MILL_FOR);
    return true;
  }
  const spot = s.deck.spots[a.spot]!;
  a.facing = spot.facing;
  a.dwell = c.service[spot.kind];
  a.wallet -= c.prices[spot.kind];
  s.money += c.prices[spot.kind];
  a.wants = a.wants.filter((kind) => kind !== spot.kind);
  return true;
}

/** Walks one tick's distance. Returns false once this person has gone for good. */
function walk(s: Sim, c: Content, a: Agent): boolean {
  let budget = SPEED * TICK;
  while (budget > 0) {
    const dx = a.nx - a.x;
    const dy = a.ny - a.y;
    const gap = Math.abs(dx) + Math.abs(dy);
    if (gap > 1e-9) {
      const move = Math.min(gap, budget);
      a.x += Math.sign(dx) * move;
      a.y += Math.sign(dy) * move;
      a.walked += move;
      budget -= move;
      continue;
    }
    a.x = a.nx;
    a.y = a.ny;
    if (a.x === a.gx && a.y === a.gy) return arrive(s, c, a);
    // A crate landed on this person's destination.
    if (!isOpen(s.deck, a.gx, a.gy)) {
      releaseSpot(s, a);
      chooseGoal(s, c, a);
    }
    const steps = nextSteps(s.deck, field(s.deck, a.gx, a.gy), a.x, a.y);
    if (!steps.length) return true;
    const step = pick(s, steps);
    a.nx = step.x;
    a.ny = step.y;
    a.facing = step.x > a.x ? 'right' : step.x < a.x ? 'left' : step.y > a.y ? 'down' : 'up';
  }
  return true;
}

function tickShips(s: Sim, c: Content): void {
  s.nextShipIn -= TICK;
  if (s.nextShipIn <= 0) {
    const total = c.types.reduce((sum, t) => sum + t.weight, 0);
    let roll = random(s) * total;
    const t = c.types.find((x) => (roll -= x.weight) < 0) ?? c.types[0]!;
    s.ships.push({
      id: s.nextId++,
      type: t.id,
      state: 'waiting',
      toUnload: Math.round(between(s, t.crew)),
      unloadIn: 0,
      waited: 0,
      bayLeft: c.bayTime,
      stayLeft: between(s, c.stay),
    });
    s.nextShipIn = between(s, c.arrivalEvery);
  }
  if (!s.ships.some((x) => x.state === 'docked')) {
    const next = s.ships.find((x) => x.state === 'waiting');
    if (next) next.state = 'docked';
  }
  s.ships = s.ships.filter((ship) => {
    if (ship.state === 'waiting') {
      ship.waited += TICK;
      if (ship.waited > c.queuePatience) {
        s.lostShips++;
        return false;
      }
      return true;
    }
    ship.stayLeft -= TICK;
    if (ship.state === 'docked') {
      ship.bayLeft -= TICK;
      ship.unloadIn -= TICK;
      if (ship.toUnload > 0 && ship.unloadIn <= 0) {
        disembark(s, c, ship);
        ship.toUnload--;
        ship.unloadIn = UNLOAD_EVERY;
      }
      if (ship.toUnload === 0 && ship.bayLeft <= 0) ship.state = 'liberty';
      return true;
    }
    if (ship.stayLeft <= 0) {
      for (const a of s.agents) if (a.ship === ship.id && a.state !== 'leaving') sendHome(s, a);
    }
    return s.agents.some((a) => a.ship === ship.id);
  });
}

/** Rivals seated close together get annoyed, and eventually someone throws a punch. */
export function checkRivals(s: Sim, c: Content): void {
  const settled = s.agents.filter((a) => a.state === 'dwelling' && a.spot !== null);
  for (const a of settled) {
    const near = settled.find(
      (o) => o !== a && areRivals(c, a.type, o.type) && Math.abs(o.x - a.x) + Math.abs(o.y - a.y) <= c.rivalRange,
    );
    a.grudge = near ? a.grudge + TICK : Math.max(0, a.grudge - TICK);
    if (near && a.state === 'dwelling' && near.state === 'dwelling' && a.grudge >= c.grudgeLimit) {
      s.scuffles++;
      s.money -= c.scuffleCost;
      for (const who of [a, near]) {
        who.scuffled = true;
        who.grudge = 0;
        sendHome(s, who);
      }
    }
  }
}

export function tick(s: Sim, c: Content): void {
  s.time += TICK;
  tickShips(s, c);
  const staying: Agent[] = [];
  for (const a of s.agents) {
    a.px = a.x;
    a.py = a.y;
    if (a.spot === null && a.state !== 'leaving') a.patience -= TICK;
    if (a.state === 'dwelling') {
      a.dwell -= TICK;
      if (a.dwell <= 0) {
        releaseSpot(s, a);
        chooseGoal(s, c, a);
      }
      staying.push(a);
    } else if (walk(s, c, a)) {
      staying.push(a);
    }
  }
  s.agents = staying;
  checkRivals(s, c);
}
