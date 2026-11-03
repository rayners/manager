import { cellAt, Deck } from '../sim/layout';
import { Agent, Sim } from '../sim/sim';
import { FrameName, FRAMES, PERSON_H, PERSON_W, Variant, VARIANTS } from './sprites';

export const TILE = 12;
const SIGN_X = 49;

type Ctx = CanvasRenderingContext2D;
const NAMES = Object.keys(FRAMES) as FrameName[];
const FLIPPED: FrameName[] = ['side0', 'side1', 'side2'];

function canvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function paintFrame(g: Ctx, rows: string[], v: Variant, ox: number, oy: number, flip = false): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      if (ch === '.') continue;
      g.fillStyle = v[ch as keyof Variant];
      g.fillRect(ox + (flip ? PERSON_W - 1 - x : x), oy + y, 1, 1);
    }
  });
}

/** One strip per variant, so drawing a person is a single image copy. */
function bakeSheet(): HTMLCanvasElement {
  const count = NAMES.length + FLIPPED.length;
  const [c, g] = canvas(PERSON_W * count, PERSON_H * VARIANTS.length);
  VARIANTS.forEach((v, row) => {
    NAMES.forEach((n, i) => paintFrame(g, FRAMES[n], v, i * PERSON_W, row * PERSON_H));
    FLIPPED.forEach((n, i) => paintFrame(g, FRAMES[n], v, (NAMES.length + i) * PERSON_W, row * PERSON_H, true));
  });
  return c;
}

function frameColumn(a: Agent, seated: boolean): number {
  if (seated) return NAMES.indexOf(a.facing === 'up' ? 'sitUp' : 'sitDown');
  const moving = a.state !== 'dwelling';
  const step = moving ? 1 + (Math.floor(a.walked * 3) % 2) : 0;
  if (a.facing === 'left') return NAMES.length + step;
  const dir = a.facing === 'right' ? 'side' : a.facing;
  return NAMES.indexOf(`${dir}${step}` as FrameName);
}

// A 3x5 pixel font, only as many letters as the sign needs.
const GLYPHS: Record<string, string[]> = {
  L: ['x..', 'x..', 'x..', 'x..', 'xxx'],
  A: ['xxx', 'x.x', 'xxx', 'x.x', 'x.x'],
  S: ['xxx', 'x..', 'xxx', '..x', 'xxx'],
  T: ['xxx', '.x.', '.x.', '.x.', '.x.'],
  C: ['xxx', 'x..', 'x..', 'x..', 'xxx'],
  ' ': ['...', '...', '...', '...', '...'],
};

function sign(g: Ctx, text: string, ox: number, oy: number, color: string): void {
  g.fillStyle = color;
  [...text].forEach((ch, i) => {
    GLYPHS[ch]!.forEach((row, y) => {
      for (let x = 0; x < 3; x++) if (row[x] === 'x') g.fillRect(ox + i * 4 + x, oy + y, 1, 1);
    });
  });
}

const r = (g: Ctx, color: string, x: number, y: number, w: number, h: number) => {
  g.fillStyle = color;
  g.fillRect(x, y, w, h);
};

