/** Minimal typing for the Web Speech API (not yet in TypeScript's DOM lib). */
export interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  abort(): void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
}

interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

type RecognitionCtor = new () => Recognition;

/** Returns a speech recognizer if the browser supports one (Chrome, Edge, Safari), else null. */
export function createRecognition(): Recognition | null {
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  const Ctor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = navigator.language || 'en-US';
  recognition.interimResults = true;
  recognition.continuous = false;
  return recognition;
}

const SAMPLE_RATE = 24_000;
const audioCache = new Map<string, Promise<string>>();
let current: HTMLAudioElement | null = null;
let context: AudioContext | null = null;
let sources: AudioBufferSourceNode[] = [];
let streamAbort: AbortController | null = null;

/** Creates/resumes the audio context; call from a click so browsers allow playback. */
export function unlockAudio(): void {
  if (typeof AudioContext === 'undefined') return;
  context ??= new AudioContext({ sampleRate: SAMPLE_RATE });
  void context.resume();
}

/** Fetches a whole WAV for a fixed line; returns a playable object URL (cached). */
function fetchVoice(text: string): Promise<string> {
  let pending = audioCache.get(text);
  if (!pending) {
    pending = fetch('/api/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).then(async (response) => {
      if (!response.ok) throw new Error('voice unavailable');
      return URL.createObjectURL(await response.blob());
    });
    pending.catch(() => audioCache.delete(text));
    audioCache.set(text, pending);
  }
  return pending;
}

/** Starts loading fixed lines early so they play instantly. */
export function preloadSpeech(...lines: string[]): void {
  for (const line of lines) void fetchVoice(line).catch(() => undefined);
}

function playUrl(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio(url);
    current = audio;
    audio.onended = () => resolve();
    audio.onpause = () => resolve();
    audio.onerror = () => reject(new Error('playback failed'));
    audio.play().catch(reject);
  }).finally(() => {
    current = null;
  });
}

/** Converts 16-bit little-endian PCM bytes to float samples. */
export function pcmToFloat(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(Math.floor(bytes.byteLength / 2));
  for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(i * 2, true) / 32768;
  return samples;
}

/** Streams a live reply and plays each chunk as soon as it arrives (no waiting for the whole clip). */
async function streamSpeech(text: string): Promise<void> {
  if (!context) throw new Error('audio locked');
  const ctx = context;
  streamAbort = new AbortController();
  const response = await fetch('/api/speak/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: streamAbort.signal,
  });
  if (!response.ok || !response.body) throw new Error('voice unavailable');

  const reader = response.body.getReader();
  let playAt = 0;
  let carry = new Uint8Array(0);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const bytes = new Uint8Array(carry.length + value.length);
    bytes.set(carry);
    bytes.set(value, carry.length);
    const even = bytes.length - (bytes.length % 2);
    carry = bytes.slice(even);
    const samples = pcmToFloat(bytes.subarray(0, even));
    if (!samples.length) continue;

    const buffer = ctx.createBuffer(1, samples.length, SAMPLE_RATE);
    buffer.getChannelData(0).set(samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    playAt = Math.max(playAt, ctx.currentTime + 0.02);
    source.start(playAt);
    playAt += buffer.duration;
    sources.push(source);
  }
  const remaining = playAt - ctx.currentTime;
  if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining * 1000));
  sources = [];
}

/** Picks the most natural-sounding voice the browser offers, for the fallback path. */
function bestBrowserVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
  const rank = (voice: SpeechSynthesisVoice) =>
    /natural|neural/i.test(voice.name)
      ? 0
      : /google/i.test(voice.name)
        ? 1
        : voice.localService
          ? 3
          : 2;
  return voices.sort((a, b) => rank(a) - rank(b))[0];
}

function speakWithBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = bestBrowserVoice();
    if (voice) utterance.voice = voice;
    utterance.rate = 1.1;
    utterance.pitch = 1.05;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Speaks a line: cached WAV for fixed lines, live streaming for new replies,
 * and the browser voice as a last resort. Resolves when speech finishes.
 */
export async function speak(text: string, { fixed = false } = {}): Promise<void> {
  stopSpeaking();
  try {
    if (fixed || audioCache.has(text)) await playUrl(await fetchVoice(text));
    else await streamSpeech(text);
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    await speakWithBrowser(text);
  }
}

export function stopSpeaking(): void {
  streamAbort?.abort();
  streamAbort = null;
  for (const source of sources) {
    try {
      source.stop();
    } catch {
      // already stopped
    }
  }
  sources = [];
  current?.pause();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
