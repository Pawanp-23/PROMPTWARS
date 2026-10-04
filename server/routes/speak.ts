import { Router } from 'express';
import { z } from 'zod';
import { SAMPLE_RATE, type SpeechClient } from '../engine/tts.js';

const speakSchema = z.object({ text: z.string().trim().min(1).max(400) });

/**
 * POST /api/speak         → whole WAV (cached; used for fixed lines like the greeting)
 * POST /api/speak/stream  → raw 16-bit PCM streamed as it is generated (live replies)
 */
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

  router.post('/stream', async (req, res) => {
    const parsed = speakSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Please check your input.' });
      return;
    }
    try {
      let started = false;
      for await (const pcm of speech.stream(parsed.data.text)) {
        if (!started) {
          res.set({
            'Content-Type': `audio/L16; rate=${SAMPLE_RATE}; channels=1`,
            'Cache-Control': 'no-store',
          });
          started = true;
        }
        res.write(pcm);
      }
      if (!started) res.status(502).json({ error: 'Voice is unavailable right now.' });
      else res.end();
    } catch {
      console.error('speak stream failed');
      if (!res.headersSent) res.status(502).json({ error: 'Voice is unavailable right now.' });
      else res.end();
    }
  });

  return router;
}
