import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createGeminiClient } from './engine/gemini.js';
import { createGeminiSpeech } from './engine/tts.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on real environment variables (e.g. Cloud Run).
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.');
  process.exit(1);
}

// Ordered fallback list: a busy model during peak demand falls through to the next.
const models = (
  process.env.GEMINI_MODELS ||
  'gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.5-flash,gemini-2.5-flash-lite'
)
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const voiceModels = (
  process.env.GEMINI_TTS_MODELS ||
  'gemini-3.8-flash-tts,gemini-3.8-flash-lite-tts,gemini-2.5-flash-preview-tts'
)
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);
const port = Number(process.env.PORT) || 8080;
const here = path.dirname(fileURLToPath(import.meta.url));

const app = createApp({
  client: createGeminiClient(apiKey, models),
  speech: createGeminiSpeech(apiKey, voiceModels),
  staticDir: path.resolve(here, '../client'),
});

app.listen(port, () => {
  console.info(`BlindSpot listening on http://localhost:${port} (models: ${models.join(' → ')})`);
});
