import { zodResolver } from '@hookform/resolvers/zod';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InlineMessage, PrimaryButton, Screen, SurfaceCard, TextField } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { colors, spacing } from '@/theme/tokens';
import { ProfileFormValues, profileSchema } from '@/validation/forms';

export default function ProfileOnboardingScreen() {
  const { isBusy, profile, saveProfile, session, signOut } = useAuth();
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile?.display_name ?? '',
      avatarUrl: profile?.avatar_url ?? '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const result = await saveProfile(values);
    setFeedback(result.message ?? null);
  });

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.title}>Before you link up, let’s shape your profile.</Text>
        <Text style={styles.subtitle}>
          This is the last gate in Phase 1. Once your profile is saved, you’ll land in the signed-in home with the couple invite stub ready for Phase 2.
        </Text>
      </View>

      <SurfaceCard accent="rose">
        <Controller
          control={control}
          name="displayName"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextField
              label="Display name"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              autoCapitalize="words"
              error={errors.displayName?.message}
              placeholder="What should your partner see?"
            />
          )}
        />

        <Controller
          control={control}
          name="avatarUrl"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextField
              label="Avatar URL (optional)"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType="url"
              error={errors.avatarUrl?.message}
              placeholder="https://..."
            />
          )}
        />

        <View style={styles.identityRow}>
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>Email</Text>
            <Text style={styles.identityValue}>{session?.user.email ?? 'Not connected'}</Text>
          </View>
          <View style={styles.identityCard}>
            <Text style={styles.identityLabel}>Phone</Text>
            <Text style={styles.identityValue}>{session?.user.phone ?? 'Not connected'}</Text>
          </View>
        </View>

        {feedback ? <InlineMessage tone="default" text={feedback} /> : null}

        <PrimaryButton label="Save profile" onPress={onSubmit} loading={isBusy} />
      </SurfaceCard>

      <SurfaceCard accent="ink">
        <Text style={styles.nextTitle}>Coming next</Text>
        <Text style={styles.nextBody}>
          Couple codes, daily check-ins, streak logic, and receipts will hang off this profile foundation in the next phase.
        </Text>
        <Pressable onPress={() => void signOut()} style={styles.signOutLink}>
          <Text style={styles.signOutLabel}>Signed into the wrong account? Sign out.</Text>
        </Pressable>
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  identityRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  identityCard: {
    backgroundColor: colors.chip,
    borderRadius: 22,
    flex: 1,
    padding: spacing.md,
  },
  identityLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  identityValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  nextTitle: {
    color: colors.cardTextOnDark,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  nextBody: {
    color: colors.cardMutedOnDark,
    fontSize: 15,
    lineHeight: 22,
  },
  signOutLink: {
    marginTop: spacing.md,
  },
  signOutLabel: {
    color: colors.highlight,
    fontSize: 14,
    fontWeight: '700',
  },
});
