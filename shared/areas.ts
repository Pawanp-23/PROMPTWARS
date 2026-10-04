/**
 * The eight life areas BlindSpot checks every decision against.
 * Coverage ("Light & Shadow") is computed deterministically over this fixed list.
 */
export const AREAS = [
  'academics',
  'finances',
  'learning_growth',
  'long_term_career',
  'health_time',
  'people_affected',
  'risk_reversibility',
  'alternatives',
] as const;

export type Area = (typeof AREAS)[number];

export const AREA_LABELS: Record<Area, string> = {
  academics: 'Academics & commitments',
  finances: 'Money & costs',
  learning_growth: 'Learning & mentorship',
  long_term_career: 'Long-term future',
  health_time: 'Health, time & energy',
  people_affected: 'People affected',
  risk_reversibility: 'Risks & reversibility',
  alternatives: 'Alternatives',
};

export const FINDING_TYPES = ['overlooked', 'assumption', 'conflict'] as const;
export type FindingType = (typeof FINDING_TYPES)[number];

export const FINDING_LABELS: Record<FindingType, string> = {
  overlooked: 'Overlooked',
  assumption: 'Assumption',
  conflict: 'Conflict',
};

/**
 * Common thinking traps. "Deciding on what we notice first" is anchoring and availability;
 * the rest are the usual companions. Labels are neutral: they describe a pattern, not a flaw.
 */
export const BIASES = [
  'anchoring',
  'availability',
  'confirmation',
  'social_proof',
  'sunk_cost',
  'overconfidence',
  'optimism',
  'status_quo',
] as const;
export type Bias = (typeof BIASES)[number];

export const BIAS_LABELS: Record<Bias, string> = {
  anchoring: 'Anchoring',
  availability: 'Availability',
  confirmation: 'Confirmation bias',
  social_proof: 'Bandwagon effect',
  sunk_cost: 'Sunk cost',
  overconfidence: 'Overconfidence',
  optimism: 'Optimism bias',
  status_quo: 'Status quo bias',
};

export const REFLECTION_STATUSES = ['considered', 'unknown', 'not_relevant'] as const;
export type ReflectionStatus = (typeof REFLECTION_STATUSES)[number];
