import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { InlineMessage, PrimaryButton, Screen, SurfaceCard, TextField } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { colors, spacing } from '@/theme/tokens';
import { PhoneCodeValues, PhoneRequestValues, phoneCodeSchema, phoneRequestSchema } from '@/validation/forms';

export default function PhoneAuthScreen() {
  const router = useRouter();
  const { isBusy, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const [pendingPhone, setPendingPhone] = React.useState<string | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [cooldown, setCooldown] = React.useState(0);

  const phoneForm = useForm<PhoneRequestValues>({
    resolver: zodResolver(phoneRequestSchema),
    defaultValues: { phone: '' },
  });

  const codeForm = useForm<PhoneCodeValues>({
    resolver: zodResolver(phoneCodeSchema),
    defaultValues: { token: '' },
  });

  React.useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [cooldown]);

  const requestOtp = phoneForm.handleSubmit(async ({ phone }) => {
    const result = await sendPhoneOtp(phone);
    if (result.ok && result.normalizedPhone) {
      setPendingPhone(result.normalizedPhone);
      setCooldown(30);
    }
    setFeedback(result.message ?? null);
  });

  const verifyCode = codeForm.handleSubmit(async ({ token }) => {
    if (!pendingPhone) {
      return;
    }

    const result = await verifyPhoneOtp(pendingPhone, token);
    setFeedback(result.message ?? null);
  });

  const resendCode = async () => {
    if (!pendingPhone || cooldown > 0) {
      return;
    }

    const result = await sendPhoneOtp(pendingPhone);
    setCooldown(result.ok ? 30 : 0);
    setFeedback(result.message ?? null);
  };

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.title}>Phone-first mobile sign in</Text>
        <Text style={styles.subtitle}>
          Enter a mobile number with country code. We’ll send a one-time code, then restore your Tethra session on every launch.
        </Text>
      </View>

      <SurfaceCard accent="rose">
        {!pendingPhone ? (
          <>
            <Controller
              control={phoneForm.control}
              name="phone"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  label="Phone number"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  keyboardType="phone-pad"
                  placeholder="+1 555 867 5309"
                  error={phoneForm.formState.errors.phone?.message}
                  caption="If you leave off the plus sign, Tethra will still normalize the number before sending."
                />
              )}
            />

            {feedback ? <InlineMessage tone="default" text={feedback} /> : null}

            <PrimaryButton label="Send code" onPress={requestOtp} loading={isBusy} />
          </>
        ) : (
          <>
            <Text style={styles.sentLabel}>Code sent to {pendingPhone}</Text>
            <Controller
              control={codeForm.control}
              name="token"
              render={({ field: { onBlur, onChange, value } }) => (
                <TextField
                  label="Verification code"
                  value={value}
                  onBlur={onBlur}
                  onChangeText={onChange}
                  keyboardType="number-pad"
                  placeholder="123456"
                  error={codeForm.formState.errors.token?.message}
                />
              )}
            />

            {feedback ? <InlineMessage tone="default" text={feedback} /> : null}

            <PrimaryButton label="Verify code" onPress={verifyCode} loading={isBusy} />
            <PrimaryButton
              label={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
              onPress={resendCode}
              disabled={cooldown > 0 || isBusy}
              variant="secondary"
            />
            <Pressable
              onPress={() => {
                setPendingPhone(null);
                setFeedback(null);
                setCooldown(0);
              }}
              style={styles.secondaryAction}
            >
              <Text style={styles.secondaryActionLabel}>Use a different number</Text>
            </Pressable>
          </>
        )}
      </SurfaceCard>
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
  sentLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  secondaryAction: {
    alignSelf: 'center',
    marginTop: spacing.xs,
  },
  secondaryActionLabel: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
