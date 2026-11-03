/** One deck: a tile grid that is plain data, so it saves as JSON. */
export type Facing = 'down' | 'up' | 'left' | 'right';
export type SpotKind = 'stool' | 'chair' | 'machine';
export interface Spot {
  x: number;
  y: number;
  kind: SpotKind;
  facing: Facing;
}
export interface Deck {
  cols: number;
  rows: number;
  cells: string[];
  spots: Spot[];
  door: { x: number; y: number };
  /** Bumped on every layout change; routes are cached against it. */
  version: number;
}

// # wall  . floor  B bar  V vending  J jukebox  T table  C cargo  x player's crate
// s stool  c chair  m stand at a machine  D docking door
const MAP = [
  '######################',
  '######################',
  '######################',
  '######################',
  '#BBBBBBBBB....VV..JJ.#',
  '#.s.s.s.s.....m...m..#',
  '#....................#',
  '#...c.....c.....CC...#',
  '#..cTc...cTc....CC...#',
  '#...c.....c..........#',
  '#....................D',
  '#...c.....c..........#',
  '#..cTc...cTc.........#',
  '#...c.....c..........#',
  '#....................#',
  '######################',
];

const OPEN = new Set(['.', 's', 'c', 'm', 'D']);

export function createDeck(): Deck {
  const rows = MAP.length;
  const cols = MAP[0]!.length;
  const cells = MAP.join('').split('');
  const at = (x: number, y: number) => cells[y * cols + x];
  const spots: Spot[] = [];
  let door = { x: 0, y: 0 };
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = at(x, y);
      if (c === 'D') door = { x, y };
      if (c === 's') spots.push({ x, y, kind: 'stool', facing: 'up' });
      if (c === 'm') spots.push({ x, y, kind: 'machine', facing: 'up' });
      if (c === 'c') {
        const facing: Facing =
          at(x, y + 1) === 'T' ? 'down' : at(x, y - 1) === 'T' ? 'up' : at(x + 1, y) === 'T' ? 'right' : 'left';
        spots.push({ x, y, kind: 'chair', facing });
      }
    }
  }
  return { cols, rows, cells, spots, door, version: 0 };
}

export function cellAt(d: Deck, x: number, y: number): string {
  if (x < 0 || y < 0 || x >= d.cols || y >= d.rows) return '#';
  return d.cells[y * d.cols + x]!;
}

export function isOpen(d: Deck, x: number, y: number): boolean {
  return OPEN.has(cellAt(d, x, y));
}

function floorIsConnected(d: Deck): boolean {
  const seen = new Set<number>([d.door.y * d.cols + d.door.x]);
  const queue = [d.door];
  while (queue.length) {
    const { x, y } = queue.pop()!;
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as const) {
      const key = ny * d.cols + nx;
      if (isOpen(d, nx, ny) && !seen.has(key)) {
        seen.add(key);
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return seen.size === d.cells.filter((c) => OPEN.has(c)).length;
}

/** Toggles a player's crate. Returns false if that tile can't change. */
export function setCrate(d: Deck, x: number, y: number): boolean {
  const c = cellAt(d, x, y);
  const i = y * d.cols + x;
  if (c === 'x') {
    d.cells[i] = '.';
    d.version++;
    return true;
  }
  if (c !== '.') return false;
  d.cells[i] = 'x';
  if (!floorIsConnected(d)) {
    d.cells[i] = '.';
    return false;
  }
  d.version++;
  return true;
}
