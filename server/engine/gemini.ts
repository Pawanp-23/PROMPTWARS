import { GoogleGenAI } from '@google/genai';
import type { ModelClient } from './analyze.js';

const TIMEOUT_MS = 45_000;

/** Errors worth trying another model for: overload, rate limit, or model unavailable. */
export function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 500 || status === 503 || status === 404;
}

/**
 * Tries each model in order and falls back on overload, so a busy model during
 * peak demand does not break the user's session.
 */
export async function withFallback<T>(
  models: string[],
  call: (model: string) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (const model of models) {
    try {
      return await call(model);
    } catch (err) {
      lastError = err;
      if (!isRetryable(err)) break;
    }
  }
  throw lastError;
}

/** Gemini-backed ModelClient. The API key stays on the server and is never sent to the browser. */
export function createGeminiClient(apiKey: string, models: string[]): ModelClient {
  const ai = new GoogleGenAI({ apiKey });

  return {
    generateJson(systemPrompt, userPrompt, schema) {
      return withFallback(models, async (model) => {
        const response = await ai.models.generateContent({
          model,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: schema,
            temperature: 0.4,
            abortSignal: AbortSignal.timeout(TIMEOUT_MS),
          },
        });
        return response.text ?? '';
      });
    },
  };
}
