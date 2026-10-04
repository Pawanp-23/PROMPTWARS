import { Router } from 'express';
import { savedSummarySchema, summaryIdSchema } from '../../shared/schema.js';
import type { SummaryStore } from '../engine/store.js';

/**
 * POST /api/summaries      → save a reasoning summary, returns { id }
 * GET  /api/summaries/:id  → fetch a saved summary to revisit or share
 */
export function createSummariesRouter(store: SummaryStore): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const parsed = savedSummarySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please check your input.' });
      return;
    }
    try {
      res.status(201).json({ id: await store.save(parsed.data) });
    } catch {
      console.error('summary save failed');
      res.status(503).json({ error: 'Could not save right now. Please try again.' });
    }
  });

  router.get('/:id', async (req, res) => {
    const id = summaryIdSchema.safeParse(req.params.id);
    if (!id.success) {
      res.status(400).json({ error: 'Invalid link.' });
      return;
    }
    try {
      const summary = await store.get(id.data);
      if (!summary) res.status(404).json({ error: 'This summary was not found or has expired.' });
      else res.json(summary);
    } catch {
      console.error('summary load failed');
      res.status(503).json({ error: 'Could not load right now. Please try again.' });
    }
  });

  return router;
}
