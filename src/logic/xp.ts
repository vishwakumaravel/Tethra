export const PAIRED_DAY_XP = 10;
export const REACTION_XP = 2;

export const STREAK_MILESTONE_XP: Record<number, number> = {
  3: 15,
  7: 25,
  14: 50,
  30: 75,
};

export function getStreakMilestoneXp(streak: number) {
  return STREAK_MILESTONE_XP[streak] ?? 0;
}

export function calculatePairedDayXp(streak: number) {
  return PAIRED_DAY_XP + getStreakMilestoneXp(streak);
}

export function calculateReactionXp({
  alreadyReacted,
  revealReady,
}: {
  alreadyReacted: boolean;
  revealReady: boolean;
}) {
  if (!revealReady || alreadyReacted) {
    return 0;
  }

  return REACTION_XP;
}
