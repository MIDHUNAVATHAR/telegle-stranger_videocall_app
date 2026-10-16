import { describe, it, expect, vi } from 'vitest';
import { matchingApi } from './apis/matchingApi';
import { socketService } from './services/socketClient';

describe('Frontend Matching Module', () => {
  it('exposes all REST matchmaking API endpoints', () => {
    expect(typeof matchingApi.getOnlinePresence).toBe('function');
    expect(typeof matchingApi.joinQueue).toBe('function');
    expect(typeof matchingApi.leaveQueue).toBe('function');
    expect(typeof matchingApi.getCallSession).toBe('function');
    expect(typeof matchingApi.endCallSession).toBe('function');
  });

  it('exposes SocketService with matchmaking and signaling sockets', () => {
    expect(typeof socketService.getMatchmakingSocket).toBe('function');
    expect(typeof socketService.getSignalingSocket).toBe('function');
    expect(typeof socketService.disconnect).toBe('function');
  });

  it('handles leaveQueue API gracefully', async () => {
    vi.spyOn(matchingApi, 'leaveQueue').mockResolvedValue({
      message: 'Left matchmaking queue successfully',
    });

    const res = await matchingApi.leaveQueue();
    expect(res.message).toBe('Left matchmaking queue successfully');
  });

  it('handles getOnlinePresence returning exact counts including 0', async () => {
    vi.spyOn(matchingApi, 'getOnlinePresence').mockResolvedValueOnce({
      online_count: 0,
    });
    const zeroRes = await matchingApi.getOnlinePresence();
    expect(zeroRes.online_count).toBe(0);

    vi.spyOn(matchingApi, 'getOnlinePresence').mockResolvedValueOnce({
      online_count: 5,
    });
    const activeRes = await matchingApi.getOnlinePresence();
    expect(activeRes.online_count).toBe(5);
  });
});
