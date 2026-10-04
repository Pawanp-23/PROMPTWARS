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

const audioCache = new Map<string, Promise<string>>();
let current: HTMLAudioElement | null = null;

/** Fetches the human-sounding Gemini voice for a line; returns a playable object URL. */
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

/** Starts loading a line's audio early (e.g. when the user hovers the mic). */
export function preloadSpeech(text: string): void {
  void fetchVoice(text).catch(() => undefined);
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
    utterance.rate = 1.08;
    utterance.pitch = 1.05;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

/** Speaks a line with Gemini's voice, falling back to the browser voice. Resolves when done. */
export async function speak(text: string): Promise<void> {
  stopSpeaking();
  try {
    const url = await fetchVoice(text);
    await new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      current = audio;
      audio.onended = () => resolve();
      audio.onpause = () => resolve();
      audio.onerror = () => reject(new Error('playback failed'));
      audio.play().catch(reject);
    });
  } catch {
    await speakWithBrowser(text);
  } finally {
    current = null;
  }
}

export function stopSpeaking(): void {
  current?.pause();
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
