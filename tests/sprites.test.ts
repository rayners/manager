import { describe, expect, it } from 'vitest';
import { FRAMES, PERSON_H, PERSON_W, VARIANTS } from '../src/render/sprites';

describe('person sprites', () => {
  it('are all the same size', () => {
    for (const [name, rows] of Object.entries(FRAMES)) {
      expect(rows.length, name).toBe(PERSON_H);
      for (const r of rows) expect(r.length, name).toBe(PERSON_W);
    }
  });
  it('use only palette letters every variant defines', () => {
    for (const v of VARIANTS) {
      for (const rows of Object.values(FRAMES)) {
        for (const ch of rows.join('')) {
          if (ch !== '.') expect(v[ch as keyof typeof v], ch).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });
  it('give a crowd enough variety to tell people apart', () => {
    expect(new Set(VARIANTS.map((v) => JSON.stringify(v))).size).toBeGreaterThanOrEqual(8);
  });
});
