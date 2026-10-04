import type {
  AnalyzeRequest,
  AnalyzeResponse,
  IntakeRequest,
  IntakeResponse,
} from '../../../shared/schema';

/** POSTs JSON to the BlindSpot API. Throws an Error with a user-friendly message on failure. */
async function post<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof body.error === 'string' ? body.error : 'Something went wrong. Please try again.',
    );
  }
  return body as T;
}

export const analyze = (request: AnalyzeRequest) => post<AnalyzeResponse>('/api/analyze', request);

export const intake = (request: IntakeRequest) => post<IntakeResponse>('/api/intake', request);
