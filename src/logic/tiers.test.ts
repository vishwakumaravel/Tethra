import { describe, expect, it } from 'vitest';

import { getNextTierProgress, getTierForScore, getTierProgressionNote } from './tiers';

describe('tiers', () => {
  it('maps scores to the locked tier ladder', () => {
    expect(getTierForScore(0)).toBe('Who Even Are You');
    expect(getTierForScore(20)).toBe('Situationship Survivors');
    expect(getTierForScore(50)).toBe('Actually a Couple');
    expect(getTierForScore(80)).toBe('Ride or Dies');
    expect(getTierForScore(97)).toBe('Endgame');
  });

  it('calculates next-tier progress', () => {
    expect(getNextTierProgress(50)).toEqual({
      currentTier: 'Actually a Couple',
      nextTier: 'Locked In',
      percent: 0,
      pointsToNext: 15,
    });
    expect(getNextTierProgress(100)).toEqual({
      currentTier: 'Endgame',
      nextTier: null,
      percent: 100,
      pointsToNext: 0,
    });
  });

  it('explains why early tiers are intentionally slower', () => {
    expect(getTierProgressionNote(1)).toContain('start low');
    expect(getTierProgressionNote(14)).toContain('Endgame');
  });
});
