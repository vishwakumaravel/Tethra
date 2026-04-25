import { describe, expect, it } from 'vitest';

import { calculateMeanAbsolutePredictionError, calculatePredictionAccuracyScore } from './predictionAccuracy';

describe('prediction accuracy', () => {
  it('maps exact predictions to 100', () => {
    expect(calculatePredictionAccuracyScore([{ actual: 3, predicted: 3 }])).toBe(100);
  });

  it('uses mean absolute error across inputs', () => {
    expect(
      calculateMeanAbsolutePredictionError([
        { actual: 5, predicted: 3 },
        { actual: 2, predicted: 1 },
      ]),
    ).toBe(1.5);
  });

  it('maps maximum average miss to 0', () => {
    expect(calculatePredictionAccuracyScore([{ actual: 5, predicted: 1 }])).toBe(0);
  });
});
