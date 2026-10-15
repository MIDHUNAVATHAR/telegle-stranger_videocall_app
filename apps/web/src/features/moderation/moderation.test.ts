import { describe, expect, it } from 'vitest';
import { moderationApi } from './moderationApi';

describe('Frontend Moderation & Reporting Module', () => {
  it('exposes moderation REST API client methods', () => {
    expect(typeof moderationApi.reportUser).toBe('function');
    expect(typeof moderationApi.blockUser).toBe('function');
    expect(typeof moderationApi.unblockUser).toBe('function');
    expect(typeof moderationApi.listBlocks).toBe('function');
  });
});