function backWall(g: Ctx, d: Deck): void {
  const w = d.cols * TILE;
  r(g, '#6f6858', 0, 0, w, TILE * 4);
  r(g, '#7d7564', 0, 4, w, 30);
  for (let x = 0; x < w; x += 36) {
    r(g, '#5c5648', x, 4, 1, 30);
    r(g, '#8d8572', x + 3, 7, 1, 1);
    r(g, '#8d8572', x + 32, 7, 1, 1);
  }
  r(g, '#3a362e', 0, 0, w, 4);
  r(g, '#3a362e', 0, 34, w, 2);
  // Hazard strip along the foot of the wall.
  for (let x = 0; x < w; x += 8) {
    r(g, '#c9a02f', x, 44, 4, 4);
    r(g, '#26231e', x + 4, 44, 4, 4);
  }
  r(g, '#4d483c', 0, 36, w, 8);

  // The sign over the bar, unlit (the lit version flickers on top).
  r(g, '#1b1820', SIGN_X - 5, 9, 45, 13);
  r(g, '#3a3640', SIGN_X - 5, 9, 45, 1);
  sign(g, 'LAST CALL', SIGN_X, 13, '#4a2c3a');

  // Bottles behind the bar.
  const bottles = ['#6fae6a', '#c9772f', '#d8cfb4', '#a33b32', '#4f7a78'];
  r(g, '#2c2820', 12, 28, 104, 2);
  for (let i = 0; i < 16; i++) {
    const x = 16 + i * 6;
    const tall = i % 3 === 0;
    r(g, bottles[i % bottles.length]!, x, tall ? 25 : 26, 3, tall ? 3 : 2);
  }

  // A viewport, with a planet that belongs to someone else.
  const vx = 124;
  r(g, '#2c2820', vx - 3, 5, 58, 30);
  r(g, '#070912', vx, 8, 52, 24);
  const stars: [number, number][] = [[4, 3], [12, 9], [19, 4], [27, 15], [33, 6], [46, 11], [8, 19], [41, 20], [24, 21], [49, 3]];
  stars.forEach(([x, y], i) => r(g, i % 3 ? '#8d93a8' : '#e8e8f0', vx + x, 8 + y, 1, 1));
  r(g, '#b5693a', vx + 34, 14, 12, 12);
  r(g, '#b5693a', vx + 32, 16, 16, 8);
  r(g, '#d48a4e', vx + 34, 16, 6, 4);
  r(g, '#8a4a2a', vx + 40, 22, 6, 3);
  r(g, '#2c2820', vx + 25, 8, 2, 24);

  // A green status terminal by the door.
  r(g, '#2c2820', 212, 10, 26, 20);
  r(g, '#0a1a10', 214, 12, 22, 16);
  for (let i = 0; i < 4; i++) r(g, '#3fbf6a', 216, 14 + i * 3, 8 + ((i * 7) % 11), 1);
}

function floorTile(g: Ctx, x: number, y: number): void {
  const px = x * TILE;
  const py = y * TILE;
  r(g, (x + y) % 2 ? '#3a4044' : '#343a3e', px, py, TILE, TILE);
  r(g, '#2b3034', px, py, TILE, 1);
  r(g, '#2b3034', px, py, 1, TILE);
  if ((x * 7 + y * 13) % 11 === 0) r(g, '#454c50', px + 5, py + 6, 2, 1);
}

function drawTile(g: Ctx, d: Deck, x: number, y: number): void {
  const c = cellAt(d, x, y);
  const px = x * TILE;
  const py = y * TILE;
  switch (c) {
    case 'B': {
      r(g, '#6a452a', px, py + 2, TILE, 10);
      r(g, '#9a6a3e', px, py, TILE, 3);
      r(g, '#c2905a', px, py, TILE, 1);
      r(g, '#4e3220', px, py + 11, TILE, 1);
      if (x % 3 === 0) r(g, '#4e3220', px + 11, py + 3, 1, 8);
      break;
    }
    case 's':
      r(g, '#2b2520', px + 5, py + 7, 2, 4);
      r(g, '#a33b32', px + 3, py + 5, 6, 3);
      r(g, '#c9574a', px + 3, py + 5, 6, 1);
      break;
    case 'c':
      r(g, '#7d7564', px + 2, py + 3, 8, 7);
      r(g, '#9a917c', px + 2, py + 3, 8, 2);
      r(g, '#2b2520', px + 3, py + 10, 1, 2);
      r(g, '#2b2520', px + 8, py + 10, 1, 2);
      break;
    case 'T':
      r(g, '#2b2520', px + 5, py + 8, 2, 4);
      r(g, '#c9bb96', px + 1, py + 2, 10, 7);
      r(g, '#e0d4b0', px + 1, py + 2, 10, 2);
      r(g, '#8f8468', px + 1, py + 8, 10, 1);
      r(g, '#c9772f', px + 5, py + 4, 2, 2);
      break;
    case 'V':
      if (cellAt(d, x - 1, y) !== 'V') {
        r(g, '#8a2f2a', px + 1, py - 14, 22, 26);
        r(g, '#b84238', px + 1, py - 14, 22, 2);
        r(g, '#16141c', px + 4, py - 10, 11, 14);
        for (let i = 0; i < 3; i++) r(g, ['#f0c040', '#6fae6a', '#d8cfb4'][i]!, px + 6, py - 8 + i * 4, 7, 2);
        r(g, '#d8cfb4', px + 17, py - 9, 4, 6);
        r(g, '#16141c', px + 4, py + 6, 11, 3);
      }
      break;
    case 'J':
      if (cellAt(d, x - 1, y) !== 'J') {
        r(g, '#3f5f8a', px + 2, py - 12, 20, 24);
        r(g, '#f0a040', px + 4, py - 10, 16, 8);
        r(g, '#16141c', px + 6, py - 8, 12, 4);
        r(g, '#6fae6a', px + 5, py + 1, 14, 2);
        for (let i = 0; i < 4; i++) r(g, '#d8cfb4', px + 5 + i * 4, py + 5, 2, 3);
      }
      break;
    case 'C':
    case 'x': {
      const base = c === 'x' ? '#b8892f' : '#7d6a3e';
      const light = c === 'x' ? '#d8a94a' : '#9a8650';
      const dark = c === 'x' ? '#7d5c1e' : '#574a2a';
      r(g, base, px + 1, py + 1, 10, 10);
      r(g, light, px + 1, py + 1, 10, 2);
      r(g, dark, px + 1, py + 10, 10, 1);
      r(g, dark, px + 5, py + 3, 2, 7);
      break;
    }
    case 'D':
      r(g, '#26231e', px, py - TILE, TILE, TILE * 3);
      r(g, '#5a5648', px + 2, py - TILE + 2, 6, TILE * 3 - 4);
      for (let i = 0; i < 4; i++) r(g, '#c9a02f', px + 3, py - TILE + 5 + i * 7, 4, 3);
      r(g, '#3fbf6a', px + 9, py, 2, 2);
      break;
    default:
  }
}

