export const TIER_LADDER = [
  { max: 19, min: 0, name: 'Who Even Are You' },
  { max: 34, min: 20, name: 'Situationship Survivors' },
  { max: 49, min: 35, name: 'Text Me Back' },
  { max: 64, min: 50, name: 'Actually a Couple' },
  { max: 79, min: 65, name: 'Locked In' },
  { max: 89, min: 80, name: 'Ride or Dies' },
  { max: 96, min: 90, name: 'Soft Married' },
  { max: 100, min: 97, name: 'Endgame' },
] as const;

export type TierName = (typeof TIER_LADDER)[number]['name'];

export function getTierForScore(score: number): TierName {
  const clampedScore = Math.min(100, Math.max(0, score));
  return TIER_LADDER.find((tier) => clampedScore >= tier.min && clampedScore <= tier.max)?.name ?? 'Who Even Are You';
}

export function getNextTierProgress(score: number) {
  const clampedScore = Math.min(100, Math.max(0, score));
  const currentIndex = TIER_LADDER.findIndex((tier) => clampedScore >= tier.min && clampedScore <= tier.max);
  const currentTier = TIER_LADDER[currentIndex] ?? TIER_LADDER[0];
  const nextTier = TIER_LADDER[currentIndex + 1] ?? null;

  if (!nextTier) {
    return {
      currentTier: currentTier.name,
      nextTier: null,
      percent: 100,
      pointsToNext: 0,
    };
  }

  const range = nextTier.min - currentTier.min;
  const earned = clampedScore - currentTier.min;

  return {
    currentTier: currentTier.name,
    nextTier: nextTier.name,
    percent: Math.round(Math.min(1, Math.max(0, earned / range)) * 100),
    pointsToNext: Math.max(0, Math.ceil(nextTier.min - clampedScore)),
  };
}

export function getTierProgressionNote(pairedDays: number) {
  if (pairedDays < 3) {
    return 'New couples start low on purpose. Rank unlocks through repeated paired days, not one great reveal.';
  }

  if (pairedDays < 14) {
    return 'Keep stacking paired days to unlock the higher viral tiers.';
  }

  if (pairedDays < 30) {
    return 'Higher tiers are now possible, but Endgame still takes longer-term consistency.';
  }

  return 'Every tier is fully unlocked. Now the score has room to speak.';
}
