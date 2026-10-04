import { describe, expect, it } from 'vitest';
import { DEFAULT_TEXT_MODELS, DEFAULT_VOICE_MODELS, loadConfig, parseList } from '../config.js';

describe('parseList', () => {
  it('splits, trims and drops blanks', () => {
    expect(parseList(' a, b ,,c ', [])).toEqual(['a', 'b', 'c']);
  });

  it('falls back when empty or missing', () => {
    expect(parseList('', ['x'])).toEqual(['x']);
    expect(parseList(undefined, ['x'])).toEqual(['x']);
  });
});

describe('loadConfig', () => {
  it('requires an API key', () => {
    expect(() => loadConfig({})).toThrow(/GEMINI_API_KEY/);
    expect(() => loadConfig({ GEMINI_API_KEY: '   ' })).toThrow();
  });

  it('applies defaults', () => {
    const config = loadConfig({ GEMINI_API_KEY: 'k' });
    expect(config).toEqual({
      apiKey: 'k',
      textModels: DEFAULT_TEXT_MODELS,
      voiceModels: DEFAULT_VOICE_MODELS,
      port: 8080,
    });
  });

  it('reads overrides and ignores an invalid port', () => {
    const config = loadConfig({ GEMINI_API_KEY: 'k', GEMINI_MODELS: 'm1,m2', PORT: 'abc' });
    expect(config.textModels).toEqual(['m1', 'm2']);
    expect(config.port).toBe(8080);
    expect(loadConfig({ GEMINI_API_KEY: 'k', PORT: '3000' }).port).toBe(3000);
  });
});
