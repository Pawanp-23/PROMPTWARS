import { GoogleGenAI } from '@google/genai';
import { TtlCache } from './cache.js';
import { withFallback } from './gemini.js';

/** Turns text into a playable WAV file. */
export interface SpeechClient {
  synthesize(text: string): Promise<Buffer>;
}

const TIMEOUT_MS = 20_000;
export const VOICE_NAME = 'Puck'; // Gemini's upbeat prebuilt voice

/** Performance direction for the voice: a witty, high-energy friend, never a narrator. */
export const VOICE_DIRECTION =
  'Read this like an energetic, quick-witted friend: upbeat, warm, a little playful sarcasm, natural pauses, never robotic:';

/** Wraps raw 16-bit little-endian mono PCM in a WAV header so browsers can play it. */
export function pcmToWav(
  pcm: Buffer,
  sampleRate = 24_000,
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
  const rate = Number(/rate=(\d+)/i.exec(mimeType)?.[1]) || 24_000;
  return pcmToWav(bytes, rate);
}

/** Gemini native text-to-speech with model fallback and a cache for repeated lines. */
export function createGeminiSpeech(apiKey: string, models: string[]): SpeechClient {
  const ai = new GoogleGenAI({ apiKey });
  const cache = new TtlCache<Buffer>(50, 60 * 60 * 1000);

  return {
    async synthesize(text) {
      const key = TtlCache.keyFor(text);
      const cached = cache.get(key);
      if (cached) return cached;

      const wav = await withFallback(models, async (model) => {
        const response = await ai.models.generateContent({
          model,
          contents: `${VOICE_DIRECTION} ${text}`,
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } } },
            abortSignal: AbortSignal.timeout(TIMEOUT_MS),
          },
        });
        const audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!audio?.data) throw Object.assign(new Error('No audio returned'), { status: 500 });
        return toWav(audio.data, audio.mimeType ?? 'audio/l16; rate=24000');
      });

      cache.set(key, wav);
      return wav;
    },
  };
}
