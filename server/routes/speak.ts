import { Router } from 'express';
import { z } from 'zod';
import type { SpeechClient } from '../engine/tts.js';

const speakSchema = z.object({ text: z.string().trim().min(1).max(400) });

/** POST /api/speak: returns the agent's line as human-sounding WAV audio. */
export function createSpeakRouter(speech: SpeechClient): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const parsed = speakSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please check your input.' });
      return;
    }
    try {
      const wav = await speech.synthesize(parsed.data.text);
      res.set({ 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' }).send(wav);
    } catch {
      console.error('speak failed');
      res.status(502).json({ error: 'Voice is unavailable right now.' });
    }
  });

  return router;
}
