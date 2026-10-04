import type { AnalyzeRequest, AnalyzeResponse } from '../../../shared/schema';

/** Calls the BlindSpot API. Throws an Error with a user-friendly message on failure. */
export async function analyze(
  request: AnalyzeRequest,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof body.error === 'string' ? body.error : 'Something went wrong. Please try again.',
    );
  }
  return body as AnalyzeResponse;
}
