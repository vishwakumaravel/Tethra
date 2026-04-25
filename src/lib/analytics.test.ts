import { describe, expect, it } from 'vitest';

import { sanitizeAnalyticsProperties } from '../logic/analytics';

describe('analytics sanitization', () => {
  it('removes raw note text and raw answer values', () => {
    expect(
      sanitizeAnalyticsProperties({
        couple_id: 'couple-1',
        mood_score: 5,
        note: 'this should never be sent',
        platform: 'ios',
        relationship_state: 'linked',
      }),
    ).toEqual({
      couple_id: 'couple-1',
      platform: 'ios',
      relationship_state: 'linked',
    });
  });

  it('drops nested objects to keep event payloads metadata-only', () => {
    expect(
      sanitizeAnalyticsProperties({
        local_day: '2026-04-24',
        raw: { hidden: true },
        tier: 'Locked In',
      }),
    ).toEqual({
      local_day: '2026-04-24',
      tier: 'Locked In',
    });
  });
});
