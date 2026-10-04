import { useEffect, useRef, useState, type FormEvent } from 'react';
import { m } from 'motion/react';
import type { IntakeResponse, IntakeTurn } from '../../../shared/schema';
import { CLOSING_LINE, FILLERS, OPENING_LINE } from '../../../shared/voice';
import { intake } from '../lib/api';
import {
  createRecognition,
  isVoiceSupported,
  preloadSpeech,
  speak,
  stopSpeaking,
  unlockAudio,
  type Recognition,
} from '../lib/speech';

type Phase = 'idle' | 'speaking' | 'listening' | 'thinking' | 'done';

const PHASE_LABEL: Record<Phase, string> = {
  idle: 'Talk to BlindSpot',
  speaking: 'Speaking',
  listening: 'Listening',
  thinking: 'Thinking',
  done: 'Opening your analysis',
};

const ORB_MOTION: Record<Phase, { scale: number[]; duration: number }> = {
  idle: { scale: [1, 1.02, 1], duration: 4 },
  speaking: { scale: [1, 1.06, 0.98, 1.04, 1], duration: 1.6 },
  listening: { scale: [1, 1.04, 1], duration: 1.2 },
  thinking: { scale: [1, 0.97, 1], duration: 0.9 },
  done: { scale: [1, 1.08], duration: 0.6 },
};

interface Props {
  onComplete: (fields: IntakeResponse['fields']) => void;
}

/**
 * Voice intake: a short spoken interview (typing works too) that fills in the decision,
 * options, details and reasons, then hands off to the analysis. It asks; it never advises.
 */
export function VoiceAgent({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [turns, setTurns] = useState<IntakeTurn[]>([]);
  const [interim, setInterim] = useState('');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef<Recognition | null>(null);
  const turnsRef = useRef<IntakeTurn[]>([]);
  const [voiceSupported] = useState(isVoiceSupported);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      stopSpeaking();
    },
    [],
  );

  const pushTurn = (turn: IntakeTurn) => {
    turnsRef.current = [...turnsRef.current, turn];
    setTurns(turnsRef.current);
  };

  const listen = () => {
    const recognition = createRecognition();
    if (!recognition) {
      setPhase('idle');
      return;
    }
    recognitionRef.current = recognition;
    let finalText = '';
    recognition.onresult = (event) => {
      let text = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript;
        else text += result[0].transcript;
      }
      setInterim(finalText || text);
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') setError('Microphone blocked. You can type instead.');
    };
    recognition.onend = () => {
      setInterim('');
      if (finalText.trim()) void answer(finalText.trim());
      else setPhase('idle');
    };
    setPhase('listening');
    recognition.start();
  };

  const say = async (text: string, then: () => void, fixed = false) => {
    // The caption shows the line immediately; audio streams in as it is generated.
    setPhase('speaking');
    await speak(text, { fixed });
    then();
  };

  const answer = async (text: string) => {
    pushTurn({ role: 'user', text: text.slice(0, 600) });
    setPhase('thinking');
    setError('');
    // Acknowledge instantly (pre-generated) while the next question is being written.
    const filler = speak(FILLERS[turnsRef.current.length % FILLERS.length], { fixed: true });
    try {
      const next = await intake({ history: turnsRef.current.slice(-14) });
      await filler;
      pushTurn({ role: 'agent', text: next.reply });
      if (next.done) {
        await say(next.reply, () => {
          setPhase('done');
          onComplete(next.fields);
        });
      } else {
        await say(next.reply, voiceSupported ? listen : () => setPhase('idle'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setPhase('idle');
    }
  };

  const start = () => {
    setError('');
    unlockAudio();
    preloadSpeech(...FILLERS, CLOSING_LINE);
    if (!turnsRef.current.length) pushTurn({ role: 'agent', text: OPENING_LINE });
    const lastAgent = [...turnsRef.current].reverse().find((t) => t.role === 'agent');
    void say(
      lastAgent?.text ?? OPENING_LINE,
      voiceSupported ? listen : () => setPhase('idle'),
      !lastAgent || lastAgent.text === OPENING_LINE,
    );
  };

  const stop = () => {
    recognitionRef.current?.abort();
    stopSpeaking();
    setPhase('idle');
  };

  const submitTyped = (event: FormEvent) => {
    event.preventDefault();
    const text = typed.trim();
    if (!text || phase === 'thinking') return;
    unlockAudio();
    if (!turnsRef.current.length) pushTurn({ role: 'agent', text: OPENING_LINE });
    recognitionRef.current?.abort();
    stopSpeaking();
    setTyped('');
    void answer(text);
  };

  const active = phase !== 'idle';
  const answered = turns.filter((t) => t.role === 'user').length;
  const lastAgent = [...turns].reverse().find((t) => t.role === 'agent');

  return (
    <section className="voice" aria-labelledby="voice-title">
      <div className="orb-wrap">
        <m.div
          className={`orb orb-${phase}`}
          aria-hidden="true"
          animate={{ scale: ORB_MOTION[phase].scale }}
          transition={{ duration: ORB_MOTION[phase].duration, repeat: Infinity, ease: 'easeInOut' }}
        />
        <button
          type="button"
          className="orb-button"
          onClick={active ? stop : start}
          onPointerEnter={() => preloadSpeech(OPENING_LINE)}
          onFocus={() => preloadSpeech(OPENING_LINE)}
          aria-pressed={active}
          aria-label={active ? 'Stop voice conversation' : 'Start voice conversation'}
        >
          {active ? (
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <rect x="9" y="3" width="6" height="12" rx="3" fill="currentColor" />
              <path
                d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"
                stroke="currentColor"
                strokeWidth="1.8"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </div>

      <h2 id="voice-title" className="voice-title">
        {PHASE_LABEL[phase]}
      </h2>
      <p className="voice-sub" aria-live="polite">
        {interim ||
          lastAgent?.text ||
          (voiceSupported
            ? 'Calm and curious. Talk it through in about a minute.'
            : 'Voice isn’t supported in this browser. Type your answers below.')}
      </p>
      {answered > 0 && (
        <p className="mono muted voice-progress">{Math.min(answered, 6)} of ~5 answers</p>
      )}

      <form className="voice-type" onSubmit={submitTyped}>
        <label htmlFor="voice-input" className="visually-hidden">
          Type your answer
        </label>
        <input
          id="voice-input"
          value={typed}
          maxLength={600}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={answered ? 'Type your answer…' : 'Or type: “I got an internship offer…”'}
          autoComplete="off"
        />
        <button
          type="submit"
          className="btn ghost small"
          disabled={!typed.trim() || phase === 'thinking'}
        >
          Send
        </button>
      </form>
      {error && (
        <p className="voice-error" role="alert">
          {error}
        </p>
      )}

      {turns.length > 1 && (
        <details className="voice-log">
          <summary className="mono">Transcript</summary>
          <ol>
            {turns.map((turn, index) => (
              <li key={index} className={`log-${turn.role}`}>
                <span className="mono muted">{turn.role === 'agent' ? 'BlindSpot' : 'You'}</span>
                {turn.text}
              </li>
            ))}
          </ol>
        </details>
      )}
    </section>
  );
}
