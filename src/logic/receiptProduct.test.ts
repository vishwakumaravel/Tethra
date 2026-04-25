import { describe, expect, it } from 'vitest';

import { buildBrandedReceipt, getPreviewReceiptScenario } from './receiptProduct';

describe('branded receipt product layer', () => {
  it('turns strong awareness into a viral weekly vibe and pro answers', () => {
    const scenario = getPreviewReceiptScenario('strong_awareness');
    const receipt = buildBrandedReceipt({
      confidence: scenario.confidence,
      currentTier: scenario.tier,
      metrics: scenario.metrics,
      pairedDaysCount: scenario.pairedDaysCount,
    });

    expect(receipt.title).toBe('Mind Readers, Basically');
    expect(receipt.overallScore).toBeGreaterThan(75);
    expect(receipt.proInsightCards.some((card) => card.title === 'Who Misread Who')).toBe(true);
    expect(receipt.lockedInsightCards).toContain('Who Cares More');
  });

  it('makes one-sided effort feel exposed without becoming unfair', () => {
    const scenario = getPreviewReceiptScenario('one_sided_effort');
    const receipt = buildBrandedReceipt({
      confidence: scenario.confidence,
      currentTier: scenario.tier,
      metrics: scenario.metrics,
      pairedDaysCount: scenario.pairedDaysCount,
    });

    expect(receipt.title).toBe('One Carried The Group Project');
    expect(receipt.proInsightCards.find((card) => card.title === 'Who Carried The Week')?.body).toContain('carried');
    expect(receipt.proInsightCards.find((card) => card.title === 'Who Cares More')?.body).toContain('one-sided');
  });

  it('keeps low-data receipts curious but not fake precise', () => {
    const scenario = getPreviewReceiptScenario('low_data');
    const receipt = buildBrandedReceipt({
      confidence: scenario.confidence,
      currentTier: scenario.tier,
      metrics: scenario.metrics,
      pairedDaysCount: scenario.pairedDaysCount,
    });

    expect(receipt.title).toBe('Tiny Sample, Big Potential');
    expect(receipt.lockedInsightCards[0]).toContain('needs more data');
    expect(receipt.proInsightCards[0].title).toBe('Not enough signal yet');
  });
});
