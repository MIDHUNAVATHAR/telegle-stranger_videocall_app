import { describe, expect, it } from 'vitest';
import { giftsApi } from './giftsApi';
import { GiftModal } from './components/GiftModal';

describe('Frontend Virtual Gifts Module', () => {
  it('exports GiftModal component', () => {
    expect(GiftModal).toBeDefined();
  });

  it('exposes gifts REST API client methods', () => {
    expect(typeof giftsApi.listGifts).toBe('function');
    expect(typeof giftsApi.sendGift).toBe('function');
  });
});
