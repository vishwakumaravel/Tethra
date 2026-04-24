import * as React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

type ScorePickerProps = {
  label: string;
  value: number;
  lowLabel: string;
  highLabel: string;
  symbols?: ScoreSymbols;
  onChange: (value: number) => void;
};

type ScoreSymbols = [string, string, string, string, string];

const defaultSymbols: ScoreSymbols = ['😞', '🙁', '😐', '🙂', '😍'];

export function ScorePicker({ highLabel, label, lowLabel, onChange, symbols, value }: ScorePickerProps) {
  const scaleSymbols = symbols ?? defaultSymbols;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {scaleSymbols[value - 1]} {value}/5
        </Text>
      </View>
      <View style={styles.options}>
        {[1, 2, 3, 4, 5].map((score) => {
          const selected = score === value;

          return (
            <Pressable
              key={score}
              onPress={() => onChange(score)}
              style={[styles.option, selected ? styles.optionSelected : null]}
            >
              <Text style={styles.optionSymbol}>{scaleSymbols[score - 1]}</Text>
              <Text style={[styles.optionText, selected ? styles.optionTextSelected : null]}>{score}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.captionRow}>
        <Text style={styles.caption}>{lowLabel}</Text>
        <Text style={styles.caption}>{highLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  value: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '900',
  },
  options: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  option: {
    alignItems: 'center',
    backgroundColor: colors.chip,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 62,
    paddingVertical: spacing.xs,
  },
  optionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionSymbol: {
    fontSize: 21,
  },
  optionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  optionTextSelected: {
    color: colors.cardTextOnDark,
  },
  captionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  caption: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600',
  },
});
