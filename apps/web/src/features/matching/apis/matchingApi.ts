import { api } from '../../../shared/api/client';
import { IMatchPartnerProfile } from '@donkey-play/shared-types';

export interface PresenceResponse {
  online_count: number;
}

export interface JoinQueueResponse {
  queue: string;
  status: 'SEARCHING' | 'PAIRED';
  sessionId?: string;
  partnerId?: string;
  partner?: IMatchPartnerProfile;
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

  acceptMatch: (sessionId: string) =>
    api.post<{ sessionId: string; status: string }>(`/matching/sessions/${sessionId}/accept`),

  rejectMatch: (sessionId: string) =>
    api.post<{ sessionId: string; status: string }>(`/matching/sessions/${sessionId}/reject`),

  cancelMatch: (sessionId: string) =>
    api.post<{ sessionId: string; status: string }>(`/matching/sessions/${sessionId}/cancel`),

  getCallSession: (sessionId: string) =>
    api.get<CallSessionResponse>(`/calls/${sessionId}`),

  endCallSession: (sessionId: string, emergencyReport = false) =>
    api.post<{ durationSeconds: number; sessionId: string }>(`/calls/${sessionId}/end`, {
      emergencyReport,
    }),
};
