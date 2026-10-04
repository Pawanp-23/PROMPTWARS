import { z } from 'zod';
import { AREAS, FINDING_TYPES, REFLECTION_STATUSES } from './areas.js';

const text = (min: number, max: number) => z.string().trim().min(min).max(max);

export const reflectionSchema = z.object({
  findingId: text(1, 40),
  area: z.enum(AREAS),
  question: text(1, 300),
  status: z.enum(REFLECTION_STATUSES),
  note: z.string().trim().max(500).optional(),
});

/** Validates the body of POST /api/analyze. Limits keep prompts small and abuse cheap to reject. */
export const analyzeRequestSchema = z.object({
  decision: text(5, 300),
  options: z.array(text(1, 120)).min(1).max(5),
  context: z.string().trim().max(2000).default(''),
  reasons: text(5, 1500),
  reflections: z.array(reflectionSchema).max(12).optional(),
});

export const focusItemSchema = z.object({
  area: z.enum(AREAS),
  quote: z.string(),
});

export const findingSchema = z.object({
  id: z.string(),
  type: z.enum(FINDING_TYPES),
  area: z.enum(AREAS),
  quote: z.string().optional(),
  quoteB: z.string().optional(),
  insight: z.string(),
  question: z.string(),
});

/** Shape the model must return; anything else is rejected before reaching the user. */
export const modelOutputSchema = z.object({
  focus: z.array(focusItemSchema).max(10),
  findings: z.array(findingSchema).max(10),
});

export const INTAKE_ROLES = ['agent', 'user'] as const;

export const intakeTurnSchema = z.object({
  role: z.enum(INTAKE_ROLES),
  text: text(1, 600),
});

/** Validates the body of POST /api/intake: the conversation so far. */
export const intakeRequestSchema = z.object({
  history: z.array(intakeTurnSchema).min(1).max(14),
});

/** What the model must return for each intake turn. */
export const intakeOutputSchema = z.object({
  reply: z.string(),
  done: z.boolean(),
  fields: z.object({
    decision: z.string(),
    options: z.array(z.string()),
    context: z.string(),
    reasons: z.string(),
  }),
});

export type IntakeTurn = z.infer<typeof intakeTurnSchema>;
export type IntakeRequest = z.infer<typeof intakeRequestSchema>;
export type IntakeResponse = z.infer<typeof intakeOutputSchema>;

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;
export type Reflection = z.infer<typeof reflectionSchema>;
export type FocusItem = z.infer<typeof focusItemSchema>;
export type Finding = z.infer<typeof findingSchema>;
export type ModelOutput = z.infer<typeof modelOutputSchema>;

export interface Coverage {
  covered: (typeof AREAS)[number][];
  shadow: (typeof AREAS)[number][];
  percent: number;
}

export interface AnalyzeResponse {
  focus: FocusItem[];
  findings: Finding[];
  coverage: Coverage;
  blockedCount: number;
}
