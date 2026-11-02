import { describe, expect, it } from 'vitest';
import {
  FLIGHT_TIME,
  RINGS_PER_ROUND,
  WOBBLE,
  bottleAt,
  createState,
  step,
  toss,
  wobbleAt,
} from './game';

describe('ring toss', () => {
  it('starts with a full set of rings, a grid of bottles and no score', () => {
    const state = createState();
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
    expect(state.bottles).toHaveLength(15);
    expect(state.bottles.every((b) => !b.ringed)).toBe(true);
  });

  it('uses one ring per throw', () => {
    const state = createState();
    expect(toss(state, 400, 200)).toBe(true);
    expect(state.ringsLeft).toBe(RINGS_PER_ROUND - 1);
    expect(state.rings).toHaveLength(1);
  });

  it('cannot throw once the rings run out', () => {
    const state = createState();
    state.ringsLeft = 0;
    expect(toss(state, 400, 200)).toBe(false);
    expect(state.rings).toHaveLength(0);
  });

  it('scores a ring that lands on a bottle neck', () => {
    const state = createState();
    const bottle = state.bottles[0];
    toss(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(bottle.points);
    expect(bottle.ringed).toBe(true);
    expect(state.rings).toHaveLength(0);
  });

  it('scores nothing until the ring lands', () => {
    const state = createState();
    const bottle = state.bottles[0];
    toss(state, bottle.x, bottle.y);
    step(state, FLIGHT_TIME / 2);
    expect(state.score).toBe(0);
    expect(state.rings).toHaveLength(1);
  });

  it('scores nothing for a ring that misses every bottle', () => {
    const state = createState();
    toss(state, 10, 450);
    step(state, FLIGHT_TIME);
    expect(state.score).toBe(0);
    expect(state.bottles.every((b) => !b.ringed)).toBe(true);
  });

  it('scores bottles further back higher', () => {
    const state = createState();
    const rows = [...new Set(state.bottles.map((b) => b.y))].sort((a, b) => a - b);
    const pointsByRow = rows.map((y) => state.bottles.find((b) => b.y === y)!.points);
    expect(pointsByRow).toEqual([30, 20, 10]);
  });

  it('lets each bottle hold only one ring', () => {
    const state = createState();
    const bottle = state.bottles[0];
    bottle.ringed = true;
    expect(bottleAt(state.bottles, bottle.x, bottle.y)).toBeUndefined();
  });

  it('ends the round when the rings run out and the last one has landed', () => {
    const state = createState();
    state.ringsLeft = 1;
    toss(state, 400, 200);
    step(state, FLIGHT_TIME / 2);
    expect(state.phase).toBe('playing');
    step(state, FLIGHT_TIME);
    expect(state.phase).toBe('over');
  });

  it('keeps the wobble within its range', () => {
    for (let t = 0; t < 10; t += 0.1) {
      expect(Math.abs(wobbleAt(t))).toBeLessThanOrEqual(WOBBLE);
    }
  });
});
