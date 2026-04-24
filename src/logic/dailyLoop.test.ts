import { describe, expect, it } from 'vitest';

import { assertUniqueDailyAction, getTodayStatus, hasCompletedPairedDay } from './dailyLoop';

describe('daily loop logic', () => {
  const users: [string, string] = ['user-a', 'user-b'];

  it('requires both check-ins and predictions for a paired day', () => {
    expect(
      hasCompletedPairedDay({
        checkIns: [
          { userId: 'user-a', localDay: '2026-04-24' },
          { userId: 'user-b', localDay: '2026-04-24' },
        ],
        partnerIds: users,
        predictions: [{ predictorUserId: 'user-a', localDay: '2026-04-24' }],
      }),
    ).toBe(false);

    expect(
      hasCompletedPairedDay({
        checkIns: [
          { userId: 'user-a', localDay: '2026-04-24' },
          { userId: 'user-b', localDay: '2026-04-24' },
        ],
        partnerIds: users,
        predictions: [
          { predictorUserId: 'user-a', localDay: '2026-04-24' },
          { predictorUserId: 'user-b', localDay: '2026-04-24' },
        ],
      }),
    ).toBe(true);
  });

  it('branches current-user status through the ritual', () => {
    expect(getTodayStatus({ checkIns: [], currentUserId: 'user-a', predictions: [], reveal: null })).toBe('needs_check_in');
    expect(
      getTodayStatus({
        checkIns: [{ userId: 'user-a', localDay: '2026-04-24' }],
        currentUserId: 'user-a',
        predictions: [],
        reveal: null,
      }),
    ).toBe('needs_prediction');
    expect(
      getTodayStatus({
        checkIns: [{ userId: 'user-a', localDay: '2026-04-24' }],
        currentUserId: 'user-a',
        predictions: [{ predictorUserId: 'user-a', localDay: '2026-04-24' }],
        reveal: null,
      }),
    ).toBe('waiting_for_partner');
    expect(
      getTodayStatus({
        checkIns: [{ userId: 'user-a', localDay: '2026-04-24' }],
        currentUserId: 'user-a',
        predictions: [{ predictorUserId: 'user-a', localDay: '2026-04-24' }],
        reveal: { id: 'reveal', localDay: '2026-04-24', viewedByCurrentUser: false },
      }),
    ).toBe('reveal_ready');
  });

  it('detects duplicate daily records', () => {
    expect(
      assertUniqueDailyAction(
        [
          { localDay: '2026-04-24', userId: 'user-a' },
          { localDay: '2026-04-24', userId: 'user-a' },
        ],
        '2026-04-24',
      ),
    ).toBe(false);
  });
});
