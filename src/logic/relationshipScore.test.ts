import { describe, expect, it } from 'vitest';

import {
  calculateConsistencyScore,
  calculateInteractionDepthScore,
  calculateMutualEffortScore,
  calculateRelationshipScore,
  capRelationshipScoreForPairedDays,
  getRelationshipScoreCapForPairedDays,
} from './relationshipScore';

describe('relationship score', () => {
  it('weights consistency and streak continuity', () => {
    expect(calculateConsistencyScore({ currentStreak: 7, eligibleDays: 14, pairedDays: 14 })).toBe(100);
    expect(calculateConsistencyScore({ currentStreak: 0, eligibleDays: 14, pairedDays: 7 })).toBe(42.5);
  });

  it('penalizes one-sided usage in mutual effort', () => {
    expect(calculateMutualEffortScore({ user1ActionRate: 1, user2ActionRate: 1 })).toBe(100);
    expect(calculateMutualEffortScore({ user1ActionRate: 1, user2ActionRate: 0 })).toBe(0);
  });

  it('scores interaction depth from reactions and notes', () => {
    expect(calculateInteractionDepthScore([{ noteCount: 0, reactionCount: 2 }])).toBe(50);
    expect(calculateInteractionDepthScore([{ noteCount: 1, reactionCount: 1 }])).toBe(75);
    expect(calculateInteractionDepthScore([{ noteCount: 2, reactionCount: 2 }])).toBe(100);
  });

  it('applies the locked weighted formula', () => {
    expect(
      calculateRelationshipScore({
        consistencyScore: 80,
        interactionDepthScore: 50,
        mutualEffortScore: 70,
        partnerAwarenessScore: 60,
      }),
    ).toBe(69);
  });

  it('caps early scores so tiers feel earned over time', () => {
    expect(getRelationshipScoreCapForPairedDays(1)).toBe(34);
    expect(getRelationshipScoreCapForPairedDays(6)).toBe(64);
    expect(getRelationshipScoreCapForPairedDays(14)).toBe(89);
    expect(getRelationshipScoreCapForPairedDays(30)).toBe(100);
    expect(capRelationshipScoreForPairedDays(92, 1)).toBe(34);
  });
});
