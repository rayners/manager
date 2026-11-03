import { describe, expect, it } from 'vitest';
import { createDeck, isOpen, setCrate } from '../src/sim/layout';

describe('the deck', () => {
  const deck = createDeck();

  it('is a rectangle with a walled edge', () => {
    expect(deck.cells).toHaveLength(deck.cols * deck.rows);
    expect(isOpen(deck, 0, 8)).toBe(false);
  });
  it('has somewhere for people to sit and a door to arrive through', () => {
    expect(deck.spots.length).toBeGreaterThanOrEqual(20);
    expect(isOpen(deck, deck.door.x, deck.door.y)).toBe(true);
  });
  it('treats anything outside the grid as closed', () => {
    expect(isOpen(deck, -1, 5)).toBe(false);
    expect(isOpen(deck, deck.cols, 5)).toBe(false);
  });
  it('lets the player place a crate on open floor and remove it again', () => {
    const d = createDeck();
    expect(setCrate(d, 8, 14)).toBe(true);
    expect(isOpen(d, 8, 14)).toBe(false);
    expect(setCrate(d, 8, 14)).toBe(true);
    expect(isOpen(d, 8, 14)).toBe(true);
  });
  it('refuses a crate on a seat, a wall or the door', () => {
    const d = createDeck();
    const seat = d.spots[0]!;
    expect(setCrate(d, seat.x, seat.y)).toBe(false);
    expect(setCrate(d, 0, 0)).toBe(false);
    expect(setCrate(d, d.door.x, d.door.y)).toBe(false);
  });
  it('refuses a crate that would cut any part of the floor off from the door', () => {
    const d = createDeck();
    expect(setCrate(d, 20, 10)).toBe(false);
    expect(setCrate(d, 19, 14)).toBe(true);
    expect(setCrate(d, 20, 13)).toBe(false);
  });
});
