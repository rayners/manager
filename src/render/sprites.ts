// Palette-indexed person sprites: h hair, f skin, e eye, s suit, a suit accent, p trousers, b boots.
export const PERSON_W = 8;
export const PERSON_H = 12;

const HEAD_DOWN = ['..hhhh..', '.hhhhhh.', '.hffffh.', '.feffef.', '..ffff..'];
const HEAD_UP = ['..hhhh..', '.hhhhhh.', '.hhhhhh.', '.hhhhhh.', '..ffff..'];
const HEAD_SIDE = ['..hhhh..', '.hhhhhh.', '.hhffff.', '.hhffef.', '...fff..'];
const BODY = ['.ssaass.', 'fsssssaf', 'fsssssaf', '.ssssss.'];
const BODY_SIDE = ['..ssas..', '..ssas..', '..sfss..', '..ssss..'];
const LEGS_STAND = ['.pp..pp.', '.pp..pp.', '.bb..bb.'];
const LEGS_A = ['.pp..pp.', '.pp...b.', '.bb.....'];
const LEGS_B = ['.pp..pp.', '.b...pp.', '.....bb.'];
const SIDE_STAND = ['..pppp..', '..pp.p..', '..bb.bb.'];
const SIDE_A = ['..pppp..', '.pp..pp.', '.bb...bb'];
const SIDE_B = ['...pp...', '...pp...', '...bb...'];
const LEGS_SIT = ['.pppppp.', '.bb..bb.', '........'];

export const FRAMES = {
  down0: [...HEAD_DOWN, ...BODY, ...LEGS_STAND],
  down1: [...HEAD_DOWN, ...BODY, ...LEGS_A],
  down2: [...HEAD_DOWN, ...BODY, ...LEGS_B],
  up0: [...HEAD_UP, ...BODY, ...LEGS_STAND],
  up1: [...HEAD_UP, ...BODY, ...LEGS_A],
  up2: [...HEAD_UP, ...BODY, ...LEGS_B],
  side0: [...HEAD_SIDE, ...BODY_SIDE, ...SIDE_STAND],
  side1: [...HEAD_SIDE, ...BODY_SIDE, ...SIDE_A],
  side2: [...HEAD_SIDE, ...BODY_SIDE, ...SIDE_B],
  sitDown: [...HEAD_DOWN, ...BODY, ...LEGS_SIT],
  sitUp: [...HEAD_UP, ...BODY, ...LEGS_SIT],
} satisfies Record<string, string[]>;
export type FrameName = keyof typeof FRAMES;

export interface Variant {
  h: string;
  f: string;
  e: string;
  s: string;
  a: string;
  p: string;
  b: string;
}

const EYE = '#1d1a22';
const person = (h: string, f: string, s: string, a: string, p: string, b: string): Variant => ({ h, f, e: EYE, s, a, p, b });

// Jumpsuits and work clothes in a worn, used-future range.
export const VARIANTS: Variant[] = [
  person('#3a2a20', '#e0ac82', '#c9772f', '#f0c040', '#5a4a3a', '#2b2520'),
  person('#16141c', '#8d5a3c', '#4f7a78', '#d9d0b0', '#3a4448', '#20242a'),
  person('#c9b48a', '#f0c8a4', '#8a8f5a', '#3a3f28', '#4e5236', '#2b2a1e'),
  person('#6e2f22', '#e8b890', '#a33b32', '#e8e0c8', '#3e3a3c', '#222026'),
  person('#2a2230', '#5e3c2a', '#d8cfb4', '#c9772f', '#6c6856', '#2e2a24'),
  person('#8c8c88', '#d8a47c', '#3f5f8a', '#e0e0d0', '#2f3c54', '#1e2430'),
  person('#1c1a1a', '#b57e56', '#6b4f7a', '#d4b070', '#3a3044', '#201a26'),
  person('#b5572a', '#f4d0b0', '#3e6b4a', '#c8d890', '#2c4432', '#1c2a20'),
  person('#40301e', '#a06a44', '#b8a038', '#3a3420', '#5a5230', '#2a2618'),
  person('#dcd8c8', '#7a4e34', '#7a3e4e', '#e0c0a0', '#44303a', '#261c22'),
  person('#241c34', '#ecbc98', '#58707e', '#f09030', '#37464e', '#1e262b'),
  person('#5a4630', '#c8966e', '#9a9488', '#d04030', '#55524a', '#2a2826'),
];
