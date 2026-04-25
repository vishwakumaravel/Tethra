export const CORE_LOOP_STEPS = ['check-in', 'predict', 'reveal', 'react', 'progress', 'receipt'] as const;

export const PRODUCT_PILLARS = ['Relationship Receipt', 'Daily Couple Loop', 'Relationship Tiers'] as const;

export const TETHRA_TIERS = [
  'Who Even Are You',
  'Situationship Survivors',
  'Text Me Back',
  'Actually a Couple',
  'Locked In',
  'Ride or Dies',
  'Soft Married',
  'Endgame',
] as const;

export const FREE_RECEIPT_SECTIONS = [
  'Weekly Vibe',
  'Overall Score',
  'Current Relationship Tier',
  'Basic Summary',
  'One Soft Public Insight',
  'Blurred Premium Teasers',
] as const;

export const PRO_RECEIPT_SECTIONS = [
  'Biggest Green Flag',
  'Biggest Red Flag',
  'Who Cares More',
  'Who Misread Who',
  'Biggest Trigger',
  'Effort Imbalance',
  'Partner Awareness Breakdown',
  'What To Do Next',
  'Receipt History + Trends',
] as const;

export const MONETIZATION_RULES = {
  freeCoreLoop: true,
  paidSurface: 'answers_and_depth',
  proAppliesToLinkedCouple: true,
} as const;

export const STORE_COPY_GUARDRAILS = [
  'No therapy framing',
  'No diagnosis language',
  'No scientifically proven claims',
  'No objective-truth relationship claims',
  'No public feed',
  'No anonymous interaction',
] as const;
