import { api } from '../../../shared/api/client';

export interface PresenceResponse {
  online_count: number;
}

export interface JoinQueueResponse {
  queue: string;
  status: 'SEARCHING' | 'PAIRED';
  sessionId?: string;
  partnerId?: string;
}

export interface CallSessionResponse {
  sessionId: string;
  userA: string;
  userB: string;
  matchType: string;
  status: string;
  coinCharged: string;
  startedAt: string;
  endedAt?: string | null;
  durationSeconds?: number;
}

export const matchingApi = {
  getOnlinePresence: () => api.get<PresenceResponse>('/matching/presence'),

  joinQueue: (filter: 'ANY' | 'MALE' | 'FEMALE' = 'ANY') =>
    api.post<JoinQueueResponse>('/matching/queue/join', { filter }),

  leaveQueue: () =>
    api.post<{ message: string }>('/matching/queue/leave'),

  getCallSession: (sessionId: string) =>
    api.get<CallSessionResponse>(`/calls/${sessionId}`),

  endCallSession: (sessionId: string, emergencyReport = false) =>
    api.post<{ durationSeconds: number; sessionId: string }>(`/calls/${sessionId}/end`, {
      emergencyReport,
    }),
};
