/* eslint-disable require-yield -- fake speech streams that end or fail without audio */
import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { pcmToWav, toPcm, toWav } from '../engine/tts.js';
import type { SpeechClient } from '../engine/tts.js';
import { fakeClient, goodModelOutput } from './fixtures.js';

describe('pcmToWav', () => {
  it('writes a valid 44-byte RIFF/WAVE header around the samples', () => {
    const wav = pcmToWav(Buffer.alloc(480), 24_000);
    expect(wav.length).toBe(44 + 480);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt32LE(24)).toBe(24_000);
    expect(wav.readUInt32LE(40)).toBe(480);
  });
});

describe('toWav', () => {
  it('passes WAV through and wraps raw PCM using the reported sample rate', () => {
    const raw = Buffer.from('abcd').toString('base64');
    expect(toWav(raw, 'audio/wav').toString()).toBe('abcd');
    expect(toWav(raw, 'audio/L16;codec=pcm;rate=16000').readUInt32LE(24)).toBe(16_000);
  });
});

describe('POST /api/speak', () => {
  const speech: SpeechClient = {
    synthesize: async () => Buffer.from('RIFFfake'),
    async *stream() {
      yield Buffer.alloc(0);
    },
  };
  const app = () => createApp({ client: fakeClient(goodModelOutput), speech });

  it('returns audio for a line', async () => {
    const res = await request(app()).post('/api/speak').send({ text: 'Hey there!' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('audio/wav');
  });

  it('rejects empty or overly long text', async () => {
    expect((await request(app()).post('/api/speak').send({ text: '' })).status).toBe(400);
    expect(
      (
        await request(app())
          .post('/api/speak')
          .send({ text: 'a'.repeat(401) })
      ).status,
    ).toBe(400);
  });

  it('reports a friendly error when the voice fails', async () => {
    const failing: SpeechClient = {
      synthesize: async () => {
        throw new Error('quota');
      },
      async *stream() {
        throw new Error('quota');
      },
    };
    const res = await request(createApp({ client: fakeClient(goodModelOutput), speech: failing }))
      .post('/api/speak')
      .send({ text: 'Hi' });
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('quota');
  });

  it('allows blob audio in the content security policy', async () => {
    const res = await request(app()).get('/api/health');
    expect(res.headers['content-security-policy']).toContain("media-src 'self' blob:");
  });
});

describe('POST /api/speak/stream', () => {
  it('streams PCM chunks as they are generated', async () => {
    const speech: SpeechClient = {
      synthesize: async () => Buffer.alloc(0),
      async *stream() {
        yield Buffer.from([1, 0, 2, 0]);
        yield Buffer.from([3, 0]);
      },
    };
    const res = await request(createApp({ client: fakeClient(goodModelOutput), speech }))
      .post('/api/speak/stream')
      .buffer(true)
      .parse((response, done) => {
        const parts: Buffer[] = [];
        response.on('data', (chunk: Buffer) => parts.push(chunk));
        response.on('end', () => done(null, Buffer.concat(parts)));
      })
      .send({ text: 'Hi there' });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('audio/L16');
    expect([...(res.body as Buffer)]).toEqual([1, 0, 2, 0, 3, 0]);
  });

  it('returns 502 when the voice produces nothing', async () => {
    const speech: SpeechClient = {
      synthesize: async () => Buffer.alloc(0),
      async *stream() {
        return;
      },
    };
    const res = await request(createApp({ client: fakeClient(goodModelOutput), speech }))
      .post('/api/speak/stream')
      .send({ text: 'Hi there' });
    expect(res.status).toBe(502);
  });
});

describe('toPcm', () => {
  it('strips a WAV header but keeps raw PCM untouched', () => {
    const pcm = Buffer.from([1, 2, 3, 4]);
    expect(toPcm(pcm.toString('base64'))).toEqual(pcm);
    const wav = pcmToWav(Buffer.alloc(100, 7));
    expect(toPcm(wav.toString('base64'))).toEqual(Buffer.alloc(100, 7));
  });
});
