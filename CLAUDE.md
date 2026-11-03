# Last Call at the Lagrange: working notes for Claude

A casual, pixel-art management sim about a dive bar on a Kessler-Amari Combine waystation. The player is an unseen owner who designs the place and sets policy.

Current stage: **scene spike**. It answers whether a live canvas crowd runs well on a real iPhone before anything else gets built.

## Requirements

1. **Strict TDD for simulation code.** Tests first, named for the behaviour they promise. Check rendering by looking at it in a browser.
2. **Phone and desktop are both first-class.** iPhone Safari is the primary device. Tap targets of at least 44px, `100dvh`, safe-area insets, no hover-only controls.
3. **No backend** for now. A static site, with state in the browser.
4. **The simulation stays pure.** Nothing in `src/sim/` touches the DOM, `Date.now()` or `Math.random()`. Time advances in fixed ticks, randomness comes from the seed stored in state, and state must survive a JSON round trip. Derived data such as routes lives outside saved state.
5. **Keep the simulation setting-neutral.** Sci-fi names and writing belong in data tables.
6. **No new dependencies without need.** No UI framework.

## Layout

- `src/sim/`: the deck layout, distance-field pathing and crowd simulation.
- `src/render/`: code-drawn pixel art, integer scaling, frame stats. It reads sim state and interpolates between ticks.
- `src/main.ts`: the page, the loop and the performance readout.

## Commands

- `npm run dev -- --host`: dev server, reachable from a phone on the same network.
- `npm test`, `npm run typecheck`, `npm run build`.
