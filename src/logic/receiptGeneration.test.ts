import { describe, expect, it } from 'vitest';

import { buildReceiptTemplate, RECEIPT_GENERATION_VERSION } from './receiptGeneration';

describe('receipt generation', () => {
  const scores = {
    attachmentBalanceScore: 72,
    communicationScore: 80,
    compatibilityScore: 78,
    conflictRiskScore: 28,
    emotionalAlignmentScore: 84,
  };

  it('keeps low-confidence receipts soft and non-sensitive', () => {
    const receipt = buildReceiptTemplate({ confidence: 'low', pairedDaysCount: 2, scores });

    expect(receipt.redFlag).toBeNull();
    expect(receipt.summary.toLowerCase()).toContain('tiny receipt');
    expect(receipt.funInsight).not.toContain('who misunderstood');
  });

  it('selects deterministic sections when enough signal exists', () => {
    const receipt = buildReceiptTemplate({ confidence: 'high', pairedDaysCount: 7, scores });

    expect(receipt.greenFlag).toBe('Your moods were weirdly in sync this week.');
    expect(receipt.redFlag).toBeTruthy();
    expect(receipt.summary).toContain('7 paired days');
    expect(RECEIPT_GENERATION_VERSION).toBe(1);
  });
});
