import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import * as React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { InlineMessage, PrimaryButton, Screen, SurfaceCard } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { colors, spacing } from '@/theme/tokens';

export default function AuthChooserScreen() {
  const router = useRouter();
  const { isBusy, isConfigured, signInWithApple } = useAuth();
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleApplePress = async () => {
    const result = await signInWithApple();
    if (result.message) {
      setFeedback(result.message);
    }
  };

  return (
    <Screen scroll={false}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>TETHRA</Text>
        <Text style={styles.title}>Daily check-ins start with one shared login rhythm.</Text>
        <Text style={styles.subtitle}>
          Pick the sign-in flow that fits you now. Couple linking, streaks, and receipts come right after
          this foundation.
        </Text>
      </View>

      {!isConfigured ? (
        <InlineMessage tone="warning" text="Add your Supabase URL and anon key in .env before testing auth." />
      ) : null}

      {feedback ? <InlineMessage tone="default" text={feedback} /> : null}

      <SurfaceCard accent="rose">
        <Text style={styles.cardTitle}>Continue your way</Text>
        <Text style={styles.cardBody}>Phone OTP for fast mobile access, email for classic sign-in, Apple for iOS.</Text>

        {Platform.OS === 'ios' ? (
          <View style={styles.appleWrap}>
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
              cornerRadius={18}
              onPress={handleApplePress}
              style={styles.appleButton}
            />
          </View>
        ) : null}

        <PrimaryButton
          label="Continue with phone"
          onPress={() => router.push('/(auth)/phone')}
          disabled={isBusy}
        />
        <PrimaryButton
          label="Continue with email"
          onPress={() => router.push('/(auth)/email')}
          disabled={isBusy}
          variant="secondary"
        />
      </SurfaceCard>

      <SurfaceCard accent="ink">
        <Text style={styles.phaseTitle}>Phase 1 is live</Text>
        <Text style={styles.phaseBody}>
          This release gets authentication, profile creation, session restore, and the signed-in shell ready for
          the rest of the relationship loop.
        </Text>
      </SurfaceCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2.6,
  },
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 16,
    lineHeight: 24,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  cardBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  appleWrap: {
    opacity: 1,
    marginBottom: spacing.md,
  },
  appleButton: {
    height: 54,
    width: '100%',
  },
  phaseTitle: {
    color: colors.cardTextOnDark,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  phaseBody: {
    color: colors.cardMutedOnDark,
    fontSize: 15,
    lineHeight: 22,
  },
});
