import * as React from 'react';
import { GestureResponderEvent, StyleSheet, Text, View } from 'react-native';

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
  const [trackWidth, setTrackWidth] = React.useState(0);
  const fillPercent = ((value - 1) / 4) * 100;

  const updateValueFromTouch = (event: GestureResponderEvent) => {
    if (!trackWidth) {
      return;
    }

    const nextRatio = Math.min(1, Math.max(0, event.nativeEvent.locationX / trackWidth));
    const nextValue = Math.min(5, Math.max(1, Math.round(nextRatio * 4) + 1));
    onChange(nextValue);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>
          {scaleSymbols[value - 1]} {value}/5
        </Text>
      </View>
      <View style={styles.sliderWrap}>
        <View style={styles.symbolRow}>
          {scaleSymbols.map((symbol, index) => (
            <Text key={`${symbol}-${index}`} style={[styles.symbol, index + 1 === value ? styles.symbolSelected : null]}>
              {symbol}
            </Text>
          ))}
        </View>
        <View
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={updateValueFromTouch}
          onResponderMove={updateValueFromTouch}
          onStartShouldSetResponder={() => true}
          style={styles.track}
        >
          <View style={[styles.trackFill, { width: `${fillPercent}%` }]} />
          {[1, 2, 3, 4, 5].map((score) => (
            <View
              key={score}
              style={[
                styles.stepDot,
                score <= value ? styles.stepDotActive : null,
                { left: `${((score - 1) / 4) * 100}%` },
              ]}
            />
          ))}
          <View style={[styles.thumb, { left: `${fillPercent}%` }]}>
            <Text style={styles.thumbText}>{value}</Text>
          </View>
        </View>
        <View style={styles.numberRow}>
          {[1, 2, 3, 4, 5].map((score) => (
            <Text key={score} style={[styles.number, score === value ? styles.numberSelected : null]}>
              {score}
            </Text>
          ))}
        </View>
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
  sliderWrap: {
    gap: spacing.sm,
  },
  symbolRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  symbol: {
    fontSize: 22,
    opacity: 0.45,
  },
  symbolSelected: {
    fontSize: 32,
    opacity: 1,
  },
  track: {
    backgroundColor: colors.chip,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    position: 'relative',
  },
  trackFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    bottom: 0,
    left: 0,
    opacity: 0.28,
    position: 'absolute',
    top: 0,
  },
  stepDot: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 12,
    marginLeft: -6,
    position: 'absolute',
    width: 12,
  },
  stepDotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  thumb: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderColor: colors.card,
    borderRadius: 999,
    borderWidth: 3,
    height: 44,
    justifyContent: 'center',
    marginLeft: -22,
    position: 'absolute',
    width: 44,
  },
  thumbText: {
    color: colors.cardTextOnDark,
    fontSize: 16,
    fontWeight: '900',
  },
  numberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  number: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  numberSelected: {
    color: colors.primary,
    fontSize: 15,
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
