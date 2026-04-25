import { describe, expect, it } from 'vitest';

import { calculateReceiptScores, getScoreLabel, ReceiptDayInput } from './receiptScores';

describe('receipt scores', () => {
  it('rewards aligned paired days and two-sided reactions', () => {
    const days: ReceiptDayInput[] = [
      { moodDiff: 0, relationshipFeelingDiff: 0, stressDiff: 1, stressMax: 2, twoSidedReaction: true },
      { moodDiff: 1, relationshipFeelingDiff: 0, stressDiff: 0, stressMax: 3, twoSidedReaction: true },
      { moodDiff: 0, relationshipFeelingDiff: 1, stressDiff: 1, stressMax: 3, twoSidedReaction: true },
      { moodDiff: 1, relationshipFeelingDiff: 1, stressDiff: 0, stressMax: 2, twoSidedReaction: false },
      { moodDiff: 0, relationshipFeelingDiff: 0, stressDiff: 0, stressMax: 1, twoSidedReaction: true },
      { moodDiff: 1, relationshipFeelingDiff: 0, stressDiff: 1, stressMax: 3, twoSidedReaction: true },
    ];

    const scores = calculateReceiptScores(days);

    expect(scores.compatibilityScore).toBeGreaterThanOrEqual(88);
    expect(scores.communicationScore).toBeGreaterThanOrEqual(85);
    expect(scores.emotionalAlignmentScore).toBeGreaterThanOrEqual(85);
    expect(scores.conflictRiskScore).toBeLessThan(35);
    expect(getScoreLabel(scores.compatibilityScore)).toBe('Strong');
  });

  it('raises risk when stress and disagreement are high', () => {
    const days: ReceiptDayInput[] = [
      { moodDiff: 4, relationshipFeelingDiff: 4, stressDiff: 3, stressMax: 5, twoSidedReaction: false },
      { moodDiff: 3, relationshipFeelingDiff: 4, stressDiff: 4, stressMax: 5, twoSidedReaction: false },
      { moodDiff: 4, relationshipFeelingDiff: 3, stressDiff: 4, stressMax: 4, twoSidedReaction: false },
      { moodDiff: 3, relationshipFeelingDiff: 3, stressDiff: 3, stressMax: 5, twoSidedReaction: false },
    ];

    const scores = calculateReceiptScores(days);

    expect(scores.compatibilityScore).toBeLessThan(50);
    expect(scores.conflictRiskScore).toBeGreaterThanOrEqual(80);
    expect(getScoreLabel(scores.conflictRiskScore, 'conflict')).toBe('High');
  });
});
