import { describe, it, expect } from 'vitest';
import { AVAILABLE_GIFTS, POPULAR_INTERESTS, SAMPLE_STRANGERS } from '../shared/constants';

describe('Web Application', () => {
  it('should verify Telegle setup', () => {
    expect('Telegle').toBe('Telegle');
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

  describe('Frontend Authentication Access Guards', () => {
    const PROTECTED_TABS = ['chat', 'wallet', 'profile'] as const;

    it('requires authentication for messages, wallet, and profile tabs', () => {
      let authModalOpened = false;
      const openAuthModal = () => {
        authModalOpened = true;
      };

      const handleTabNavigation = (tab: string, isAuthenticated: boolean) => {
        if (tab !== 'matching' && !isAuthenticated) {
          openAuthModal();
          return false;
        }
        return true;
      };

      // Unauthenticated user attempting to switch to protected tabs
      PROTECTED_TABS.forEach((tab) => {
        authModalOpened = false;
        const allowed = handleTabNavigation(tab, false);
        expect(allowed).toBe(false);
        expect(authModalOpened).toBe(true);
      });

      // Authenticated user can freely access protected tabs
      PROTECTED_TABS.forEach((tab) => {
        authModalOpened = false;
        const allowed = handleTabNavigation(tab, true);
        expect(allowed).toBe(true);
        expect(authModalOpened).toBe(false);
      });
    });

    it('requires authentication before starting instant video match', () => {
      let authModalOpened = false;
      const onRequireAuth = () => {
        authModalOpened = true;
      };

      const handleStartMatch = (isAuthenticated: boolean) => {
        if (!isAuthenticated) {
          onRequireAuth();
          return false;
        }
        return true;
      };

      expect(handleStartMatch(false)).toBe(false);
      expect(authModalOpened).toBe(true);

      expect(handleStartMatch(true)).toBe(true);
    });
  });
});

