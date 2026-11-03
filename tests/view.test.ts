import { describe, expect, it } from 'vitest';
import { fitScale, tileAt } from '../src/render/view';
import { FrameStats } from '../src/render/stats';

describe('fitting the scene to the screen', () => {
  it('uses a whole number of device pixels per game pixel, so art stays crisp', () => {
    const f = fitScale(390, 600, 3, 264, 192);
    expect(f.devicePerPixel).toBe(4);
    expect(f.cssWidth).toBeCloseTo((264 * 4) / 3);
  });
  it('fits an iPhone width with no sideways scrolling', () => {
    expect(fitScale(390, 600, 3, 264, 192).cssWidth).toBeLessThanOrEqual(390);
    expect(fitScale(320, 500, 2, 264, 192).cssWidth).toBeLessThanOrEqual(320);
  });
  it('is limited by height on a wide screen', () => {
    expect(fitScale(1600, 400, 1, 264, 192).cssHeight).toBeLessThanOrEqual(400);
  });
  it('never drops below one device pixel per game pixel', () => {
    expect(fitScale(100, 100, 1, 264, 192).devicePerPixel).toBe(1);
  });
  it('turns a tap into the tile under it', () => {
    expect(tileAt(100, 60, 2, 12)).toEqual({ x: 4, y: 2 });
  });
});

describe('the frame readout', () => {
  it('reports frame rate and the slow 95th-percentile frame', () => {
    const s = new FrameStats(100);
    for (let i = 0; i < 95; i++) s.add(10);
    for (let i = 0; i < 5; i++) s.add(50);
    expect(s.fps()).toBeCloseTo(1000 / 12);
    expect(s.p95()).toBe(50);
  });
  it('only keeps the recent frames', () => {
    const s = new FrameStats(3);
    [100, 100, 100, 10, 10, 10].forEach((v) => s.add(v));
    expect(s.fps()).toBeCloseTo(100);
  });
  it('reports nothing before any frames arrive', () => {
    expect(new FrameStats(3).fps()).toBe(0);
  });
});
