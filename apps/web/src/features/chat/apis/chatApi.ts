import { api } from '../../../shared/api/client';

export interface PublicPartner {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  gender: string;
  age: number;
  karmaScore: number;
  is_online?: boolean;
}

export interface ConversationItem {
  _id: string;
  id: string;
  partner: PublicPartner;
  last_interaction_at: string;
  last_message_text?: string;
  last_message_sender_id?: string;
  video_call_enabled_by_partner?: boolean;
  video_call_enabled_by_me?: boolean;
}

export interface DirectCallResponse {
  session_id: string;
  status: string;
}

export const chatApi = {
  listConversations: (page = 1, limit = 20) =>
    api.get<ConversationItem[]>(`/conversations?page=${page}&limit=${limit}`),

  getConversationById: (id: string) =>
    api.get<ConversationItem>(`/conversations/${id}`),

  deleteConversation: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/conversations/${id}`),

  directCall: (id: string) =>
    api.post<DirectCallResponse>(`/conversations/${id}/call`),

  toggleVideoCallPermission: (id: string, enabled: boolean) =>
    api.patch<ConversationItem>(`/conversations/${id}/video-call`, { enabled }),

  createOrEnsureConversation: (partnerId: string, matchId?: string, lastMessageText?: string) =>
    api.post<ConversationItem>('/conversations', { partnerId, matchId, lastMessageText }),
};
