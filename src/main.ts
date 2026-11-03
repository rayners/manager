import './style.css';
import { FrameStats } from './render/stats';
import { Scene, TILE } from './render/scene';
import { fitScale, tileAt } from './render/view';
import { CONTENT } from './data/visitors';
import { createDeck, setCrate } from './sim/layout';
import { createSim, TICK, tick } from './sim/sim';

const MAX_STEPS_PER_FRAME = 5;

const deck = createDeck();
const sim = createSim(deck, 77);
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

const text = (id: string) => document.querySelector<HTMLElement>(`#${id}`)!;
const readout = {
  money: text('money'),
  people: text('people'),
  ships: text('ships'),
  served: text('served'),
  unhappy: text('unhappy'),
  scuffles: text('scuffles'),
  lost: text('lost'),
  fps: text('fps'),
};

canvas.addEventListener('pointerdown', (e) => {
  const box = canvas.getBoundingClientRect();
  const { x, y } = tileAt(e.clientX - box.left, e.clientY - box.top, cssPerPixel, TILE);
  setCrate(deck, x, y);
});

const frames = new FrameStats(240);

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
  for (let i = 0; lag >= TICK && i < MAX_STEPS_PER_FRAME; i++) {
    tick(sim, CONTENT);
    lag -= TICK;
  }
  if (lag >= TICK) lag = 0;
  scene.draw(g, sim, lag / TICK);

  if (sinceReadout > 500) {
    sinceReadout = 0;
    readout.money.textContent = `${sim.money}`;
    readout.people.textContent = `${sim.agents.length}`;
    readout.ships.textContent = `${sim.ships.filter((x) => x.state === 'docked').length} / ${sim.ships.filter((x) => x.state === 'waiting').length}`;
    readout.served.textContent = `${sim.served}`;
    readout.unhappy.textContent = `${sim.unhappy}`;
    readout.scuffles.textContent = `${sim.scuffles}`;
    readout.lost.textContent = `${sim.lostShips}`;
    readout.fps.textContent = frames.fps().toFixed(0);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
