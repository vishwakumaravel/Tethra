import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen, SurfaceCard } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { colors, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();
  const { profile, session, signOut } = useAuth();

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>PHASE 1</Text>
          <Text style={styles.title}>Your auth foundation is live.</Text>
          <Text style={styles.subtitle}>
            This is the signed-in shell where couple invites, daily check-ins, streaks, and receipts will plug in next.
          </Text>
        </View>

        <Pressable onPress={() => router.push('/(app)/settings')}>
          <Text style={styles.settingsLink}>Settings</Text>
        </Pressable>
      </View>

      <SurfaceCard accent="rose">
        <Text style={styles.cardTitle}>Profile summary</Text>
        <Text style={styles.profileName}>{profile?.display_name ?? 'Unnamed profile'}</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Partner status</Text>
            <Text style={styles.summaryValue}>{profile?.partner_status ?? 'unlinked'}</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Email</Text>
            <Text style={styles.summaryValue}>{session?.user.email ?? 'Not connected'}</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryLabel}>Phone</Text>
            <Text style={styles.summaryValue}>{session?.user.phone ?? 'Not connected'}</Text>
          </View>
        </View>
      </SurfaceCard>

      <SurfaceCard accent="ink">
        <Text style={styles.nextTitle}>Couple linking lands next</Text>
        <View style={styles.stubCard}>
          <Text style={styles.stubTitle}>Create invite code</Text>
          <Text style={styles.stubBody}>Phase 2 will generate a code here and bind it to the `couples` placeholder table.</Text>
        </View>
        <View style={styles.stubCard}>
          <Text style={styles.stubTitle}>Enter partner code</Text>
          <Text style={styles.stubBody}>This shell is ready for the join flow, but the mutation path is intentionally deferred.</Text>
        </View>
      </SurfaceCard>

      <PrimaryButton label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
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
  profileName: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: spacing.md,
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
  nextTitle: {
    color: colors.cardTextOnDark,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  stubCard: {
    backgroundColor: colors.darkOverlay,
    borderRadius: 22,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  stubTitle: {
    color: colors.cardTextOnDark,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  stubBody: {
    color: colors.cardMutedOnDark,
    fontSize: 14,
    lineHeight: 21,
  },
});