function bulkheads(g: Ctx, d: Deck): void {
  const hullDark = '#1e1c20';
  const hull = '#2c2a30';
  r(g, hull, 0, TILE * 4, TILE, (d.rows - 4) * TILE);
  r(g, hull, (d.cols - 1) * TILE, TILE * 4, TILE, (d.rows - 4) * TILE);
  r(g, hull, 0, (d.rows - 1) * TILE, d.cols * TILE, TILE);
  r(g, hullDark, TILE - 1, TILE * 4, 1, (d.rows - 5) * TILE);
  r(g, hullDark, (d.cols - 1) * TILE, TILE * 4, 1, (d.rows - 5) * TILE);
  r(g, hullDark, 0, (d.rows - 1) * TILE, d.cols * TILE, 1);
  for (let x = 4; x < d.cols * TILE; x += 24) r(g, '#45424a', x, (d.rows - 1) * TILE + 5, 2, 2);
}

export function bakeBackground(d: Deck): HTMLCanvasElement {
  const [c, g] = canvas(d.cols * TILE, d.rows * TILE);
  for (let y = 4; y < d.rows; y++) for (let x = 0; x < d.cols; x++) floorTile(g, x, y);
  backWall(g, d);
  bulkheads(g, d);
  // The bartender stands behind the counter, which is drawn over their legs.
  paintFrame(g, FRAMES.down0, VARIANTS[1]!, TILE * 5, TILE * 4 - 7);
  for (let y = 4; y < d.rows; y++) for (let x = 0; x < d.cols; x++) drawTile(g, d, x, y);
  return c;
}

export class Scene {
  private sheet = bakeSheet();
  private background: HTMLCanvasElement | null = null;
  private bakedVersion = -1;
  private order: Agent[] = [];

  draw(g: Ctx, s: Sim, alpha: number): void {
    if (!this.background || this.bakedVersion !== s.deck.version) {
      this.background = bakeBackground(s.deck);
      this.bakedVersion = s.deck.version;
    }
    g.drawImage(this.background, 0, 0);
    this.drawSign(g, s.time);

    this.order = s.agents.slice().sort((a, b) => a.y - b.y);
    for (const a of this.order) {
      const spot = a.state === 'dwelling' && a.spot !== null ? s.deck.spots[a.spot] : null;
      const seated = spot !== null && spot !== undefined && spot.kind !== 'machine';
      const x = a.px + (a.x - a.px) * alpha;
      const y = a.py + (a.y - a.py) * alpha;
      // A small shift now and then, so a seated crowd is not frozen.
      const shift = seated && (Math.floor(s.time / 2) + a.id) % 7 === 0 ? 1 : 0;
      const dx = Math.round(x * TILE) + 2;
      const dy = Math.round(y * TILE) - (seated ? 2 : 0) + shift;
      g.drawImage(this.sheet, frameColumn(a, seated) * PERSON_W, a.variant * PERSON_H, PERSON_W, PERSON_H, dx, dy, PERSON_W, PERSON_H);
    }
  }

  private drawSign(g: Ctx, time: number): void {
    // Mostly on, with a stutter every so often. Rebuilt from the sim clock, so it is repeatable.
    const t = time % 9;
    if (t > 7.2 && t < 7.5) return;
    if (t > 7.7 && t < 7.8) return;
    sign(g, 'LAST CALL', SIGN_X, 13, '#ff5f8a');
  }
}
