import { describe, expect, it } from 'vitest';

import { canShowSensitiveReceiptInsight, getReceiptConfidence } from './receiptConfidence';

describe('receipt confidence', () => {
  it('labels sparse weeks as low confidence', () => {
    expect(getReceiptConfidence(0)).toBe('low');
    expect(getReceiptConfidence(3)).toBe('low');
    expect(canShowSensitiveReceiptInsight('low')).toBe(false);
  });

  it('labels fuller weeks as medium or high confidence', () => {
    expect(getReceiptConfidence(4)).toBe('medium');
    expect(getReceiptConfidence(5)).toBe('medium');
    expect(getReceiptConfidence(6)).toBe('high');
    expect(getReceiptConfidence(7)).toBe('high');
  });
});
