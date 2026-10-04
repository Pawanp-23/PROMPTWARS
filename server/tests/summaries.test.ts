import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { createMemoryStore, createSummaryStore, type SummaryStore } from '../engine/store.js';
import type { SavedSummary } from '../../shared/schema.js';
import { fakeClient, goodModelOutput } from './fixtures.js';

const summary: SavedSummary = {
  decision: 'Should I accept the internship?',
  before: { covered: ['finances'], shadow: ['academics'], percent: 13 },
  after: { covered: ['finances', 'academics'], shadow: [], percent: 25 },
  reflections: [
    { findingId: 'f1', area: 'academics', question: 'How will exams fit?', status: 'unknown' },
  ],
};

const appWith = (store: SummaryStore) => createApp({ client: fakeClient(goodModelOutput), store });

describe('summaries API', () => {
  it('saves a summary and returns it by id', async () => {
    const app = appWith(createMemoryStore());
    const saved = await request(app).post('/api/summaries').send(summary);
    expect(saved.status).toBe(201);
    expect(saved.body.id).toMatch(/^[A-Za-z0-9_-]{8,40}$/);

    const loaded = await request(app).get(`/api/summaries/${saved.body.id}`);
    expect(loaded.status).toBe(200);
    expect(loaded.body).toEqual(summary);
  });

  it('rejects invalid summaries and malformed ids before touching the store', async () => {
    const app = appWith(createMemoryStore());
    expect((await request(app).post('/api/summaries').send({ decision: 'x' })).status).toBe(400);
    expect((await request(app).get('/api/summaries/bad$id')).status).toBe(400);
  });

  it('returns 404 for unknown ids', async () => {
    const res = await request(appWith(createMemoryStore())).get('/api/summaries/abcdefgh1234');
    expect(res.status).toBe(404);
  });

  it('returns 503 without leaking details when the database fails', async () => {
    const broken: SummaryStore = {
      kind: 'firestore',
      save: async () => {
        throw new Error('PERMISSION_DENIED secret-project');
      },
      get: async () => {
        throw new Error('PERMISSION_DENIED secret-project');
      },
    };
    const res = await request(appWith(broken)).post('/api/summaries').send(summary);
    expect(res.status).toBe(503);
    expect(JSON.stringify(res.body)).not.toContain('secret-project');
  });
});

describe('summary stores', () => {
  it('memory store returns copies so callers cannot mutate saved data', async () => {
    const store = createMemoryStore();
    const id = await store.save(summary);
    const first = await store.get(id);
    first!.decision = 'changed';
    expect((await store.get(id))!.decision).toBe(summary.decision);
  });

  it('memory store evicts the oldest entry when full', async () => {
    const store = createMemoryStore(1);
    const a = await store.save(summary);
    await store.save(summary);
    expect(await store.get(a)).toBeNull();
  });

  it('uses Firestore when a service account is configured, memory otherwise', () => {
    expect(createSummaryStore(undefined).kind).toBe('memory');
    const account = JSON.stringify({
      project_id: 'demo-project',
      client_email: 'svc@demo-project.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    });
    expect(createSummaryStore(account).kind).toBe('firestore');
  });

  it('falls back to memory instead of crashing on a malformed service account', () => {
    expect(createSummaryStore('{not json').kind).toBe('memory');
    expect(createSummaryStore('{"project_id":"x"}').kind).toBe('memory');
  });
});
