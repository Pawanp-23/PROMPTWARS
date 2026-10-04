import { Type, type Schema } from '@google/genai';
import { AREAS, FINDING_TYPES } from '../../shared/areas.js';

/** Structured-output schema for the blind-spot analysis. */
export const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['focus', 'findings'],
  properties: {
    focus: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['area', 'quote'],
        properties: {
          area: { type: Type.STRING, enum: [...AREAS] },
          quote: { type: Type.STRING },
        },
      },
    },
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        required: ['id', 'type', 'area', 'insight', 'question'],
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, enum: [...FINDING_TYPES] },
          area: { type: Type.STRING, enum: [...AREAS] },
          quote: { type: Type.STRING },
          quoteB: { type: Type.STRING },
          insight: { type: Type.STRING },
          question: { type: Type.STRING },
        },
      },
    },
  },
};

/** Structured-output schema for one turn of the voice intake conversation. */
export const INTAKE_SCHEMA: Schema = {
  type: Type.OBJECT,
  required: ['reply', 'done', 'fields'],
  properties: {
    reply: { type: Type.STRING },
    done: { type: Type.BOOLEAN },
    fields: {
      type: Type.OBJECT,
      required: ['decision', 'options', 'context', 'reasons'],
      properties: {
        decision: { type: Type.STRING },
        options: { type: Type.ARRAY, items: { type: Type.STRING } },
        context: { type: Type.STRING },
        reasons: { type: Type.STRING },
      },
    },
  },
};
