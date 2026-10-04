import { GoogleGenAI } from '@google/genai';
import { TtlCache } from './cache.js';
import { withFallback } from './gemini.js';

/** Turns text into speech: a whole WAV for short fixed lines, or a live PCM stream. */
export interface SpeechClient {
  synthesize(text: string): Promise<Buffer>;
  stream(text: string): AsyncIterable<Buffer>;
}

const TIMEOUT_MS = 20_000;
/** After a quota/rate error, skip voice calls for this long and fail fast instead. */
export const COOLDOWN_MS = 10 * 60 * 1000;

/**
 * Circuit breaker for the voice quota: once Gemini says "quota exceeded", stop calling it
 * for a cooldown so every request fails instantly (the client then uses the browser voice).
 */
export function createCircuitBreaker(cooldownMs = COOLDOWN_MS, now: () => number = Date.now) {
  let openUntil = 0;
  return {
    assertClosed(): void {
      if (now() < openUntil) {
        throw Object.assign(new Error('Voice quota cooling down'), { status: 503 });
      }
    },
    record(err: unknown): void {
      if ((err as { status?: number })?.status === 429) openUntil = now() + cooldownMs;
    },
  };
}
/** Voice quota is small: one pass over the models, no backoff retry. */
const VOICE_RETRY = { passes: 1 };

export const VOICE_NAME = 'Puck'; // Gemini's upbeat prebuilt voice
export const SAMPLE_RATE = 24_000;

/** Wraps raw 16-bit little-endian mono PCM in a WAV header so browsers can play it. */
export function pcmToWav(
  pcm: Buffer,
  sampleRate = SAMPLE_RATE,
  channels = 1,
  bitsPerSample = 16,
): Buffer {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((channels * bitsPerSample) / 8, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** Normalizes Gemini audio output (WAV or raw L16 PCM) to WAV bytes. */
export function toWav(base64: string, mimeType: string): Buffer {
  const bytes = Buffer.from(base64, 'base64');
  if (/wav/i.test(mimeType)) return bytes;
  const rate = Number(/rate=(\d+)/i.exec(mimeType)?.[1]) || SAMPLE_RATE;
  return pcmToWav(bytes, rate);
}

/** Normalizes one streamed chunk to raw PCM (drops a WAV header if the model sends one). */
export function toPcm(base64: string): Buffer {
  const bytes = Buffer.from(base64, 'base64');
  const isWav = bytes.length > 44 && bytes.toString('ascii', 0, 4) === 'RIFF';
  return isWav ? bytes.subarray(44) : bytes;
}

const speechConfig = { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } } };

/**
 * Gemini native text-to-speech. Only the agent's own words are sent, with no stage
 * directions, so nothing extra is ever read aloud. Fixed lines are cached.
 */
export function createGeminiSpeech(apiKey: string, models: string[]): SpeechClient {
  const ai = new GoogleGenAI({ apiKey });
  const cache = new TtlCache<Buffer>(50, 60 * 60 * 1000);
  const breaker = createCircuitBreaker();

  /** Runs a Gemini voice call through the breaker so quota errors trip it. */
  const guarded = async <T>(call: () => Promise<T>): Promise<T> => {
    breaker.assertClosed();
    try {
      return await call();
    } catch (err) {
      breaker.record(err);
      throw err;
    }
  };

  return {
    async synthesize(text) {
      const key = TtlCache.keyFor(text);
      const cached = cache.get(key);
      if (cached) return cached;

      const wav = await guarded(() =>
        withFallback(
          models,
          async (model) => {
            const response = await ai.models.generateContent({
              model,
              contents: text,
              config: {
                responseModalities: ['AUDIO'],
                speechConfig,
                abortSignal: AbortSignal.timeout(TIMEOUT_MS),
              },
            });
            const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
            if (!audio?.data) throw Object.assign(new Error('No audio returned'), { status: 500 });
            return toWav(audio.data, audio.mimeType ?? 'audio/l16; rate=24000');
          },
          VOICE_RETRY,
        ),
      );

      cache.set(key, wav);
      return wav;
    },

    async *stream(text) {
      const chunks = await guarded(() =>
        withFallback(
          models,
          (model) =>
            ai.models.generateContentStream({
              model,
              contents: text,
              config: {
                responseModalities: ['AUDIO'],
                speechConfig,
                abortSignal: AbortSignal.timeout(TIMEOUT_MS),
              },
            }),
          VOICE_RETRY,
        ),
      );
      for await (const chunk of chunks) {
        const data = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (data) yield toPcm(data);
      }
    },
  };
}
