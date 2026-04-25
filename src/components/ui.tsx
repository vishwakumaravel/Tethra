import * as React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, shadow, spacing } from '@/theme/tokens';

type ScreenProps = {
  children: React.ReactNode;
  scroll?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

type SurfaceCardProps = {
  accent?: 'rose' | 'ink';
  children: React.ReactNode;
};

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
};

type BackButtonProps = {
  label?: string;
  onPress: () => void;
};

type InlineMessageProps = {
  text: string;
  tone?: 'default' | 'warning' | 'danger';
};

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  caption?: string;
};

export function Screen({ children, scroll = true, contentContainerStyle }: ScreenProps) {
  const content = (
    <View style={styles.canvas}>
      <View pointerEvents="none" style={styles.orbA} />
      <View pointerEvents="none" style={styles.orbB} />
      <View pointerEvents="none" style={styles.orbC} />
      <View style={[styles.content, contentContainerStyle]}>{children}</View>
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function SurfaceCard({ accent = 'rose', children }: SurfaceCardProps) {
  return <View style={[styles.card, accent === 'ink' ? styles.inkCard : styles.roseCard]}>{children}</View>;
}

export function PrimaryButton({ label, onPress, disabled, loading, variant = 'primary' }: ButtonProps) {
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' ? styles.secondaryButton : styles.primaryButton,
        inactive && styles.buttonDisabled,
        pressed && !inactive && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? colors.text : colors.cardTextOnDark} />
      ) : (
        <Text style={[styles.buttonLabel, variant === 'secondary' ? styles.secondaryButtonLabel : styles.primaryButtonLabel]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function BackButton({ label = 'Back', onPress }: BackButtonProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.backButton, pressed ? styles.buttonPressed : null]}>
      <Text style={styles.backButtonLabel}>{`< ${label}`}</Text>
    </Pressable>
  );
}

export function TextField({ label, error, caption, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.placeholder}
        style={[styles.fieldInput, error ? styles.fieldInputError : null, style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : caption ? <Text style={styles.fieldCaption}>{caption}</Text> : null}
    </View>
  );
}

export function InlineMessage({ text, tone = 'default' }: InlineMessageProps) {
  return (
    <View
      style={[
        styles.message,
        tone === 'warning' ? styles.warningMessage : null,
        tone === 'danger' ? styles.dangerMessage : null,
      ]}
    >
      <Text style={styles.messageText}>{text}</Text>
    </View>
  );
}

export function LoadingView({ message }: { message: string }) {
  return (
    <SafeAreaView style={styles.loadingSafeArea}>
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.loadingMessage}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  canvas: {
    flex: 1,
    minHeight: '100%',
    overflow: 'hidden',
  },
  content: {
    gap: spacing.md,
    marginHorizontal: 'auto',
    maxWidth: 560,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    width: '100%',
  },
  orbA: {
    backgroundColor: colors.orbPrimary,
    borderRadius: 180,
    height: 180,
    position: 'absolute',
    right: -40,
    top: 10,
    width: 180,
  },
  orbB: {
    backgroundColor: colors.orbSecondary,
    borderRadius: 220,
    height: 220,
    left: -120,
    position: 'absolute',
    top: 220,
    width: 220,
  },
  orbC: {
    backgroundColor: colors.orbAccent,
    borderRadius: 120,
    bottom: 60,
    height: 120,
    position: 'absolute',
    right: -40,
    width: 120,
  },
  card: {
    borderRadius: radii.xl,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow.card,
  },
  roseCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
  },
  inkCard: {
    backgroundColor: colors.ink,
  },
  button: {
    alignItems: 'center',
    borderRadius: 18,
    justifyContent: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.md,
  },
  primaryButton: {
    backgroundColor: colors.primary,
  },
  secondaryButton: {
    backgroundColor: colors.secondaryButton,
    borderColor: colors.border,
    borderWidth: 1,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: colors.secondaryButton,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButtonLabel: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  primaryButtonLabel: {
    color: colors.cardTextOnDark,
  },
  secondaryButtonLabel: {
    color: colors.text,
  },
  fieldWrap: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  fieldInput: {
    backgroundColor: colors.field,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  fieldInputError: {
    borderColor: colors.danger,
  },
  fieldCaption: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  message: {
    backgroundColor: colors.message,
    borderColor: colors.messageBorder,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  warningMessage: {
    backgroundColor: colors.warningSoft,
    borderColor: colors.warning,
  },
  dangerMessage: {
    backgroundColor: colors.dangerSoft,
    borderColor: colors.danger,
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
  },
  loadingSafeArea: {
    backgroundColor: colors.canvas,
    flex: 1,
  },
  loadingWrap: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingMessage: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
});
