import { PRO_RECEIPT_SECTIONS } from '../product/tethra';

import { ReceiptConfidence } from './receiptConfidence';

export type ReceiptMetricSet = {
  communicationScore: number;
  compatibilityScore: number;
  conflictRiskScore: number;
  effortBalanceScore: number;
  emotionalSyncScore: number;
  partnerAwarenessScore: number;
};

export type BrandedReceipt = {
  currentTier: string;
  freeInsight: string;
  lockedInsightCards: string[];
  overallScore: number;
  proInsightCards: Array<{
    body: string;
    title: string;
  }>;
  shareCardSubtitle: string;
  shortSummary: string;
  title: string;
};

export type ReceiptPreviewScenario =
  | 'high_sync'
  | 'high_stress_mismatch'
  | 'low_data'
  | 'one_sided_effort'
  | 'poor_awareness'
  | 'strong_awareness';

export function buildBrandedReceipt({
  confidence,
  currentTier,
  metrics,
  pairedDaysCount,
}: {
  confidence: ReceiptConfidence;
  currentTier: string;
  metrics: ReceiptMetricSet;
  pairedDaysCount: number;
}): BrandedReceipt {
  const overallScore = calculateOverallReceiptScore(metrics);
  const title = getWeeklyVibe({ confidence, metrics, pairedDaysCount });
  const shortSummary = getShortSummary({ confidence, metrics, pairedDaysCount, title });
  const freeInsight = getFreeInsight({ confidence, metrics, pairedDaysCount });

  return {
    currentTier,
    freeInsight,
    lockedInsightCards: getLockedInsightCards(confidence),
    overallScore,
    proInsightCards: getProInsightCards({ confidence, metrics, pairedDaysCount }),
    shareCardSubtitle: `${overallScore}% in sync · ${currentTier}`,
    shortSummary,
    title,
  };
}

export function getPreviewReceiptScenario(scenario: ReceiptPreviewScenario) {
  switch (scenario) {
    case 'high_sync':
      return {
        confidence: 'high' as const,
        metrics: {
          communicationScore: 86,
          compatibilityScore: 91,
          conflictRiskScore: 18,
          effortBalanceScore: 88,
          emotionalSyncScore: 93,
          partnerAwarenessScore: 84,
        },
        pairedDaysCount: 7,
        tier: 'Locked In',
      };
    case 'one_sided_effort':
      return {
        confidence: 'medium' as const,
        metrics: {
          communicationScore: 58,
          compatibilityScore: 73,
          conflictRiskScore: 36,
          effortBalanceScore: 42,
          emotionalSyncScore: 76,
          partnerAwarenessScore: 69,
        },
        pairedDaysCount: 5,
        tier: 'Actually a Couple',
      };
    case 'high_stress_mismatch':
      return {
        confidence: 'high' as const,
        metrics: {
          communicationScore: 64,
          compatibilityScore: 56,
          conflictRiskScore: 78,
          effortBalanceScore: 67,
          emotionalSyncScore: 48,
          partnerAwarenessScore: 61,
        },
        pairedDaysCount: 6,
        tier: 'Text Me Back',
      };
    case 'strong_awareness':
      return {
        confidence: 'high' as const,
        metrics: {
          communicationScore: 81,
          compatibilityScore: 79,
          conflictRiskScore: 26,
          effortBalanceScore: 74,
          emotionalSyncScore: 77,
          partnerAwarenessScore: 95,
        },
        pairedDaysCount: 7,
        tier: 'Locked In',
      };
    case 'poor_awareness':
      return {
        confidence: 'medium' as const,
        metrics: {
          communicationScore: 69,
          compatibilityScore: 68,
          conflictRiskScore: 52,
          effortBalanceScore: 71,
          emotionalSyncScore: 63,
          partnerAwarenessScore: 32,
        },
        pairedDaysCount: 4,
        tier: 'Text Me Back',
      };
    case 'low_data':
      return {
        confidence: 'low' as const,
        metrics: {
          communicationScore: 22,
          compatibilityScore: 0,
          conflictRiskScore: 0,
          effortBalanceScore: 0,
          emotionalSyncScore: 0,
          partnerAwarenessScore: 0,
        },
        pairedDaysCount: 2,
        tier: 'Who Even Are You',
      };
  }
}

function calculateOverallReceiptScore(metrics: ReceiptMetricSet) {
  return Math.round(
    clamp(
      metrics.compatibilityScore * 0.25 +
        metrics.emotionalSyncScore * 0.2 +
        metrics.partnerAwarenessScore * 0.2 +
        metrics.communicationScore * 0.15 +
        (100 - metrics.conflictRiskScore) * 0.1 +
        metrics.effortBalanceScore * 0.1,
      0,
      100,
    ),
  );
}

