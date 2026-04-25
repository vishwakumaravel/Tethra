import { useRouter } from 'expo-router';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ScorePicker } from '@/components/ritual';
import { BackButton, InlineMessage, PrimaryButton, Screen, SurfaceCard } from '@/components/ui';
import { useDailyLoop } from '@/context/daily-loop';
import { useRelationship } from '@/context/relationship';
import { colors, spacing } from '@/theme/tokens';

const moodSymbols: [string, string, string, string, string] = ['😞', '🙁', '😐', '🙂', '😍'];
const feelingSymbols: [string, string, string, string, string] = ['💔', '🩹', '🤍', '💗', '❤️'];

export default function PredictionScreen() {
  const router = useRouter();
  const { currentUserCheckIn, currentUserPrediction, isLoading, savePrediction } = useDailyLoop();
  const { partnerProfile } = useRelationship();
  const [predictedMoodScore, setPredictedMoodScore] = React.useState(3);
  const [predictedRelationshipFeelingScore, setPredictedRelationshipFeelingScore] = React.useState(3);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const handleSave = async () => {
    const result = await savePrediction({
      predictedMoodScore,
      predictedRelationshipFeelingScore,
    });

    setFeedback(result.message ?? null);

    if (result.ok) {
      router.replace('/(app)');
    }
  };

  return (
    <Screen>
      <BackButton onPress={() => router.back()} />

      <View style={styles.hero}>
        <Text style={styles.kicker}>PREDICT</Text>
        <Text style={styles.title}>Guess where they are today.</Text>
        <Text style={styles.subtitle}>
          This is the part that makes the reveal feel earned. Keep it quick and go with your gut.
        </Text>
      </View>

      <SurfaceCard accent="rose">
        {!currentUserCheckIn ? <InlineMessage tone="warning" text="Check in first, then predict your partner." /> : null}
        {currentUserPrediction ? <InlineMessage text="You already predicted today. Head back home to wait for the reveal." /> : null}
        {feedback ? <InlineMessage tone={feedback.includes('could not') ? 'warning' : 'default'} text={feedback} /> : null}

        <Text style={styles.partnerLabel}>Predicting {partnerProfile?.display_name ?? 'your partner'}</Text>
        <ScorePicker
          highLabel="Great"
          label="Their mood"
          lowLabel="Rough"
          symbols={moodSymbols}
          value={predictedMoodScore}
          onChange={setPredictedMoodScore}
        />
        <ScorePicker
          highLabel="Close"
          label="Their relationship feeling"
          lowLabel="Distant"
          symbols={feelingSymbols}
          value={predictedRelationshipFeelingScore}
          onChange={setPredictedRelationshipFeelingScore}
        />

        <PrimaryButton
          label={currentUserPrediction ? 'Back to dashboard' : 'Save prediction'}
          onPress={currentUserPrediction ? () => router.replace('/(app)') : handleSave}
          disabled={!currentUserCheckIn}
          loading={isLoading}
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
  partnerLabel: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
});
