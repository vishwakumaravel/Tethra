import { describe, expect, it } from 'vitest';

import {
  countDaysInWindow,
  getMondayWeekStart,
  getPreviousClosedReceiptWindow,
  getReceiptGenerationKey,
  getReceiptWeekWindow,
  isReceiptWindowClosed,
} from './receiptWindows';

describe('receipt windows', () => {
  it('uses Monday through Sunday receipt weeks', () => {
    expect(getMondayWeekStart('2026-04-22')).toBe('2026-04-20');
    expect(getReceiptWeekWindow('2026-04-20')).toEqual({
      periodEndLocal: '2026-04-26',
      periodStartLocal: '2026-04-20',
    });
  });

  it('finds the previous closed week from the current local day', () => {
    expect(getPreviousClosedReceiptWindow('2026-04-27')).toEqual({
      periodEndLocal: '2026-04-26',
      periodStartLocal: '2026-04-20',
    });
    expect(getPreviousClosedReceiptWindow('2026-04-30')).toEqual({
      periodEndLocal: '2026-04-26',
      periodStartLocal: '2026-04-20',
    });
  });

  it('detects closed windows and stable idempotent keys', () => {
    const window = getReceiptWeekWindow('2026-04-20');

    expect(countDaysInWindow(window)).toBe(7);
    expect(isReceiptWindowClosed(window, '2026-04-26')).toBe(false);
    expect(isReceiptWindowClosed(window, '2026-04-27')).toBe(true);
    expect(getReceiptGenerationKey({ coupleId: 'couple', generationVersion: 1, periodStartLocal: '2026-04-20' })).toBe(
      'couple:2026-04-20:v1',
    );
  });
});
