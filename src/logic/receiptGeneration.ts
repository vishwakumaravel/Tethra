import { canShowSensitiveReceiptInsight, getReceiptConfidence, ReceiptConfidence } from './receiptConfidence';
import { ReceiptScores } from './receiptScores';

export const RECEIPT_GENERATION_VERSION = 1;

export type ReceiptTemplate = {
  funInsight: string;
  greenFlag: string | null;
  redFlag: string | null;
  summary: string;
};

export function buildReceiptTemplate({
  confidence,
  pairedDaysCount,
  scores,
}: {
  confidence?: ReceiptConfidence;
  pairedDaysCount: number;
  scores: ReceiptScores;
}): ReceiptTemplate {
  const receiptConfidence = confidence ?? getReceiptConfidence(pairedDaysCount);

  if (!canShowSensitiveReceiptInsight(receiptConfidence)) {
    return {
      funInsight: 'The sample size is giving appetizer.',
      greenFlag: pairedDaysCount > 0 ? 'You still showed up together.' : null,
      redFlag: null,
      summary:
        pairedDaysCount === 0
          ? 'No full paired days yet. Do the ritual together and this receipt gets smarter.'
          : 'Tiny receipt. There is a little signal, but not enough to make the spicy reads fair yet.',
    };
  }

  const strongestScore = getStrongestScore(scores);
  const weakestScore = getWeakestScore(scores);

  return {
    funInsight: getFunInsight(scores),
    greenFlag: getGreenFlag(strongestScore),
    redFlag: getRedFlag(weakestScore),
    summary: getSummary({ confidence: receiptConfidence, pairedDaysCount, scores }),
  };
}

function getStrongestScore(scores: ReceiptScores) {
  const positiveScores = [
    { key: 'compatibility', value: scores.compatibilityScore },
    { key: 'communication', value: scores.communicationScore },
    { key: 'emotional_alignment', value: scores.emotionalAlignmentScore },
    { key: 'attachment_balance', value: scores.attachmentBalanceScore },
  ];

  return positiveScores.sort((left, right) => right.value - left.value)[0];
}

function getWeakestScore(scores: ReceiptScores) {
  const riskAdjusted = [
    { key: 'compatibility', value: 100 - scores.compatibilityScore },
    { key: 'communication', value: 100 - scores.communicationScore },
    { key: 'emotional_alignment', value: 100 - scores.emotionalAlignmentScore },
    { key: 'conflict_risk', value: scores.conflictRiskScore },
    { key: 'attachment_balance', value: 100 - scores.attachmentBalanceScore },
  ];

  return riskAdjusted.sort((left, right) => right.value - left.value)[0];
}

function getGreenFlag(score: { key: string; value: number }) {
  switch (score.key) {
    case 'communication':
      return 'You both kept showing up after the reveal.';
    case 'emotional_alignment':
      return 'Your moods were weirdly in sync this week.';
    case 'attachment_balance':
      return 'The effort looked pretty balanced.';
    default:
      return 'Your check-ins landed closer than expected.';
  }
}

function getRedFlag(score: { key: string; value: number }) {
  switch (score.key) {
    case 'communication':
      return 'The ritual needs more two-sided follow-through.';
    case 'conflict_risk':
      return 'Stress may be doing too much in the group chat.';
    case 'attachment_balance':
      return 'One side may be carrying more emotional weight.';
    case 'emotional_alignment':
      return 'You were not always reading the same room.';
    default:
      return 'Your answers had more distance than usual.';
  }
}

function getFunInsight(scores: ReceiptScores) {
  if (scores.conflictRiskScore >= 60) {
    return 'One of you needed a snack and a soft launch apology.';
  }

  if (scores.communicationScore >= 75) {
    return 'Suspiciously functional. We are watching respectfully.';
  }

  if (scores.attachmentBalanceScore < 60) {
    return 'One person was giving novel. One person was giving caption.';
  }

  return 'The vibe was mostly synced, with just enough chaos to be believable.';
}

function getSummary({
  confidence,
  pairedDaysCount,
  scores,
}: {
  confidence: ReceiptConfidence;
  pairedDaysCount: number;
  scores: ReceiptScores;
}) {
  if (confidence === 'high') {
    return `Strong read: ${pairedDaysCount} paired days gave this receipt real signal. Your alignment is ${scores.emotionalAlignmentScore >= 75 ? 'steady' : 'still forming'}, and the week had ${scores.conflictRiskScore >= 55 ? 'some stress heat' : 'manageable tension'}.`;
  }

  return `Medium read: ${pairedDaysCount} paired days is enough for a useful reflection, but not enough for dramatic certainty. Keep stacking rituals for sharper flags.`;
}
