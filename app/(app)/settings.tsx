import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton, Screen, SurfaceCard } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useRelationship } from '@/context/relationship';
import { colors, spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, session, signOut } = useAuth();
  const { couple, relationshipState } = useRelationship();

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>A light Phase 1 settings surface for account visibility and safe sign-out.</Text>
      </View>

      <SurfaceCard accent="rose">
        <View style={styles.row}>
          <Text style={styles.label}>Display name</Text>
          <Text style={styles.value}>{profile?.display_name ?? 'Incomplete'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{session?.user.email ?? 'Not connected'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Phone</Text>
          <Text style={styles.value}>{session?.user.phone ?? 'Not connected'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Relationship state</Text>
          <Text style={styles.value}>{relationshipState}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Shared timezone</Text>
          <Text style={styles.value}>{couple?.timezone ?? 'Not linked yet'}</Text>
        </View>
      </SurfaceCard>

      <PrimaryButton label="Sign out" variant="secondary" onPress={() => void signOut()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: spacing.lg,
  },
  backLabel: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
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
  row: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
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
