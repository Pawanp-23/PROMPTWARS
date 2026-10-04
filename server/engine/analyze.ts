import type { AnalyzeRequest, AnalyzeResponse } from '../../shared/schema.js';
import { modelOutputSchema } from '../../shared/schema.js';
import { computeCoverage } from '../../shared/coverage.js';
import { guardFindings } from './guard.js';
import { buildUserPrompt, sourceText, SYSTEM_PROMPT } from './prompt.js';
import { groundFindings, groundFocus } from './quotes.js';
import { TtlCache } from './cache.js';

/** Anything that can turn a system + user prompt into raw JSON text (Gemini in production, a fake in tests). */
export interface ModelClient {
  generateJson(systemPrompt: string, userPrompt: string): Promise<string>;
}

export class AnalysisError extends Error {}

const MAX_FINDINGS = 7;

/**
 * Full BlindSpot pipeline:
 * model call → schema validation → quote grounding → "never decide" guard → coverage scoring.
 */
export async function analyzeDecision(
  input: AnalyzeRequest,
  client: ModelClient,
  cache?: TtlCache<AnalyzeResponse>,
): Promise<AnalyzeResponse> {
  const cacheKey = TtlCache.keyFor(input);
  const cached = cache?.get(cacheKey);
  if (cached) return cached;

  const raw = await client.generateJson(SYSTEM_PROMPT, buildUserPrompt(input));

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new AnalysisError('Model returned invalid JSON');
  }
  const parsed = modelOutputSchema.safeParse(json);
  if (!parsed.success) throw new AnalysisError('Model returned an unexpected shape');

  const source = sourceText(input);
  // Focus = what the user's own reasons rely on, so it is grounded in the reasons only.
  const focus = groundFocus(parsed.data.focus, input.reasons);
  const grounded = groundFindings(parsed.data.findings, source).slice(0, MAX_FINDINGS);
  const { findings, blockedCount } = guardFindings(grounded);

  const result: AnalyzeResponse = {
    focus,
    // Stable, unique ids regardless of what the model produced.
    findings: findings.map((finding, index) => ({ ...finding, id: `f${index + 1}` })),
    coverage: computeCoverage(focus, input.reflections),
    blockedCount,
  };
  cache?.set(cacheKey, result);
  return result;
}
