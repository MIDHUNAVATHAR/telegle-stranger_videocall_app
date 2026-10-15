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
}

export interface ConversationItem {
  _id: string;
  id: string;
  partner: PublicPartner;
  last_interaction_at: string;
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
};
