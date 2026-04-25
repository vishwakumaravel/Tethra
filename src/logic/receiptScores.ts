export type ReceiptDayInput = {
  moodDiff: number;
  relationshipFeelingDiff: number;
  stressDiff: number;
  stressMax: number;
  twoSidedReaction: boolean;
};

export type ReceiptScores = {
  attachmentBalanceScore: number;
  communicationScore: number;
  compatibilityScore: number;
  conflictRiskScore: number;
  emotionalAlignmentScore: number;
};

export function calculateReceiptScores(days: ReceiptDayInput[], pairedDaysCount = days.length): ReceiptScores {
  return {
    attachmentBalanceScore: calculateAttachmentBalanceScore(days),
    communicationScore: calculateCommunicationScore({ pairedDaysCount, twoSidedReactionDays: days.filter((day) => day.twoSidedReaction).length }),
    compatibilityScore: calculateCompatibilityScore(days),
    conflictRiskScore: calculateConflictRiskScore(days),
    emotionalAlignmentScore: calculateEmotionalAlignmentScore(days),
  };
}

export function calculateCompatibilityScore(days: ReceiptDayInput[]) {
  if (days.length === 0) {
    return 0;
  }

  const averageDiff = average(days.map((day) => (day.moodDiff + day.relationshipFeelingDiff) / 2));
  return roundScore(100 - averageDiff * 15);
}

export function calculateCommunicationScore({
  pairedDaysCount,
  twoSidedReactionDays,
}: {
  pairedDaysCount: number;
  twoSidedReactionDays: number;
}) {
  const pairedRate = clamp(pairedDaysCount / 7, 0, 1);
  const reactionRate = pairedDaysCount > 0 ? clamp(twoSidedReactionDays / pairedDaysCount, 0, 1) : 0;
  return roundScore(pairedRate * 75 + reactionRate * 25);
}

export function calculateEmotionalAlignmentScore(days: ReceiptDayInput[]) {
  if (days.length === 0) {
    return 0;
  }

  const averageDiff = average(days.map((day) => (day.moodDiff + day.stressDiff) / 2));
  return roundScore(100 - averageDiff * 20);
}

export function calculateConflictRiskScore(days: ReceiptDayInput[]) {
  if (days.length === 0) {
    return 0;
  }

  const stressSpikeRate = days.filter((day) => day.stressMax >= 4).length / days.length;
  const averageFeelingMismatch = average(days.map((day) => day.relationshipFeelingDiff));
  const averageMoodMismatch = average(days.map((day) => day.moodDiff));
  return roundScore(stressSpikeRate * 35 + averageFeelingMismatch * 12 + averageMoodMismatch * 8);
}

export function calculateAttachmentBalanceScore(days: ReceiptDayInput[]) {
  if (days.length === 0) {
    return 0;
  }

  const averageFeelingDiff = average(days.map((day) => day.relationshipFeelingDiff));
  return roundScore(100 - averageFeelingDiff * 20);
}

export function getScoreLabel(score: number, kind: 'conflict' | 'positive' = 'positive') {
  if (kind === 'conflict') {
    if (score >= 67) {
      return 'High';
    }

    if (score >= 34) {
      return 'Medium';
    }

    return 'Low';
  }

  if (score >= 80) {
    return 'Strong';
  }

  if (score >= 55) {
    return 'Building';
  }

  return 'Needs signal';
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function roundScore(value: number) {
  return Math.round(clamp(value, 0, 100));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
