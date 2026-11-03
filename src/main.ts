import './style.css';
import { FrameStats } from './render/stats';
import { Scene, TILE } from './render/scene';
import { fitScale, tileAt } from './render/view';
import { createDeck, setCrate } from './sim/layout';
import { createSim, setPopulation, TICK, tick } from './sim/sim';

const POPULATIONS = [20, 50, 100, 200];
const MAX_STEPS_PER_FRAME = 5;

const deck = createDeck();
const sim = createSim(deck, 77, 20);
const scene = new Scene();
const logW = deck.cols * TILE;
const logH = deck.rows * TILE;

const canvas = document.querySelector<HTMLCanvasElement>('#deck')!;
const g = canvas.getContext('2d', { alpha: false })!;
canvas.width = logW;
canvas.height = logH;
g.imageSmoothingEnabled = false;

let cssPerPixel = 1;
function resize(): void {
  const stage = document.querySelector<HTMLElement>('#stage')!;
  const fit = fitScale(stage.clientWidth, stage.clientHeight, window.devicePixelRatio || 1, logW, logH);
  cssPerPixel = fit.cssPerPixel;
  canvas.style.width = `${fit.cssWidth}px`;
  canvas.style.height = `${fit.cssHeight}px`;
}
window.addEventListener('resize', resize);
resize();

let crates = 0;
const readout = {
  fps: document.querySelector<HTMLElement>('#fps')!,
  slow: document.querySelector<HTMLElement>('#slow')!,
  work: document.querySelector<HTMLElement>('#work')!,
  people: document.querySelector<HTMLElement>('#people')!,
  crates: document.querySelector<HTMLElement>('#crates')!,
};

canvas.addEventListener('pointerdown', (e) => {
  const box = canvas.getBoundingClientRect();
  const { x, y } = tileAt(e.clientX - box.left, e.clientY - box.top, cssPerPixel, TILE);
  const wasCrate = deck.cells[y * deck.cols + x] === 'x';
  if (setCrate(deck, x, y)) crates += wasCrate ? -1 : 1;
});

const frames = new FrameStats(240);
const work = new FrameStats(240);

const picker = document.querySelector<HTMLElement>('#population')!;
for (const n of POPULATIONS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = String(n);
  b.setAttribute('aria-pressed', String(n === sim.target));
  b.addEventListener('click', () => {
    setPopulation(sim, n);
    frames.clear();
    work.clear();
    picker.querySelectorAll('button').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
  });
  picker.append(b);
}

let last = performance.now();
let lag = 0;
let sinceReadout = 0;

function frame(now: number): void {
  const dt = now - last;
  last = now;
  // A hidden page sends no frames; don't count that gap, or try to catch it up.
  if (dt < 250) {
    frames.add(dt);
    lag += dt / 1000;
    sinceReadout += dt;
  }
  const start = performance.now();
  for (let i = 0; lag >= TICK && i < MAX_STEPS_PER_FRAME; i++) {
    tick(sim);
    lag -= TICK;
  }
  if (lag >= TICK) lag = 0;
  scene.draw(g, sim, lag / TICK);
  work.add(performance.now() - start);

  if (sinceReadout > 500) {
    sinceReadout = 0;
    readout.fps.textContent = frames.fps().toFixed(0);
    readout.slow.textContent = `${frames.p95().toFixed(1)} ms`;
    readout.work.textContent = `${work.average().toFixed(1)} ms`;
    readout.people.textContent = String(sim.agents.length);
    readout.crates.textContent = String(crates);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
