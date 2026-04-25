export type ReceiptConfidence = 'high' | 'low' | 'medium';

export function getReceiptConfidence(pairedDaysCount: number): ReceiptConfidence {
  if (pairedDaysCount >= 6) {
    return 'high';
  }

  if (pairedDaysCount >= 4) {
    return 'medium';
  }

  return 'low';
}

export function canShowSensitiveReceiptInsight(confidence: ReceiptConfidence) {
  return confidence !== 'low';
}

export function getReceiptConfidenceLabel(confidence: ReceiptConfidence) {
  switch (confidence) {
    case 'high':
      return 'High signal';
    case 'medium':
      return 'Medium signal';
    case 'low':
      return 'Tiny receipt';
  }
}
