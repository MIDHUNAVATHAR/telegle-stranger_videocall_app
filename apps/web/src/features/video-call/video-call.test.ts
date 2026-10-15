import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { VideoCallView } from './components/VideoCallView';
import { useWebRTC } from './hooks/useWebRTC';

describe('Frontend Video Call Feature (WebRTC)', () => {
  it('exports VideoCallView and useWebRTC hook', () => {
    expect(VideoCallView).toBeDefined();
    expect(typeof useWebRTC).toBe('function');
  });

  it('guarantees STUN-only configuration and excludes any TURN servers', () => {
    // Read the useWebRTC implementation file to verify the strict architectural constraint
    const hookCode = fs.readFileSync(path.join(__dirname, 'hooks/useWebRTC.ts'), 'utf-8');

    expect(hookCode).toContain('stun:stun.l.google.com:19302');
    expect(hookCode).not.toContain('turn:');
    expect(hookCode).not.toContain('turns:');
  });

  it('enforces 5-second countdown lock and auto-blur in hook initial state', () => {
    const hookCode = fs.readFileSync(path.join(__dirname, 'hooks/useWebRTC.ts'), 'utf-8');

    expect(hookCode).toContain('setLockCountdown(5)');
    expect(hookCode).toContain('isBlurred, setIsBlurred] = useState<boolean>(true)');
  });
});
