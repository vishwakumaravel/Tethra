export type AnalyticsProperties = Record<string, unknown>;

const blockedPropertyKeys = new Set([
  'actual',
  'answer',
  'answers',
  'mood_score',
  'note',
  'note_text',
  'optional_text',
  'predicted_mood_score',
  'predicted_relationship_feeling_score',
  'relationship_feeling_score',
  'stress_level',
  'text',
]);

export function sanitizeAnalyticsProperties(properties: AnalyticsProperties = {}) {
  return Object.entries(properties).reduce<AnalyticsProperties>((safeProperties, [key, value]) => {
    if (blockedPropertyKeys.has(key.toLowerCase())) {
      return safeProperties;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      safeProperties[key] = value;
    }

    return safeProperties;
  }, {});
}
