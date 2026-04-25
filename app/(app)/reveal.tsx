import { useRouter } from 'expo-router';
import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BackButton, InlineMessage, PrimaryButton, Screen, SurfaceCard, TextField } from '@/components/ui';
import { useAuth } from '@/context/auth';
import { useDailyLoop } from '@/context/daily-loop';
import { useRelationship } from '@/context/relationship';
import { colors, spacing } from '@/theme/tokens';
import { ReactionType } from '@/types/database';

type RevealKind = 'mood' | 'feeling';

const moodSymbols = ['😞', '🙁', '😐', '🙂', '😍'];
const feelingSymbols = ['💔', '🩹', '🤍', '💗', '❤️'];
const reactionOptions: Array<{ emoji: string; label: string; value: ReactionType }> = [
  { emoji: '❤️', label: 'Heart', value: 'heart' },
  { emoji: '🫂', label: 'Hug', value: 'hug' },
  { emoji: '😂', label: 'Laugh', value: 'laugh' },
  { emoji: '😬', label: 'Oof', value: 'oof' },
  { emoji: '🥹', label: 'Proud', value: 'proud' },
];

export default function RevealScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const {
    currentUserCheckIn,
    currentUserPrediction,
    currentUserReaction,
    markRevealViewed,
    partnerCheckIn,
    partnerPrediction,
    partnerReaction,
    saveReaction,
    todayReveal,
  } = useDailyLoop();
  const { partnerProfile } = useRelationship();
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [note, setNote] = React.useState('');
  const [reactionFeedback, setReactionFeedback] = React.useState<string | null>(null);
  const [reactionType, setReactionType] = React.useState<ReactionType>('heart');

  const handleDone = async () => {
    const result = await markRevealViewed();
    setFeedback(result.message ?? null);

    if (result.ok) {
      router.replace('/(app)');
    }
  };

  const handleSaveReaction = async () => {
    const result = await saveReaction({
      note,
      reactionType,
    });

    setReactionFeedback(result.message ?? null);

    if (result.ok) {
      setNote('');
    }
  };

  const revealReady = Boolean(todayReveal && currentUserCheckIn && currentUserPrediction && partnerCheckIn && partnerPrediction);
  const noteLength = note.trim().length;
  const hasInvalidNoteLength = noteLength > 0 && (noteLength < 12 || noteLength > 160);

  return (
    <Screen>
      <BackButton onPress={() => router.back()} />

      <View style={styles.hero}>
        <Text style={styles.kicker}>REVEAL</Text>
        <Text style={styles.title}>Here is today's read.</Text>
        <Text style={styles.subtitle}>
          Your predictions and their predictions are split out clearly. Small mirror, not a verdict.
        </Text>
      </View>

      {!revealReady ? (
        <SurfaceCard accent="ink">
          <Text style={styles.darkTitle}>Reveal is still locked</Text>
          <Text style={styles.darkBody}>Both partners need to check in and predict before this opens.</Text>
          <PrimaryButton label="Back to dashboard" onPress={() => router.replace('/(app)')} />
        </SurfaceCard>
      ) : (
        <SurfaceCard accent="rose">
          {feedback ? <InlineMessage tone="warning" text={feedback} /> : null}

          <View style={styles.revealGrid}>
            <RevealSection
              subtitle="What you thought they would say"
              title={`Your read on ${partnerProfile?.display_name ?? 'your partner'}`}
            >
              <RevealRow
                actual={partnerCheckIn?.mood_score}
                actualLabel="Their actual"
                kind="mood"
                label="Mood"
                predicted={currentUserPrediction?.predicted_mood_score}
                predictionLabel="Your guess"
              />
              <RevealRow
                actual={partnerCheckIn?.relationship_feeling_score}
                actualLabel="Their actual"
                kind="feeling"
                label="Relationship feeling"
                predicted={currentUserPrediction?.predicted_relationship_feeling_score}
                predictionLabel="Your guess"
              />
            </RevealSection>

            <RevealSection
              subtitle="What they thought you would say"
              title={`${partnerProfile?.display_name ?? 'Your partner'}'s read on you`}
            >
              <RevealRow
                actual={currentUserCheckIn?.mood_score}
                actualLabel="Your actual"
                kind="mood"
                label="Mood"
                predicted={partnerPrediction?.predicted_mood_score}
                predictionLabel="Their guess"
              />
              <RevealRow
                actual={currentUserCheckIn?.relationship_feeling_score}
                actualLabel="Your actual"
                kind="feeling"
                label="Relationship feeling"
                predicted={partnerPrediction?.predicted_relationship_feeling_score}
                predictionLabel="Their guess"
              />
            </RevealSection>
          </View>

          {partnerCheckIn?.optional_text ? (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>Their context</Text>
              <Text style={styles.noteText}>{partnerCheckIn.optional_text}</Text>
            </View>
          ) : null}

          <View style={styles.reactionBox}>
            <Text style={styles.reactionTitle}>React to the reveal</Text>
            <Text style={styles.reactionSubtitle}>One day-scoped reaction. Optional note, not a chat thread.</Text>

            {reactionFeedback ? (
              <InlineMessage tone={reactionFeedback.includes('already') || reactionFeedback.includes('between') ? 'warning' : 'default'} text={reactionFeedback} />
            ) : null}

            {currentUserReaction ? (
              <View style={styles.savedReaction}>
                <Text style={styles.savedReactionTitle}>Your reaction is in: {reactionLabel(currentUserReaction.reaction_type)}</Text>
                {currentUserReaction.note ? <Text style={styles.savedReactionNote}>{currentUserReaction.note}</Text> : null}
              </View>
            ) : (
              <>
                <View style={styles.reactionGrid}>
                  {reactionOptions.map((option) => {
                    const selected = option.value === reactionType;

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setReactionType(option.value)}
                        style={[styles.reactionChip, selected ? styles.reactionChipSelected : null]}
                      >
                        <Text style={styles.reactionEmoji}>{option.emoji}</Text>
                        <Text style={[styles.reactionLabel, selected ? styles.reactionLabelSelected : null]}>{option.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <TextField
                  label="Optional reveal note"
                  value={note}
                  onChangeText={(value) => setNote(value.slice(0, 160))}
                  multiline
                  placeholder="Say the tiny thing the reveal made obvious."
                  caption={`${noteLength}/160. Leave blank or use 12+ characters.`}
                  error={hasInvalidNoteLength ? 'Leave it blank or write at least 12 characters.' : undefined}
                />

                <PrimaryButton label="Send reaction" onPress={handleSaveReaction} disabled={hasInvalidNoteLength} />
              </>
            )}

            {partnerReaction ? (
              <View style={styles.partnerReaction}>
                <Text style={styles.noteLabel}>{partnerProfile?.display_name ?? 'Your partner'} reacted</Text>
                <Text style={styles.partnerReactionText}>{reactionLabel(partnerReaction.reaction_type)}</Text>
                {partnerReaction.note ? <Text style={styles.noteText}>{partnerReaction.note}</Text> : null}
              </View>
            ) : null}
          </View>

          <PrimaryButton label="Mark reveal viewed" onPress={handleDone} />
        </SurfaceCard>
      )}
    </Screen>
  );
}

function RevealSection({ children, subtitle, title }: { children: React.ReactNode; subtitle: string; title: string }) {
  return (
    <View style={styles.revealSection}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
      {children}
    </View>
  );
}

function RevealRow({
  actual,
  actualLabel,
  kind,
  label,
  predicted,
  predictionLabel,
}: {
  actual?: number;
  actualLabel: string;
  kind: RevealKind;
  label: string;
  predicted?: number;
  predictionLabel: string;
}) {
  const delta = actual && predicted ? Math.abs(actual - predicted) : null;
  const read = delta === 0 ? 'Exact match' : delta === 1 ? 'Close read' : 'Different read';

  return (
    <View style={styles.revealRow}>
      <View style={styles.revealHeader}>
        <Text style={styles.revealLabel}>{label}</Text>
        <Text style={styles.revealRead}>{read}</Text>
      </View>
      <View style={styles.scoreCompare}>
        <View style={styles.scorePill}>
          <Text style={styles.scoreLabel}>{predictionLabel}</Text>
          <Text style={styles.scoreValue}>{formatScore(kind, predicted)}</Text>
        </View>
        <View style={styles.scorePill}>
          <Text style={styles.scoreLabel}>{actualLabel}</Text>
          <Text style={styles.scoreValue}>{formatScore(kind, actual)}</Text>
        </View>
      </View>
    </View>
  );
}

function formatScore(kind: RevealKind, score?: number) {
  if (!score) {
    return '-';
  }

  const symbols = kind === 'mood' ? moodSymbols : feelingSymbols;
  return `${symbols[score - 1]} ${score}/5`;
}

function reactionLabel(reactionType: ReactionType) {
  const option = reactionOptions.find((reaction) => reaction.value === reactionType);
  return option ? `${option.emoji} ${option.label}` : reactionType;
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
  darkTitle: {
    color: colors.cardTextOnDark,
    fontSize: 22,
    fontWeight: '800',
  },
  darkBody: {
    color: colors.cardMutedOnDark,
    fontSize: 15,
    lineHeight: 22,
  },
  revealGrid: {
    gap: spacing.md,
  },
  revealSection: {
    backgroundColor: colors.canvas,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  revealRow: {
    backgroundColor: colors.chip,
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.md,
  },
  revealHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  revealLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  scoreCompare: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  scorePill: {
    backgroundColor: colors.canvas,
    borderRadius: 14,
    flex: 1,
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  scoreLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  scoreValue: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  revealRead: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
  },
  noteBox: {
    backgroundColor: colors.message,
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.md,
  },
  noteLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  noteText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  reactionBox: {
    backgroundColor: colors.message,
    borderColor: colors.messageBorder,
    borderRadius: 22,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  reactionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  reactionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  reactionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  reactionChip: {
    alignItems: 'center',
    backgroundColor: colors.field,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    gap: 2,
    minWidth: 86,
    padding: spacing.sm,
  },
  reactionChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reactionEmoji: {
    fontSize: 22,
  },
  reactionLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  reactionLabelSelected: {
    color: colors.cardTextOnDark,
  },
  savedReaction: {
    backgroundColor: colors.field,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  savedReactionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  savedReactionNote: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  partnerReaction: {
    backgroundColor: colors.card,
    borderRadius: 18,
    gap: spacing.xs,
    padding: spacing.md,
  },
  partnerReactionText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
});
