import { describe, expect, it } from 'vitest';

import { addLocalDays, getCoupleLocalDay, getDaysBetween, isNextLocalDay } from './coupleDay';

describe('couple day logic', () => {
  it('calculates local days from the couple timezone', () => {
    const instant = new Date('2026-04-25T04:30:00.000Z');

    expect(getCoupleLocalDay(instant, 'America/Chicago')).toBe('2026-04-24');
    expect(getCoupleLocalDay(instant, 'UTC')).toBe('2026-04-25');
  });

  it('adds and compares local calendar days', () => {
    expect(addLocalDays('2026-04-24', 1)).toBe('2026-04-25');
    expect(addLocalDays('2026-04-24', -1)).toBe('2026-04-23');
    expect(getDaysBetween('2026-04-24', '2026-04-27')).toBe(3);
    expect(isNextLocalDay('2026-04-24', '2026-04-25')).toBe(true);
  });
});
