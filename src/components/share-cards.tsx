import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getScoreLabel } from '@/logic/receiptScores';
import { BrandedReceipt } from '@/logic/receiptProduct';
import { getNextTierProgress } from '@/logic/tiers';
import { colors, spacing } from '@/theme/tokens';
import { WeeklyReceipt } from '@/types/database';

type IconShareButtonProps = {
  disabled?: boolean;
  label: string;
  onPress: () => void;
};

type RankShareCardProps = {
  currentTier: string;
  pairedDaysCount: number;
  relationshipScore: number;
  xp: number;
  onShare: () => void;
};

type ReceiptShareCardProps = {
  brandedReceipt: BrandedReceipt;
  onShare: () => void;
  receipt: WeeklyReceipt;
};

export function IconShareButton({ disabled, label, onPress }: IconShareButtonProps) {
  return (
    <Pressable
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, disabled ? styles.iconButtonDisabled : null, pressed && !disabled ? styles.pressed : null]}
    >
      <Text style={styles.iconButtonText}>↗</Text>
    </Pressable>
  );
}

export const RankShareCard = React.forwardRef<View, RankShareCardProps>(function RankShareCard(
  { currentTier, onShare, pairedDaysCount, relationshipScore, xp },
  ref,
) {
  const tierProgress = getNextTierProgress(relationshipScore);

  return (
    <View ref={ref} collapsable={false} style={styles.shareCard}>
      <View style={styles.shareCardTop}>
        <View>
          <Text style={styles.eyebrow}>TETHRA RANK</Text>
          <Text style={styles.heroEmoji}>🏹</Text>
        </View>
        <IconShareButton label="Share rank" onPress={onShare} />
      </View>

      <Text style={styles.heroTitle}>{currentTier}</Text>
      <Text style={styles.heroMeta}>
        {Math.round(relationshipScore)}/100 · {pairedDaysCount} paired day{pairedDaysCount === 1 ? '' : 's'} · {xp} XP
      </Text>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${tierProgress.percent}%` }]} />
      </View>

      <Text style={styles.heroCaption}>
        {tierProgress.nextTier ? `${tierProgress.pointsToNext} pts to ${tierProgress.nextTier}` : 'Top tier. Suspiciously locked in.'}
      </Text>
    </View>
  );
});

export const ReceiptShareCard = React.forwardRef<View, ReceiptShareCardProps>(function ReceiptShareCard(
  { brandedReceipt, onShare, receipt },
  ref,
) {
  const isLowData = receipt.confidence_label === 'low';

  return (
    <View ref={ref} collapsable={false} style={styles.shareCard}>
      <View style={styles.shareCardTop}>
        <View>
          <Text style={styles.eyebrow}>{isLowData ? 'TINY RECEIPT' : 'WEEKLY RECEIPT'}</Text>
          <Text style={styles.heroEmoji}>{isLowData ? '🥄' : '🧾'}</Text>
        </View>
        <IconShareButton label="Share receipt" onPress={onShare} />
      </View>

      <Text style={styles.heroTitle}>{brandedReceipt.title}</Text>
      <Text style={styles.heroMeta}>{brandedReceipt.shareCardSubtitle}</Text>

      <View style={styles.receiptScoreGrid}>
        <MiniScore label="Fit" value={receipt.compatibility_score} />
        <MiniScore label="Aware" value={brandedReceipt.overallScore} />
        <MiniScore label="Sync" value={receipt.emotional_alignment_score} />
      </View>

      <Text style={styles.heroCaption}>{receipt.confidence_label} signal · {receipt.paired_days_count}/7 paired days</Text>
    </View>
  );
});

function MiniScore({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.miniScore}>
      <Text style={styles.miniScoreValue}>{value}%</Text>
      <Text style={styles.miniScoreLabel}>{label}</Text>
      <Text style={styles.miniScoreMeta}>{getScoreLabel(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shareCard: {
    backgroundColor: colors.darkOverlay,
    borderColor: 'rgba(255, 248, 245, 0.14)',
    borderRadius: 26,
    borderWidth: 1,
    gap: spacing.sm,
    overflow: 'hidden',
    padding: spacing.md,
  },
  shareCardTop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: colors.cardMutedOnDark,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  heroEmoji: {
    fontSize: 42,
    marginTop: spacing.xs,
  },
  heroTitle: {
    color: colors.highlight,
    fontSize: 35,
    fontWeight: '900',
    lineHeight: 39,
  },
  heroMeta: {
    color: colors.cardTextOnDark,
    fontSize: 15,
    fontWeight: '800',
  },
  heroCaption: {
    color: colors.cardMutedOnDark,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.cardTextOnDark,
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  iconButtonDisabled: {
    opacity: 0.5,
  },
  iconButtonText: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
    marginTop: -2,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  progressTrack: {
    backgroundColor: 'rgba(255, 248, 245, 0.16)',
    borderRadius: 999,
    height: 12,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.highlight,
    borderRadius: 999,
    height: '100%',
  },
  receiptScoreGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  miniScore: {
    backgroundColor: 'rgba(255, 248, 245, 0.1)',
    borderRadius: 18,
    flex: 1,
    padding: spacing.sm,
  },
  miniScoreValue: {
    color: colors.highlight,
    fontSize: 23,
    fontWeight: '900',
  },
  miniScoreLabel: {
    color: colors.cardTextOnDark,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  miniScoreMeta: {
    color: colors.cardMutedOnDark,
    fontSize: 11,
    fontWeight: '800',
  },
});
