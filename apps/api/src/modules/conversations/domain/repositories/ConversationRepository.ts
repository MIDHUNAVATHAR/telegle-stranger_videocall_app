import { Conversation } from '../entities/Conversation';

export interface ConversationRepository {
  findById(id: string): Promise<Conversation | null>;
  findByParticipants(userAId: string, userBId: string): Promise<Conversation | null>;
  listByUser(userId: string, page?: number, limit?: number): Promise<{ conversations: Conversation[]; total: number }>;
  save(conversation: Conversation): Promise<Conversation>;
}