function getWeeklyVibe({
  confidence,
  metrics,
  pairedDaysCount,
}: {
  confidence: ReceiptConfidence;
  metrics: ReceiptMetricSet;
  pairedDaysCount: number;
}) {
  if (confidence === 'low' || pairedDaysCount < 4) {
    return 'Tiny Sample, Big Potential';
  }

  if (metrics.conflictRiskScore >= 70) {
    return 'Locked In But Tired';
  }

  if (metrics.partnerAwarenessScore >= 85) {
    return 'Mind Readers, Basically';
  }

  if (metrics.effortBalanceScore < 55) {
    return 'One Carried The Group Project';
  }

  if (metrics.emotionalSyncScore >= 85 && metrics.compatibilityScore >= 80) {
    return 'Same Page Energy';
  }

  if (metrics.partnerAwarenessScore < 45) {
    return 'Cute, But Confused';
  }

  return 'Soft Chaos, Still Showing Up';
}

function getShortSummary({
  confidence,
  metrics,
  pairedDaysCount,
  title,
}: {
  confidence: ReceiptConfidence;
  metrics: ReceiptMetricSet;
  pairedDaysCount: number;
  title: string;
}) {
  if (confidence === 'low') {
    return `${pairedDaysCount} paired days is a teaser, not a verdict. Do more rituals to unlock the real read.`;
  }

  if (metrics.conflictRiskScore >= 70) {
    return `${title}: there was real care here, but stress kept trying to grab the aux.`;
  }

  if (metrics.effortBalanceScore < 55) {
    return `${title}: the connection showed up, but the effort was not evenly split.`;
  }

  return `${title}: this week had enough signal for a real relationship read.`;
}

function getFreeInsight({
  confidence,
  metrics,
  pairedDaysCount,
}: {
  confidence: ReceiptConfidence;
  metrics: ReceiptMetricSet;
  pairedDaysCount: number;
}) {
  if (confidence === 'low') {
    return `${pairedDaysCount}/7 paired days. The receipt is warming up.`;
  }

  if (metrics.emotionalSyncScore >= 80) {
    return 'You were more emotionally aligned than chaotic this week.';
  }

  if (metrics.partnerAwarenessScore >= 80) {
    return 'Someone was reading the room suspiciously well.';
  }

  if (metrics.communicationScore >= 75) {
    return 'You both kept the ritual alive after the reveal.';
  }

  return 'There was enough signal to expose a pattern, but the spicy details are locked.';
}

function getLockedInsightCards(confidence: ReceiptConfidence) {
  if (confidence === 'low') {
    return ['Green flag needs more data', 'Red flag needs more data', 'Who cares more needs more signal'];
  }

  return PRO_RECEIPT_SECTIONS.slice(0, 6);
}

function getProInsightCards({
  confidence,
  metrics,
  pairedDaysCount,
}: {
  confidence: ReceiptConfidence;
  metrics: ReceiptMetricSet;
  pairedDaysCount: number;
}) {
  if (confidence === 'low') {
    return [
      {
        body: 'Come back after at least 4 paired days. Tethra will not invent red flags from crumbs.',
        title: 'Not enough signal yet',
      },
    ];
  }

  return [
    {
      body:
        metrics.communicationScore >= 75
          ? 'Both of you kept showing up after the reveal, which is the strongest sign this ritual is mutual.'
          : 'The week needed more two-sided follow-through after the reveal.',
      title: 'Biggest Green Flag',
    },
    {
      body:
        metrics.conflictRiskScore >= 60
          ? 'Stress was the loudest pattern. The issue may not be care; it may be mismatched emotional bandwidth.'
          : 'No major red flag. The weak spot was more about consistency than chemistry.',
      title: 'Biggest Red Flag',
    },
    {
      body:
        metrics.partnerAwarenessScore >= 80
          ? `Partner awareness was strong across ${pairedDaysCount} paired days. You were catching each other’s vibe more often than missing it.`
          : 'Predictions missed enough to matter. Someone may be assuming instead of checking.',
      title: 'Who Misread Who',
    },
    {
      body:
        metrics.conflictRiskScore >= 55
          ? 'Biggest trigger: mismatched stress or energy. Try naming capacity before reading tone.'
          : 'Biggest trigger stayed low. Keep the ritual short so it does not become homework.',
      title: 'Biggest Trigger',
    },
    {
      body:
        metrics.effortBalanceScore < 55
          ? 'The week leaned one-sided. One person looked more emotionally active in the ritual.'
          : 'Care looked fairly balanced this week. No one was obviously doing all the emotional lifting.',
      title: 'Who Cares More',
    },
    {
      body:
        metrics.effortBalanceScore < 55
          ? 'One person carried more of the week. Balance the ritual before trying to rank up.'
          : 'Effort looked fairly mutual. Nobody fully carried the group project.',
      title: 'Who Carried The Week',
    },
    {
      body:
        metrics.partnerAwarenessScore >= 80
          ? 'Keep predicting before talking. It is turning into useful emotional signal.'
          : 'Ask one direct question before the reveal tomorrow. Less guessing, more signal.',
      title: 'What To Do Next',
    },
  ];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
