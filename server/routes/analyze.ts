import { Router } from 'express';
import { analyzeRequestSchema, type AnalyzeResponse } from '../../shared/schema.js';
import { AnalysisError, analyzeDecision, type ModelClient } from '../engine/analyze.js';
import { TtlCache } from '../engine/cache.js';

/** POST /api/analyze: validates input, runs the BlindSpot pipeline, never leaks internals. */
export function createAnalyzeRouter(client: ModelClient): Router {
  const router = Router();
  const cache = new TtlCache<AnalyzeResponse>();

  router.post('/', async (req, res) => {
    const parsed = analyzeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Please check your input.',
        fields: parsed.error.issues.map((issue) => issue.path.join('.')),
      });
      return;
    }

    try {
      res.json(await analyzeDecision(parsed.data, client, cache));
    } catch (err) {
      const reason = err instanceof AnalysisError ? err.message : 'model call failed';
      console.error(`analyze failed: ${reason}`);
      res.status(502).json({
        error: 'The AI could not analyze this right now. Your text is safe; please try again.',
      });
    }
  });

  return router;
}
