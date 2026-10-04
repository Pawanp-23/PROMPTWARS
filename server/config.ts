/** Default ordered fallback lists: a busy model during peak demand falls through to the next. */
export const DEFAULT_TEXT_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
];
export const DEFAULT_VOICE_MODELS = [
  'gemini-3.8-flash-tts',
  'gemini-3.8-flash-lite-tts',
  'gemini-2.5-flash-preview-tts',
];

export interface Config {
  apiKey: string;
  textModels: string[];
  voiceModels: string[];
  port: number;
  /** Google Cloud service-account JSON for Firestore; when absent an in-memory store is used. */
  firestoreServiceAccount?: string;
}

/** Parses a comma-separated env value into a clean list, or returns the fallback. */
export function parseList(value: string | undefined, fallback: string[]): string[] {
  const items = (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length ? items : fallback;
}

/** Reads and validates configuration from the environment. Throws if the API key is missing. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set. Copy .env.example to .env and add your key.');
  }
  const port = Number(env.PORT);
  return {
    apiKey,
    textModels: parseList(env.GEMINI_MODELS, DEFAULT_TEXT_MODELS),
    voiceModels: parseList(env.GEMINI_TTS_MODELS, DEFAULT_VOICE_MODELS),
    port: Number.isInteger(port) && port > 0 ? port : 8080,
    firestoreServiceAccount: env.FIRESTORE_SERVICE_ACCOUNT?.trim() || undefined,
  };
}
