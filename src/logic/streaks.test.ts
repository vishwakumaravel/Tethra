import { describe, expect, it } from 'vitest';

import { applyPairedDayToStreak } from './streaks';

describe('streak logic', () => {
  it('starts a streak on the first paired day', () => {
    expect(applyPairedDayToStreak({ currentStreak: 0, lastPairedDay: null, longestStreak: 0 }, '2026-04-24')).toEqual({
      currentStreak: 1,
      lastPairedDay: '2026-04-24',
      longestStreak: 1,
    });
  });

  it('continues on consecutive paired days', () => {
    expect(applyPairedDayToStreak({ currentStreak: 2, lastPairedDay: '2026-04-24', longestStreak: 2 }, '2026-04-25')).toEqual({
      currentStreak: 3,
      lastPairedDay: '2026-04-25',
      longestStreak: 3,
    });
  });

  it('resets after a missed paired day', () => {
    expect(applyPairedDayToStreak({ currentStreak: 5, lastPairedDay: '2026-04-24', longestStreak: 5 }, '2026-04-26')).toEqual({
      currentStreak: 1,
      lastPairedDay: '2026-04-26',
      longestStreak: 5,
    });
  });

  it('does not double-count the same paired day', () => {
    expect(applyPairedDayToStreak({ currentStreak: 4, lastPairedDay: '2026-04-24', longestStreak: 4 }, '2026-04-24')).toEqual({
      currentStreak: 4,
      lastPairedDay: '2026-04-24',
      longestStreak: 4,
    });
  });
});
