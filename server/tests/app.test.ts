import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import type { ModelClient } from '../engine/analyze.js';
import { fakeClient, goodModelOutput, internshipRequest } from './fixtures.js';

const failingClient: ModelClient = {
  async generateJson() {
    throw new Error('network down');
  },
};

describe('API', () => {
  it('reports health', async () => {
    const res = await request(createApp({ client: fakeClient(goodModelOutput) })).get(
      '/api/health',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', storage: 'memory' });
  });

  it('sets security headers', async () => {
    const res = await request(createApp({ client: fakeClient(goodModelOutput) })).get(
      '/api/health',
    );
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('analyzes a valid decision', async () => {
    const res = await request(createApp({ client: fakeClient(goodModelOutput) }))
      .post('/api/analyze')
      .send(internshipRequest);
    expect(res.status).toBe(200);
    expect(res.body.findings).toHaveLength(2);
    expect(res.body.coverage.percent).toBe(25);
  });

  it('rejects invalid input with field names', async () => {
    const res = await request(createApp({ client: fakeClient(goodModelOutput) }))
      .post('/api/analyze')
      .send({ decision: 'x', options: [], reasons: '' });
    expect(res.status).toBe(400);
    expect(res.body.fields).toEqual(expect.arrayContaining(['decision', 'options', 'reasons']));
  });

  it('rejects oversized bodies', async () => {
    const res = await request(createApp({ client: fakeClient(goodModelOutput) }))
      .post('/api/analyze')
      .send({ ...internshipRequest, context: 'a'.repeat(30_000) });
    expect(res.status).toBe(413);
  });

  it('returns a friendly 502 when the model fails, without leaking details', async () => {
    const res = await request(createApp({ client: failingClient }))
      .post('/api/analyze')
      .send(internshipRequest);
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('network down');
  });

  it('rate-limits repeated calls', async () => {
    const app = createApp({ client: fakeClient(goodModelOutput), rateLimitPerMinute: 2 });
    await request(app).post('/api/analyze').send(internshipRequest);
    await request(app).post('/api/analyze').send(internshipRequest);
    const res = await request(app).post('/api/analyze').send(internshipRequest);
    expect(res.status).toBe(429);
  });
});

describe('performance and hardening headers', () => {
  it('gzips JSON responses when the client accepts it', async () => {
    const big = {
      ...goodModelOutput,
      findings: Array.from({ length: 7 }, (_, i) => ({
        ...goodModelOutput.findings[0],
        id: `f${i}`,
        insight: 'The internship overlaps with a full semester. '.repeat(20),
      })),
    };
    const res = await request(createApp({ client: fakeClient(big) }))
      .post('/api/analyze')
      .set('Accept-Encoding', 'gzip')
      .send(internshipRequest);
    expect(res.headers['content-encoding']).toBe('gzip');
  });

  it('restricts powerful browser features to the microphone on our own origin', async () => {
    const res = await request(createApp({ client: fakeClient(goodModelOutput) })).get(
      '/api/health',
    );
    expect(res.headers['permissions-policy']).toContain('microphone=(self)');
    expect(res.headers['permissions-policy']).toContain('camera=()');
  });
});
