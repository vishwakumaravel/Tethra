import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScorePicker } from '@/components/ritual';
import { InlineMessage, PrimaryButton, Screen, SurfaceCard, TextField } from '@/components/ui';
import { useDailyLoop } from '@/context/daily-loop';
import { colors, spacing } from '@/theme/tokens';

const moodSymbols: [string, string, string, string, string] = ['😞', '🙁', '😐', '🙂', '😍'];
const feelingSymbols: [string, string, string, string, string] = ['💔', '🩹', '🤍', '💗', '❤️'];
const stressSymbols: [string, string, string, string, string] = ['🌿', '🙂', '😐', '😬', '🔥'];

export default function CheckInScreen() {
  const router = useRouter();
  const { currentUserCheckIn, isLoading, localDay, saveCheckIn } = useDailyLoop();
  const [moodScore, setMoodScore] = React.useState(3);
  const [relationshipFeelingScore, setRelationshipFeelingScore] = React.useState(3);
  const [stressLevel, setStressLevel] = React.useState(3);
  const [optionalText, setOptionalText] = React.useState('');
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleSave = async () => {
    const result = await saveCheckIn({
      moodScore,
      optionalText,
      relationshipFeelingScore,
      stressLevel,
    });

    setFeedback(result.message ?? null);

    if (result.ok) {
      router.replace('/(app)/prediction');
    }
  };

  return (
    <Screen>
      <Pressable onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backLabel}>Back</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.kicker}>TODAY</Text>
        <Text style={styles.title}>Check in before the reveal.</Text>
        <Text style={styles.subtitle}>Three quick signals. Your partner sees the reveal only after both of you finish.</Text>
      </View>

      <SurfaceCard accent="rose">
        <Text style={styles.localDay}>Couple day: {localDay ?? 'Not linked'}</Text>

        {currentUserCheckIn ? <InlineMessage text="You already checked in today. Head to predictions next." /> : null}
        {feedback ? <InlineMessage tone={feedback.includes('could not') ? 'warning' : 'default'} text={feedback} /> : null}

        <ScorePicker
          highLabel="Great"
          label="Mood"
          lowLabel="Rough"
          symbols={moodSymbols}
          value={moodScore}
          onChange={setMoodScore}
        />
        <ScorePicker
          highLabel="Close"
          label="Relationship feeling"
          lowLabel="Distant"
          symbols={feelingSymbols}
          value={relationshipFeelingScore}
          onChange={setRelationshipFeelingScore}
        />
        <ScorePicker
          highLabel="High"
          label="Stress"
          lowLabel="Low"
          symbols={stressSymbols}
          value={stressLevel}
          onChange={setStressLevel}
        />

        <TextField
          label="Tiny context note (optional)"
          value={optionalText}
          onChangeText={(value) => setOptionalText(value.slice(0, 280))}
          multiline
          placeholder="Only if today needs a little context."
          caption={`${optionalText.length}/280`}
        />

        <PrimaryButton
          label={currentUserCheckIn ? 'Continue to prediction' : 'Save check-in'}
          onPress={currentUserCheckIn ? () => router.replace('/(app)/prediction') : handleSave}
          loading={isLoading}
        />
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
  localDay: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
