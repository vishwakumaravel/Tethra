export type PredictionAccuracyInput = {
  actual: number;
  predicted: number;
};

export function calculateMeanAbsolutePredictionError(inputs: PredictionAccuracyInput[]) {
  if (inputs.length === 0) {
    return 4;
  }

  const totalError = inputs.reduce((sum, input) => sum + Math.abs(input.actual - input.predicted), 0);
  return totalError / inputs.length;
}

export function calculatePredictionAccuracyScore(inputs: PredictionAccuracyInput[]) {
  const meanAbsolutePredictionError = calculateMeanAbsolutePredictionError(inputs);
  return clamp(100 - (meanAbsolutePredictionError / 4) * 100, 0, 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
