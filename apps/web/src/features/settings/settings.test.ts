import { describe, expect, it } from 'vitest';
import { SettingsModal } from './components/SettingsModal';

describe('Frontend Settings & Safety Module', () => {
  it('exports SettingsModal component', () => {
    expect(SettingsModal).toBeDefined();
  });
});
