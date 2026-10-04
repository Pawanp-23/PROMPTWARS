import { describe, expect, it } from 'vitest';
import { pcmToFloat } from '../lib/speech';

describe('pcmToFloat', () => {
  it('decodes little-endian 16-bit PCM into [-1, 1) samples', () => {
    const bytes = new Uint8Array([0x00, 0x00, 0xff, 0x7f, 0x00, 0x80]);
    const samples = pcmToFloat(bytes);
    expect(samples[0]).toBe(0);
    expect(samples[1]).toBeCloseTo(1, 3);
    expect(samples[2]).toBe(-1);
  });

  it('ignores a trailing odd byte', () => {
    expect(pcmToFloat(new Uint8Array([0, 0, 1])).length).toBe(1);
  });
});
