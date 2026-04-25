export type RelationshipScoreInput = {
  consistencyScore: number;
  interactionDepthScore: number;
  mutualEffortScore: number;
  partnerAwarenessScore: number;
};

export function calculateConsistencyScore({
  currentStreak,
  eligibleDays,
  pairedDays,
}: {
  currentStreak: number;
  eligibleDays: number;
  pairedDays: number;
}) {
  const safeEligibleDays = Math.max(1, eligibleDays);
  const completionScore = (pairedDays / safeEligibleDays) * 85;
  const streakScore = (Math.min(currentStreak, 7) / 7) * 15;

  return clamp(completionScore + streakScore, 0, 100);
}

export function calculateMutualEffortScore({
  user1ActionRate,
  user2ActionRate,
}: {
  user1ActionRate: number;
  user2ActionRate: number;
}) {
  const user1 = clamp(user1ActionRate, 0, 1);
  const user2 = clamp(user2ActionRate, 0, 1);

  return clamp((1 - Math.abs(user1 - user2)) * ((user1 + user2) / 2) * 100, 0, 100);
}

export function calculateInteractionDepthScore(days: Array<{ noteCount: number; reactionCount: number }>) {
  if (days.length === 0) {
    return 0;
  }

  const total = days.reduce((sum, day) => sum + getDailyInteractionDepth(day), 0);
  return total / days.length;
}

export function calculateRelationshipScore(input: RelationshipScoreInput) {
  return clamp(
    0.4 * input.consistencyScore +
      0.3 * input.partnerAwarenessScore +
      0.2 * input.mutualEffortScore +
      0.1 * input.interactionDepthScore,
    0,
    100,
  );
}

export function capRelationshipScoreForPairedDays(score: number, pairedDays: number) {
  return Math.min(score, getRelationshipScoreCapForPairedDays(pairedDays));
}

export function getRelationshipScoreCapForPairedDays(pairedDays: number) {
  if (pairedDays >= 30) {
    return 100;
  }

  if (pairedDays >= 21) {
    return 96;
  }

  if (pairedDays >= 14) {
    return 89;
  }

  if (pairedDays >= 10) {
    return 79;
  }

  if (pairedDays >= 6) {
    return 64;
  }

  if (pairedDays >= 3) {
    return 49;
  }

  if (pairedDays >= 1) {
    return 34;
  }

  return 19;
}

function getDailyInteractionDepth({ noteCount, reactionCount }: { noteCount: number; reactionCount: number }) {
  if (noteCount >= 2) {
    return 100;
  }

  if (noteCount === 1) {
    return 75;
  }

  if (reactionCount >= 2) {
    return 50;
  }

  if (reactionCount === 1) {
    return 25;
  }

  return 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
