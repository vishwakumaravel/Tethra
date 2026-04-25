import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, InlineMessage, PrimaryButton, Screen, SurfaceCard, TextField } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { colors, spacing } from '@/theme/tokens';
import { EmailAuthFormValues, emailAuthSchema } from '@/validation/forms';

export default function EmailAuthScreen() {
  const router = useRouter();
  const { isBusy, signInWithEmail, signUpWithEmail } = useAuth();
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EmailAuthFormValues>({
    resolver: zodResolver(emailAuthSchema),
    defaultValues: {
      mode: 'sign-in',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const mode = watch('mode');

  const onSubmit = handleSubmit(async (values) => {
    const result =
      values.mode === 'sign-up' ? await signUpWithEmail(values.email, values.password) : await signInWithEmail(values.email, values.password);
    setFeedback(result.message ?? null);
  });

  const switchMode = (nextMode: EmailAuthFormValues['mode']) => {
    setFeedback(null);
    setValue('mode', nextMode, { shouldDirty: true });
  };

  return (
    <Screen>
      <BackButton onPress={() => router.back()} />

      <View style={styles.hero}>
        <Text style={styles.title}>{mode === 'sign-up' ? 'Create your Tethra account' : 'Welcome back'}</Text>
        <Text style={styles.subtitle}>
          {mode === 'sign-up'
            ? 'Use email and password now. If email confirmation is on in Supabase, you’ll confirm before you continue.'
            : 'Sign in to restore your session and head straight into profile setup or the signed-in home.'}
        </Text>
      </View>

      <SurfaceCard accent="rose">
        <View style={styles.modeRow}>
          <Pressable onPress={() => switchMode('sign-in')} style={[styles.modeChip, mode === 'sign-in' && styles.modeChipActive]}>
            <Text style={[styles.modeLabel, mode === 'sign-in' && styles.modeLabelActive]}>Sign in</Text>
          </Pressable>
          <Pressable onPress={() => switchMode('sign-up')} style={[styles.modeChip, mode === 'sign-up' && styles.modeChipActive]}>
            <Text style={[styles.modeLabel, mode === 'sign-up' && styles.modeLabelActive]}>Create account</Text>
          </Pressable>
        </View>

        <Controller
          control={control}
          name="email"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextField
              label="Email"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              autoCapitalize="none"
              keyboardType="email-address"
              error={errors.email?.message}
              placeholder="you@example.com"
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onBlur, onChange, value } }) => (
            <TextField
              label="Password"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              secureTextEntry
              autoCapitalize="none"
              error={errors.password?.message}
              placeholder="At least 8 characters"
            />
          )}
        />

        {mode === 'sign-up' ? (
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onBlur, onChange, value } }) => (
              <TextField
                label="Confirm password"
                value={value}
                onBlur={onBlur}
                onChangeText={onChange}
                secureTextEntry
                autoCapitalize="none"
                error={errors.confirmPassword?.message}
                placeholder="Repeat your password"
              />
            )}
          />
        ) : null}

        {feedback ? <InlineMessage tone="default" text={feedback} /> : null}

        <PrimaryButton
          label={mode === 'sign-up' ? 'Create account' : 'Sign in'}
          onPress={onSubmit}
          loading={isBusy}
        />
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
  modeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  modeChip: {
    backgroundColor: colors.chip,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modeChipActive: {
    backgroundColor: colors.primary,
  },
  modeLabel: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: '700',
  },
  modeLabelActive: {
    color: colors.cardTextOnDark,
  },
});
