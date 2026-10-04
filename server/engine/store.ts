import { randomBytes } from 'node:crypto';
import { Firestore } from '@google-cloud/firestore';
import type { SavedSummary } from '../../shared/schema.js';

/** Persistence for reasoning summaries the user chooses to save and share. */
export interface SummaryStore {
  readonly kind: 'firestore' | 'memory';
  save(summary: SavedSummary): Promise<string>;
  get(id: string): Promise<SavedSummary | null>;
}

const COLLECTION = 'summaries';
/** Saved summaries expire after 30 days (Firestore TTL policy on `expiresAt`). */
const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/** Google Cloud Firestore-backed store. */
export function createFirestoreStore(db: Firestore): SummaryStore {
  const collection = db.collection(COLLECTION);
  return {
    kind: 'firestore',
    async save(summary) {
      const now = Date.now();
      const ref = await collection.add({
        ...summary,
        createdAt: new Date(now),
        expiresAt: new Date(now + RETENTION_MS),
      });
      return ref.id;
    },
    async get(id) {
      const snapshot = await collection.doc(id).get();
      if (!snapshot.exists) return null;
      const { decision, before, after, reflections } = snapshot.data() as SavedSummary;
      return { decision, before, after, reflections };
    },
  };
}

/** In-memory fallback for local development and tests (bounded, oldest evicted first). */
export function createMemoryStore(maxEntries = 500): SummaryStore {
  const items = new Map<string, SavedSummary>();
  return {
    kind: 'memory',
    async save(summary) {
      if (items.size >= maxEntries) {
        const oldest = items.keys().next().value;
        if (oldest !== undefined) items.delete(oldest);
      }
      const id = randomBytes(12).toString('base64url');
      items.set(id, structuredClone(summary));
      return id;
    },
    async get(id) {
      const found = items.get(id);
      return found ? structuredClone(found) : null;
    },
  };
}

/**
 * Builds the store from configuration: Firestore when a service account is provided,
 * otherwise the in-memory fallback so the app always works.
 */
export function createSummaryStore(serviceAccountJson: string | undefined): SummaryStore {
  if (!serviceAccountJson) return createMemoryStore();
  let account: { project_id?: string; client_email?: string; private_key?: string };
  try {
    account = JSON.parse(serviceAccountJson);
  } catch {
    account = {};
  }
  if (!account.project_id || !account.client_email || !account.private_key) {
    console.error('FIRESTORE_SERVICE_ACCOUNT is not valid service-account JSON; using memory.');
    return createMemoryStore();
  }
  const db = new Firestore({
    projectId: account.project_id,
    credentials: { client_email: account.client_email, private_key: account.private_key },
    ignoreUndefinedProperties: true,
  });
  return createFirestoreStore(db);
}
