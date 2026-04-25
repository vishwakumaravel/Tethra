import { useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BackButton, InlineMessage, PrimaryButton, Screen, SurfaceCard } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useRelationship } from '@/context/relationship';
import { colors, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, session, signOut } = useAuth();
  const { couple, endRelationship, isLoading, partnerProfile, relationshipState } = useRelationship();
  const [confirmBreakup, setConfirmBreakup] = React.useState(false);
  const [confirmDevReset, setConfirmDevReset] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleEndRelationship = async () => {
    if (!confirmBreakup) {
      setConfirmBreakup(true);
      setFeedback('Tap once more to confirm.');
      return;
    }

    const result = await endRelationship();
    setFeedback(result.message ?? null);
    setConfirmBreakup(false);
    setConfirmDevReset(false);

    if (result.ok) {
      router.replace('/(app)');
    }
  };

  const handleDevReset = async () => {
    if (!confirmDevReset) {
      setConfirmDevReset(true);
      setFeedback('Dev reset armed. Tap again to clear this couple flow.');
      return;
    }

    const result = await endRelationship();
    setFeedback(result.ok ? 'Dev couple flow reset.' : result.message ?? null);
    setConfirmBreakup(false);
    setConfirmDevReset(false);

    if (result.ok) {
      router.replace('/(app)');
    }
  };

  return (
    <Screen>
      <BackButton onPress={() => router.back()} />

      <View style={styles.hero}>
        <Text style={styles.emoji}>☕️</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Small controls. Big exits.</Text>
      </View>

      {feedback ? <InlineMessage tone={feedback.includes('confirm') || feedback.includes('armed') ? 'warning' : 'default'} text={feedback} /> : null}

      <SurfaceCard accent="rose">
        <Text style={styles.cardEmoji}>🧸</Text>
        <Text style={styles.cardTitle}>{profile?.display_name ?? 'Your account'}</Text>
        <Text style={styles.softLine}>{session?.user.email ?? session?.user.phone ?? 'Signed in'}</Text>
      </SurfaceCard>

      <SurfaceCard accent="rose">
        <Text style={styles.cardEmoji}>💞</Text>
        <Text style={styles.cardTitle}>{relationshipState === 'linked' ? `Linked with ${partnerProfile?.display_name ?? 'your partner'}` : 'Not linked'}</Text>
        <Text style={styles.softLine}>{couple?.timezone ?? 'No shared timezone yet'}</Text>
      </SurfaceCard>

      {relationshipState === 'linked' ? (
        <SurfaceCard accent="ink">
          <Text style={styles.breakupEmoji}>💔</Text>
          <Text style={styles.stateTitle}>Break up?</Text>
          <Text style={styles.stateBody}>
            This unlinks both accounts and clears this couple’s ritual data. Subscriptions stay managed by Apple or Google.
          </Text>
          <PrimaryButton
            label={confirmBreakup ? 'Yes, unlink us' : 'Exit relationship'}
            onPress={handleEndRelationship}
            loading={isLoading}
            variant={confirmBreakup ? 'primary' : 'secondary'}
          />
        </SurfaceCard>
      ) : null}

      {__DEV__ ? (
        <SurfaceCard accent="rose">
          <Text style={styles.cardEmoji}>🛠️</Text>
          <Text style={styles.cardTitle}>Dev reset</Text>
          <Text style={styles.softLine}>Clears the current couple flow for repeat testing.</Text>
          <PrimaryButton
            label={confirmDevReset ? 'Confirm dev reset' : 'Reset couple flow'}
            onPress={handleDevReset}
            loading={isLoading}
            variant="secondary"
          />
        </SurfaceCard>
      ) : null}

      <SurfaceCard accent="rose">
        <Text style={styles.cardEmoji}>⭐️</Text>
        <Text style={styles.cardTitle}>Pro later</Text>
        <Text style={styles.softLine}>If one partner upgrades, both linked partners should unlock Pro while linked.</Text>
      </SurfaceCard>

      <PrimaryButton label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  emoji: {
    fontSize: 46,
  },
  title: {
    color: colors.text,
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 44,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  cardEmoji: {
    fontSize: 34,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 30,
  },
  softLine: {
    color: colors.muted,
    fontSize: 17,
    fontWeight: '700',
    lineHeight: 24,
  },
  breakupEmoji: {
    fontSize: 54,
  },
  stateTitle: {
    color: colors.cardTextOnDark,
    fontSize: 32,
    fontWeight: '900',
  },
  stateBody: {
    color: colors.cardMutedOnDark,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
  },
  row: {
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
});
