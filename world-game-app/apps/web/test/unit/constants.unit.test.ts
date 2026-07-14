import { describe, expect, it } from 'vitest';
import { LADDER_AMOUNTS, SAFE_HAVENS, TIMERS } from '../../src/lib/constants';

describe('LADDER_AMOUNTS', () => {
  it('has exactly 15 levels', () => {
    expect(LADDER_AMOUNTS).toHaveLength(15);
  });

  it('is strictly increasing', () => {
    for (let i = 1; i < LADDER_AMOUNTS.length; i++) {
      expect(LADDER_AMOUNTS[i]).toBeGreaterThan(LADDER_AMOUNTS[i - 1]);
    }
  });

  it('starts at $100 and tops out at $1,000,000', () => {
    expect(LADDER_AMOUNTS[0]).toBe(100);
    expect(LADDER_AMOUNTS[14]).toBe(1_000_000);
  });
});

describe('SAFE_HAVENS', () => {
  it('marks levels 5 and 10 as safe havens', () => {
    expect(SAFE_HAVENS).toEqual([5, 10]);
  });

  it('lines up with $1,000 and $32,000 on the ladder', () => {
    expect(LADDER_AMOUNTS[SAFE_HAVENS[0] - 1]).toBe(1000);
    expect(LADDER_AMOUNTS[SAFE_HAVENS[1] - 1]).toBe(32000);
  });
});

describe('TIMERS', () => {
  it('gives harder difficulties more time', () => {
    expect(TIMERS.easy).toBeLessThan(TIMERS.medium);
    expect(TIMERS.medium).toBeLessThan(TIMERS.hard);
  });

  it('defines a timer for every difficulty', () => {
    expect(TIMERS).toEqual({ easy: 20, medium: 25, hard: 30 });
  });
});
