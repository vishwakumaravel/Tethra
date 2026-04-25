import * as React from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { InlineMessage, PrimaryButton, Screen, SurfaceCard, TextField } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useDailyLoop } from '@/context/daily-loop';
import { useRelationship } from '@/context/relationship';
import { getNextTierProgress, getTierProgressionNote } from '@/logic/tiers';
import { DailyStatus } from '@/types/database';
import { colors, spacing } from '@/theme/tokens';

type HomeTab = 'activity' | 'rank' | 'ritual';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, session, signOut } = useAuth();
  const { cancelInvite, couple, createInvite, isLoading, joinByCode, lastError, partnerProfile, refreshRelationship, relationshipState } =
    useRelationship();
  const {
    currentTier,
    currentUserCheckIn,
    currentUserPrediction,
    error,
    localDay,
    pairedDaysCount,
    partnerActivity,
    refreshToday,
    relationshipScore,
    streak,
    todayReveal,
    todayStatus,
    xp,
  } = useDailyLoop();
  const [joinCode, setJoinCode] = React.useState('');
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [selectedTab, setSelectedTab] = React.useState<HomeTab>('ritual');

  const normalizedJoinCode = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const inviteExpiresAt = couple?.invite_expires_at ? new Date(couple.invite_expires_at) : null;
  const hasJoinCode = normalizedJoinCode.length === 6;
  const tierProgress = getNextTierProgress(relationshipScore);
  const tierProgressionNote = getTierProgressionNote(pairedDaysCount);

  const handleCreateInvite = async (regenerate = false) => {
    const result = await createInvite({ regenerate });
    setFeedback(result.message ?? null);
  };

  const handleJoinByCode = async () => {
    const result = await joinByCode(normalizedJoinCode);
    setFeedback(result.message ?? null);

    if (result.ok) {
      setJoinCode('');
    }
  };

  const handleCancelInvite = async () => {
    const result = await cancelInvite();
    setFeedback(result.message ?? null);
  };

  const handleShareInvite = async () => {
    if (!couple?.invite_code) {
      return;
    }

    await Share.share({
      message: `Join me on Tethra with invite code ${couple.invite_code}.`,
    });
  };

  const handleShareRank = async () => {
    const nextLine = tierProgress.nextTier ? `${tierProgress.pointsToNext} points from ${tierProgress.nextTier}.` : 'Top tier unlocked.';

    await Share.share({
      message: `We are ${currentTier} on Tethra 🏹\nScore: ${Math.round(relationshipScore)}/100 · ${pairedDaysCount} paired day${
        pairedDaysCount === 1 ? '' : 's'
      }\n${nextLine}`,
      title: 'Share Tethra rank',
    });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{relationshipState === 'linked' ? 'TODAY' : 'LINK UP'}</Text>
          <Text style={styles.title}>{relationshipState === 'linked' ? 'Your ritual is ready.' : 'Start your shared space.'}</Text>
          <Text style={styles.subtitle}>
            {relationshipState === 'linked'
              ? 'Check in. Predict. Reveal.'
              : 'One invite code. Two people.'}
          </Text>
        </View>

        <Pressable onPress={() => router.push('/(app)/settings')}>
          <Text style={styles.settingsLink}>Settings</Text>
        </Pressable>
      </View>

      {relationshipState !== 'linked' ? (
        <SurfaceCard accent="rose">
          <Text style={styles.cardTitle}>{profile?.display_name ?? 'Your profile'}</Text>
          <View style={styles.summaryGrid}>
            <SummaryChip label="Relationship state" value={relationshipState} />
            <SummaryChip label="Partner" value={partnerProfile?.display_name ?? profile?.partner_status ?? 'unlinked'} />
            <SummaryChip label="Identity" value={session?.user.email ?? session?.user.phone ?? 'Connected'} />
          </View>
        </SurfaceCard>
      ) : null}

      {feedback ? <InlineMessage tone="default" text={feedback} /> : null}
      {lastError ? <InlineMessage tone="warning" text={lastError.message} /> : null}
      {error ? <InlineMessage tone="warning" text={error} /> : null}

      {relationshipState === 'unlinked' ? (
        <SurfaceCard accent="ink">
          <Text style={styles.stateTitle}>Start the link flow</Text>
          <Text style={styles.stateBody}>
            Create a fresh invite for your partner or enter a code they sent you. Invite codes are 6 characters and expire after 24 hours.
          </Text>

          <PrimaryButton label="Create invite code" onPress={() => void handleCreateInvite(false)} loading={isLoading} />

          <View style={styles.dividerWrap}>
            <View style={styles.divider} />
            <Text style={styles.dividerLabel}>or join with a code</Text>
            <View style={styles.divider} />
          </View>

          <TextField
            label="Partner invite code"
            value={normalizedJoinCode}
            onChangeText={setJoinCode}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            placeholder="ABC123"
            caption="Use the exact 6-character code your partner sees on their device."
          />

          <PrimaryButton label="Join partner" onPress={handleJoinByCode} disabled={!hasJoinCode || isLoading} variant="secondary" />
        </SurfaceCard>
      ) : null}

      {relationshipState === 'invite_sent' ? (
        <SurfaceCard accent="ink">
          <Text style={styles.stateTitle}>Invite sent</Text>
          <Text style={styles.stateBody}>Your code is live. Share it with your partner, then keep this screen handy while they join.</Text>

          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Active code</Text>
            <Text style={styles.codeValue}>{couple?.invite_code ?? '------'}</Text>
            <Text style={styles.codeMeta}>
              Expires {inviteExpiresAt ? inviteExpiresAt.toLocaleString() : 'soon'} in {couple?.timezone ?? 'UTC'}
            </Text>
          </View>

          <PrimaryButton label="Share code" onPress={() => void handleShareInvite()} />
          <PrimaryButton label="Regenerate code" onPress={() => void handleCreateInvite(true)} loading={isLoading} variant="secondary" />
          <PrimaryButton label="Cancel invite" onPress={() => void handleCancelInvite()} disabled={isLoading} variant="secondary" />
        </SurfaceCard>
      ) : null}

      {relationshipState === 'linked' ? (
        <>
          <View style={styles.tabBar}>
            <HomeTabButton label="Ritual" selected={selectedTab === 'ritual'} onPress={() => setSelectedTab('ritual')} />
            <HomeTabButton label="Rank" selected={selectedTab === 'rank'} onPress={() => setSelectedTab('rank')} />
            <HomeTabButton label="Activity" selected={selectedTab === 'activity'} onPress={() => setSelectedTab('activity')} />
          </View>

          {selectedTab === 'ritual' ? (
            <SurfaceCard accent="ink">
              <Text style={styles.bigEmoji}>🕯️</Text>
              <Text style={styles.stateTitle}>Today’s read</Text>
              <Text style={styles.stateBody}>{localDay ?? 'Loading'} · {couple?.timezone ?? 'UTC'}</Text>

              <View style={styles.darkGrid}>
                <DarkMetric label="Current streak" value={`${streak.current}`} />
                <DarkMetric label="Longest streak" value={`${streak.longest}`} />
                <DarkMetric label="Today" value={statusLabel(todayStatus)} />
              </View>

              <View style={styles.partnerCard}>
                <Text style={styles.partnerLabel}>Progress</Text>
                <Text style={styles.partnerMeta}>
                  Check-in {currentUserCheckIn ? 'done' : 'open'} | Prediction {currentUserPrediction ? 'done' : 'open'} | Reveal{' '}
                  {todayReveal ? 'unlocked' : 'locked'}
                </Text>
              </View>

              <DailyAction status={todayStatus} onRefresh={() => void refreshToday()} />
            </SurfaceCard>
          ) : null}

          {selectedTab === 'rank' ? (
            <SurfaceCard accent="ink">
              <Text style={styles.bigEmoji}>🏹</Text>
              <Text style={styles.stateTitle}>Your rank</Text>
              <Text style={styles.stateBody}>Earned slowly. Shared together.</Text>

              <View style={styles.tierCard}>
                <Text style={styles.partnerLabel}>Current tier</Text>
                <Text style={styles.tierValue}>{currentTier}</Text>
                <Text style={styles.partnerMeta}>
                  Score {Math.round(relationshipScore)}/100 | {xp} XP | {pairedDaysCount} paired day{pairedDaysCount === 1 ? '' : 's'}
                </Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${tierProgress.percent}%` }]} />
                </View>
                <Text style={styles.partnerMeta}>
                  {tierProgress.nextTier
                    ? `${tierProgress.pointsToNext} points to ${tierProgress.nextTier}`
                    : 'Top tier reached. Extremely suspicious, in a good way.'}
                </Text>
              </View>

              <PrimaryButton label="Share rank" onPress={() => void handleShareRank()} />

              <View style={styles.partnerCard}>
                <Text style={styles.partnerLabel}>Slow on purpose</Text>
                <Text style={styles.partnerMeta}>{tierProgressionNote}</Text>
              </View>

              <View style={styles.partnerCard}>
                <Text style={styles.partnerLabel}>Coming later</Text>
                <Text style={styles.partnerMeta}>
                  Couple percentile, rank explanation, and richer history can become Pro depth.
                </Text>
              </View>
            </SurfaceCard>
          ) : null}

          {selectedTab === 'activity' ? (
            <SurfaceCard accent="rose">
              <Text style={styles.cardTitle}>Partner activity</Text>
              {partnerActivity.length > 0 ? (
                <View style={styles.activityList}>
                  {partnerActivity.map((activity) => (
                    <View key={activity.label} style={styles.activityItem}>
                      <Text style={styles.activityLabel}>{activity.label}</Text>
                      <Text style={styles.activityDetail}>{activity.detail}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.partnerLight}>
                  Linked with {partnerProfile?.display_name ?? 'your partner'}. Their check-in, prediction, and reveal reactions will show up here.
                </Text>
              )}
              <PrimaryButton label="Refresh relationship" onPress={() => void refreshRelationship()} variant="secondary" />
            </SurfaceCard>
          ) : null}
        </>
      ) : null}

      {relationshipState === 'link_error' ? (
        <SurfaceCard accent="ink">
          <Text style={styles.stateTitle}>Your last link action needs attention</Text>
          <Text style={styles.stateBody}>You can recover from this state without touching the database manually.</Text>

          {couple?.status === 'pending' ? (
            <>
              <PrimaryButton label="Regenerate invite" onPress={() => void handleCreateInvite(true)} loading={isLoading} />
              <PrimaryButton label="Cancel stale invite" onPress={() => void handleCancelInvite()} disabled={isLoading} variant="secondary" />
            </>
          ) : (
            <>
              <TextField
                label="Retry with a new code"
                value={normalizedJoinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                placeholder="ABC123"
              />
              <PrimaryButton label="Try code again" onPress={handleJoinByCode} disabled={!hasJoinCode || isLoading} />
              <PrimaryButton label="Create a new invite instead" onPress={() => void handleCreateInvite(false)} disabled={isLoading} variant="secondary" />
            </>
          )}
        </SurfaceCard>
      ) : null}

      <PrimaryButton label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

function DailyAction({ onRefresh, status }: { onRefresh: () => void; status: DailyStatus }) {
  const router = useRouter();

  if (status === 'needs_check_in') {
    return <PrimaryButton label="Start check-in" onPress={() => router.push('/(app)/check-in')} />;
  }

  if (status === 'needs_prediction') {
    return <PrimaryButton label="Predict partner" onPress={() => router.push('/(app)/prediction')} />;
  }

  if (status === 'reveal_ready') {
    return <PrimaryButton label="Open reveal" onPress={() => router.push('/(app)/reveal')} />;
  }

  if (status === 'complete') {
    return <PrimaryButton label="View reveal again" onPress={() => router.push('/(app)/reveal')} variant="secondary" />;
  }

  return <PrimaryButton label="Waiting for partner. Refresh" onPress={onRefresh} variant="secondary" />;
}

function HomeTabButton({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.tabButton, selected ? styles.tabButtonSelected : null]}>
      <Text style={[styles.tabButtonLabel, selected ? styles.tabButtonLabelSelected : null]}>{label}</Text>
    </Pressable>
  );
}

function SummaryChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryChip}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function DarkMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.darkMetric}>
      <Text style={styles.partnerLabel}>{label}</Text>
      <Text style={styles.darkMetricValue}>{value}</Text>
    </View>
  );
}

function statusLabel(status: DailyStatus) {
  switch (status) {
    case 'needs_check_in':
      return 'Check in';
    case 'needs_prediction':
      return 'Predict';
    case 'waiting_for_partner':
      return 'Waiting';
    case 'reveal_ready':
      return 'Reveal';
    case 'complete':
      return 'Complete';
  }
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerCopy: {
    gap: spacing.sm,
  },
  kicker: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.4,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 43,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  settingsLink: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  tabBar: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 16,
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  tabButtonSelected: {
    backgroundColor: colors.ink,
  },
  tabButtonLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '800',
  },
  tabButtonLabelSelected: {
    color: colors.cardTextOnDark,
  },
  summaryGrid: {
    gap: spacing.sm,
  },
  summaryChip: {
    backgroundColor: colors.chip,
    borderRadius: 22,
    padding: spacing.md,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  stateTitle: {
    color: colors.cardTextOnDark,
    fontSize: 34,
    fontWeight: '900',
  },
  stateBody: {
    color: colors.cardMutedOnDark,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  bigEmoji: {
    fontSize: 54,
  },
  dividerWrap: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  divider: {
    backgroundColor: colors.cardMutedOnDark,
    flex: 1,
    height: StyleSheet.hairlineWidth,
    opacity: 0.35,
  },
  dividerLabel: {
    color: colors.cardMutedOnDark,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  codeCard: {
    backgroundColor: colors.darkOverlay,
    borderRadius: 22,
    padding: spacing.lg,
  },
  codeLabel: {
    color: colors.cardMutedOnDark,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  codeValue: {
    color: colors.highlight,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 6,
    marginBottom: spacing.sm,
  },
  codeMeta: {
    color: colors.cardMutedOnDark,
    fontSize: 13,
    lineHeight: 20,
  },
  darkGrid: {
    gap: spacing.sm,
  },
  darkMetric: {
    backgroundColor: colors.darkOverlay,
    borderRadius: 22,
    padding: spacing.md,
  },
  darkMetricValue: {
    color: colors.highlight,
    fontSize: 28,
    fontWeight: '900',
  },
  partnerCard: {
    backgroundColor: colors.darkOverlay,
    borderRadius: 22,
    padding: spacing.md,
  },
  tierCard: {
    backgroundColor: colors.darkOverlay,
    borderRadius: 22,
    gap: spacing.xs,
    padding: spacing.md,
  },
  tierValue: {
    color: colors.highlight,
    fontSize: 30,
    fontWeight: '900',
  },
  progressTrack: {
    backgroundColor: 'rgba(255, 248, 245, 0.16)',
    borderRadius: 999,
    height: 10,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.highlight,
    borderRadius: 999,
    height: '100%',
  },
  partnerLabel: {
    color: colors.cardMutedOnDark,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  partnerMeta: {
    color: colors.cardMutedOnDark,
    fontSize: 14,
    lineHeight: 21,
  },
  partnerLight: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  activityList: {
    gap: spacing.sm,
  },
  activityItem: {
    backgroundColor: colors.chip,
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.md,
  },
  activityLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  activityDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
});
