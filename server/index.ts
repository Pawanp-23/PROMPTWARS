import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { loadConfig, type Config } from './config.js';
import { createGeminiClient } from './engine/gemini.js';
import { createGeminiSpeech } from './engine/tts.js';
import { WARM_LINES } from '../shared/voice.js';

try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on real environment variables (e.g. Render or Cloud Run).
}

let config: Config;
try {
  config = loadConfig();
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}

const speech = createGeminiSpeech(config.apiKey, config.voiceModels);

// Pre-generate fixed lines in the background so the greeting and fillers play instantly.
void (async () => {
  for (const line of WARM_LINES) await speech.synthesize(line).catch(() => undefined);
})();

const here = path.dirname(fileURLToPath(import.meta.url));
const app = createApp({
  client: createGeminiClient(config.apiKey, config.textModels),
  speech,
  staticDir: path.resolve(here, '../client'),
});

app.listen(config.port, () => {
  console.info(`BlindSpot listening on http://localhost:${config.port}`);
});
