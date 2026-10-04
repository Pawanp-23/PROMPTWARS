import { Router } from 'express';
import { intakeRequestSchema } from '../../shared/schema.js';
import { AnalysisError, type ModelClient } from '../engine/analyze.js';
import { intakeTurn } from '../engine/intake.js';

/** POST /api/intake: one turn of the voice interview that fills in the decision form. */
export function createIntakeRouter(client: ModelClient): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const parsed = intakeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please check your input.' });
      return;
    }
    try {
      res.json(await intakeTurn(parsed.data, client));
    } catch (err) {
      const reason = err instanceof AnalysisError ? err.message : 'model call failed';
      console.error(`intake failed: ${reason}`);
      res.status(502).json({ error: 'I couldn’t catch that. Please try again or type instead.' });
    }
  });

  return router;
}
