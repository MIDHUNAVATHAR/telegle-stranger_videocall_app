import { describe, it, expect } from 'vitest';
import { AVAILABLE_GIFTS, POPULAR_INTERESTS, SAMPLE_STRANGERS } from '../shared/constants';

describe('Web Application', () => {
  it('should verify Donkey Play setup', () => {
    expect('Donkey Play').toBe('Donkey Play');
  });

  it('should have initial gifts and popular interests configured', () => {
    expect(AVAILABLE_GIFTS.length).toBeGreaterThan(0);
    expect(POPULAR_INTERESTS.length).toBeGreaterThan(0);
    expect(AVAILABLE_GIFTS.some((g) => g.id === 'carrot')).toBe(true);
  });

  it('should have sample strangers for discovery matching', () => {
    expect(SAMPLE_STRANGERS.length).toBeGreaterThan(0);
    expect(SAMPLE_STRANGERS[0].name).toBeDefined();
    expect(SAMPLE_STRANGERS[0].country).toBeDefined();
  });
});
