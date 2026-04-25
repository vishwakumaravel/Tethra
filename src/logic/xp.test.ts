import { describe, expect, it } from 'vitest';

import { calculatePairedDayXp, calculateReactionXp, getStreakMilestoneXp } from './xp';

describe('xp rules', () => {
  it('awards paired-day XP plus streak milestones', () => {
    expect(calculatePairedDayXp(1)).toBe(10);
    expect(calculatePairedDayXp(3)).toBe(25);
    expect(calculatePairedDayXp(7)).toBe(35);
    expect(calculatePairedDayXp(14)).toBe(60);
    expect(calculatePairedDayXp(30)).toBe(85);
  });

  it('returns milestone XP only at locked thresholds', () => {
    expect(getStreakMilestoneXp(2)).toBe(0);
    expect(getStreakMilestoneXp(3)).toBe(15);
    expect(getStreakMilestoneXp(4)).toBe(0);
  });

  it('only awards reaction XP for the first reaction on a ready reveal', () => {
    expect(calculateReactionXp({ alreadyReacted: false, revealReady: true })).toBe(2);
    expect(calculateReactionXp({ alreadyReacted: true, revealReady: true })).toBe(0);
    expect(calculateReactionXp({ alreadyReacted: false, revealReady: false })).toBe(0);
  });
});
