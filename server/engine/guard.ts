import type { Finding } from '../../shared/schema.js';

/**
 * Phrases that would turn BlindSpot from a thinking companion into a decision-maker.
 * The problem statement forbids deciding for the user, so this is enforced in code,
 * not just requested in the prompt.
 */
const RECOMMENDATION_PATTERNS: readonly RegExp[] = [
  /\byou should\b/i,
  /\byou must\b/i,
  /\byou need to\b/i,
  /\bi (?:would |strongly )?(?:recommend|suggest|advise)\b/i,
  /\bmy (?:recommendation|advice|suggestion)\b/i,
  /\b(?:the )?best (?:option|choice|decision|path)\b/i,
  /\bthe right (?:choice|decision|option|call)\b/i,
  /\bgo (?:with|for) (?:it|the|option)\b/i,
  /\b(?:definitely|clearly|obviously) (?:accept|take|choose|pick|decline|reject|skip)\b/i,
  /\byou(?:'d| would) be better off\b/i,
  /\bdon'?t (?:accept|take|choose|do) it\b/i,
];

/** True when the text recommends, ranks, or prescribes a choice. */
export function containsRecommendation(text: string): boolean {
  return RECOMMENDATION_PATTERNS.some((pattern) => pattern.test(text));
}

/** Removes only the offending sentences, keeping the neutral rest of the insight. */
export function stripRecommendations(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]*/g) ?? [];
  return sentences
    .filter((sentence) => !containsRecommendation(sentence))
    .join('')
    .trim();
}

export interface GuardResult {
  findings: Finding[];
  blockedCount: number;
}

/**
 * Enforces the "never decide" rule on model output.
 * - A question that prescribes a choice, or is not actually a question, drops the finding.
 * - Prescriptive sentences inside an insight are removed.
 */
export function guardFindings(findings: Finding[]): GuardResult {
  let blockedCount = 0;
  const safe: Finding[] = [];

  for (const finding of findings) {
    const question = finding.question.trim();
    if (!question.endsWith('?') || containsRecommendation(question)) {
      blockedCount += 1;
      continue;
    }
    const insight = stripRecommendations(finding.insight);
    if (insight !== finding.insight.trim()) blockedCount += 1;
    safe.push({ ...finding, question, insight });
  }

  return { findings: safe, blockedCount };
}
