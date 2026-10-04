import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import type { ModelClient } from './engine/analyze.js';
import { createAnalyzeRouter } from './routes/analyze.js';

export interface AppOptions {
  client: ModelClient;
  /** Directory containing the built client; omitted in tests. */
  staticDir?: string;
  rateLimitPerMinute?: number;
}

/** Builds the Express app. Kept separate from `listen` so it can be tested in-process. */
export function createApp({ client, staticDir, rateLimitPerMinute = 20 }: AppOptions) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Cloud Run sits behind one proxy; needed for per-IP rate limits.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          connectSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use(express.json({ limit: '20kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use(
    '/api/analyze',
    rateLimit({
      windowMs: 60_000,
      limit: rateLimitPerMinute,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'Too many requests. Please wait a minute and try again.' },
    }),
    createAnalyzeRouter(client),
  );

  if (staticDir) {
    app.use(express.static(staticDir, { maxAge: '1h', index: 'index.html' }));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(staticDir, 'index.html'));
    });
  }

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = typeof err?.status === 'number' ? err.status : 500;
    if (status >= 500) console.error(err);
    res
      .status(status)
      .json({ error: status >= 500 ? 'Something went wrong.' : 'Invalid request.' });
  };
  app.use(onError);

  return app;
}
