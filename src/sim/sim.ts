import { Deck, Facing, isOpen } from './layout';
import { nextSteps, PathCache } from './path';

export const TICK = 0.1;
const SPEED = 2.6; // tiles per second
const SPAWN_EVERY = 0.2;
export const VARIANT_COUNT = 12;

export interface Agent {
  id: number;
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
  spot: number | null;
  dwell: number;
  visitsLeft: number;
  facing: Facing;
  /** Distance walked, which drives the walk cycle. */
  walked: number;
}

/** Everything here is plain JSON: no DOM, clock or Math.random. */
export interface Sim {
  deck: Deck;
  rng: number;
  time: number;
  target: number;
  spawnIn: number;
  nextId: number;
  agents: Agent[];
  spotOwners: (number | null)[];
  departures: number;
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
const between = (s: Sim, lo: number, hi: number) => lo + random(s) * (hi - lo);

export function createSim(deck: Deck, seed: number, target: number): Sim {
  return {
    deck,
    rng: seed | 0,
    time: 0,
    target,
    spawnIn: 0,
    nextId: 0,
    agents: [],
    spotOwners: deck.spots.map(() => null),
    departures: 0,
  };
}

export function setPopulation(s: Sim, target: number): void {
  s.target = target;
}

function chooseGoal(s: Sim, a: Agent): void {
  const free: number[] = [];
  s.spotOwners.forEach((owner, i) => {
    if (owner === null) free.push(i);
  });
  a.state = 'walking';
  if (free.length && random(s) < 0.85) {
    const i = free[Math.floor(random(s) * free.length)]!;
    const spot = s.deck.spots[i]!;
    s.spotOwners[i] = a.id;
    a.spot = i;
    a.gx = spot.x;
    a.gy = spot.y;
    return;
  }
  // Nowhere to sit, so mill around on the open floor.
  a.spot = null;
  for (;;) {
    const x = Math.floor(random(s) * s.deck.cols);
    const y = Math.floor(random(s) * s.deck.rows);
    if (isOpen(s.deck, x, y) && s.deck.cells[y * s.deck.cols + x] === '.') {
      a.gx = x;
      a.gy = y;
      return;
    }
  }
}

function welcome(s: Sim, a: Agent): void {
  a.variant = Math.floor(random(s) * VARIANT_COUNT);
  a.visitsLeft = 1 + Math.floor(random(s) * 3);
  a.x = a.px = a.nx = s.deck.door.x;
  a.y = a.py = a.ny = s.deck.door.y;
  chooseGoal(s, a);
}

function spawn(s: Sim): void {
  const a: Agent = {
    id: s.nextId++,
    variant: 0,
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    nx: 0,
    ny: 0,
    gx: 0,
    gy: 0,
    state: 'walking',
    spot: null,
    dwell: 0,
    visitsLeft: 1,
    facing: 'left',
    walked: 0,
  };
  welcome(s, a);
  s.agents.push(a);
}

function releaseSpot(s: Sim, a: Agent): void {
  if (a.spot !== null) s.spotOwners[a.spot] = null;
  a.spot = null;
}

function arrive(s: Sim, a: Agent): boolean {
  if (a.state === 'leaving') {
    s.departures++;
    if (s.agents.length > s.target) return false;
    welcome(s, a);
    return true;
  }
  a.state = 'dwelling';
  if (a.spot !== null) {
    a.facing = s.deck.spots[a.spot]!.facing;
    a.dwell = between(s, 8, 30);
  } else {
    a.dwell = between(s, 2, 6);
  }
  return true;
}

/** Walks one tick's distance. Returns false once this person has gone for good. */
function walk(s: Sim, a: Agent): boolean {
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
    if (a.x === a.gx && a.y === a.gy) return arrive(s, a);
    // A crate landed on this person's destination.
    if (!isOpen(s.deck, a.gx, a.gy)) {
      releaseSpot(s, a);
      chooseGoal(s, a);
    }
    const steps = nextSteps(s.deck, field(s.deck, a.gx, a.gy), a.x, a.y);
    const step = steps[Math.floor(random(s) * steps.length)];
    if (!step) return true;
    a.nx = step.x;
    a.ny = step.y;
    a.facing = step.x > a.x ? 'right' : step.x < a.x ? 'left' : step.y > a.y ? 'down' : 'up';
  }
  return true;
}

export function tick(s: Sim): void {
  s.time += TICK;
  s.spawnIn -= TICK;
  if (s.spawnIn <= 0 && s.agents.length < s.target) {
    spawn(s);
    s.spawnIn = SPAWN_EVERY;
  }
  const staying: Agent[] = [];
  for (const a of s.agents) {
    a.px = a.x;
    a.py = a.y;
    if (a.state === 'dwelling') {
      a.dwell -= TICK;
      if (a.dwell <= 0) {
        releaseSpot(s, a);
        a.visitsLeft--;
        if (a.visitsLeft <= 0) {
          a.state = 'leaving';
          a.gx = s.deck.door.x;
          a.gy = s.deck.door.y;
        } else {
          chooseGoal(s, a);
        }
      }
      staying.push(a);
    } else if (walk(s, a)) {
      staying.push(a);
    }
  }
  s.agents = staying;
}
