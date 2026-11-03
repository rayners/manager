// Plays the station headlessly across seeds: npm run simulate [hours]
import { CONTENT } from '../src/data/visitors';
import { createDeck } from '../src/sim/layout';
import { createSim, TICK, tick } from '../src/sim/sim';

const hours = Number(process.argv[2] ?? 1);
console.log(`${hours} hour(s) per seed\nseed  credits  served  unhappy  scuffles  lost  avg aboard  peak`);
for (let seed = 1; seed <= 8; seed++) {
  const s = createSim(createDeck(), seed);
  let total = 0;
  let peak = 0;
  const ticks = Math.round((hours * 3600) / TICK);
  for (let i = 0; i < ticks; i++) {
    tick(s, CONTENT);
    total += s.agents.length;
    peak = Math.max(peak, s.agents.length);
  }
  const cols = [seed, s.money, s.served, s.unhappy, s.scuffles, s.lostShips, (total / ticks).toFixed(1), peak];
  console.log(cols.map((v, i) => String(v).padStart([4, 7, 6, 7, 8, 4, 10, 4][i]!)).join('  '));
}
