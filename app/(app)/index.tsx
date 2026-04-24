import * as React from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { InlineMessage, PrimaryButton, Screen, SurfaceCard, TextField } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useDailyLoop } from '@/context/daily-loop';
import { useRelationship } from '@/context/relationship';
import { DailyStatus } from '@/types/database';
import { colors, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, session, signOut } = useAuth();
  const { cancelInvite, couple, createInvite, isLoading, joinByCode, lastError, partnerProfile, refreshRelationship, relationshipState } =
    useRelationship();
  const { currentUserCheckIn, currentUserPrediction, error, localDay, refreshToday, streak, todayReveal, todayStatus } = useDailyLoop();
  const [joinCode, setJoinCode] = React.useState('');
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const normalizedJoinCode = joinCode.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const inviteExpiresAt = couple?.invite_expires_at ? new Date(couple.invite_expires_at) : null;
  const hasJoinCode = normalizedJoinCode.length === 6;

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

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{relationshipState === 'linked' ? 'PHASE 3A' : 'PHASE 2'}</Text>
          <Text style={styles.title}>{relationshipState === 'linked' ? "Today's ritual is ready." : 'Relationship linking is live.'}</Text>
          <Text style={styles.subtitle}>
            {relationshipState === 'linked'
              ? 'Check in, predict your partner, and unlock the reveal when both of you complete the day.'
              : 'Create an invite code or join your partner to unlock the daily couple loop.'}
          </Text>
        </View>

        <Pressable onPress={() => router.push('/(app)/settings')}>
          <Text style={styles.settingsLink}>Settings</Text>
        </Pressable>
      </View>

      <SurfaceCard accent="rose">
        <Text style={styles.cardTitle}>{profile?.display_name ?? 'Your profile'}</Text>
        <View style={styles.summaryGrid}>
          <SummaryChip label="Relationship state" value={relationshipState} />
          <SummaryChip label="Partner" value={partnerProfile?.display_name ?? profile?.partner_status ?? 'unlinked'} />
          <SummaryChip label="Identity" value={session?.user.email ?? session?.user.phone ?? 'Connected'} />
        </View>
      </SurfaceCard>

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
          <SurfaceCard accent="ink">
            <Text style={styles.stateTitle}>Daily couple loop</Text>
            <Text style={styles.stateBody}>Couple day {localDay ?? 'loading'} in {couple?.timezone ?? 'UTC'}</Text>

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

          <SurfaceCard accent="rose">
            <Text style={styles.cardTitle}>Partner signal</Text>
            <Text style={styles.partnerLight}>
              Linked with {partnerProfile?.display_name ?? 'your partner'}. Phase 3A keeps this focused on the daily ritual: no chat feed, no public
              surface, just the paired reveal.
            </Text>
            <PrimaryButton label="Refresh relationship" onPress={() => void refreshRelationship()} variant="secondary" />
          </SurfaceCard>
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
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
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
    fontSize: 22,
    fontWeight: '800',
  },
  stateBody: {
    color: colors.cardMutedOnDark,
    fontSize: 15,
    lineHeight: 22,
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
});
