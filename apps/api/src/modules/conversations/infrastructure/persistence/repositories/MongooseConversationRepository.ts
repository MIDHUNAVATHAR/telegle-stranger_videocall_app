import mongoose from 'mongoose';
import { Conversation } from '../../../domain/entities/Conversation';
import { ConversationRepository } from '../../../domain/repositories/ConversationRepository';
import { ConversationModel, ConversationDocument } from '../mongoose/ConversationModel';

export class MongooseConversationRepository implements ConversationRepository {
  // In-memory fallback map for unit tests when MongoDB is disconnected
  private readonly inMemoryStore = new Map<string, Conversation>();

  private toDomain(doc: ConversationDocument): Conversation {
    return Conversation.reconstruct({
      id: doc._id.toString(),
      participantIds: doc.participant_ids as [string, string],
      lastCallMatchId: doc.last_call_match_id,
      lastInteractionAt: doc.last_interaction_at,
      hiddenByUserIds: doc.hidden_by_user_ids,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  public async findById(id: string): Promise<Conversation | null> {
    if (mongoose.connection.readyState === 1) {
      const doc = await ConversationModel.findById(id).exec();
      return doc ? this.toDomain(doc) : null;
    }
    return this.inMemoryStore.get(id) || null;
  }

  public async findByParticipants(userAId: string, userBId: string): Promise<Conversation | null> {
    const sorted: [string, string] = [userAId, userBId].sort() as [string, string];

    if (mongoose.connection.readyState === 1) {
      const doc = await ConversationModel.findOne({ participant_ids: sorted }).exec();
      return doc ? this.toDomain(doc) : null;
    }

    for (const conv of this.inMemoryStore.values()) {
      if (
        conv.participantIds[0] === sorted[0] &&
        conv.participantIds[1] === sorted[1]
      ) {
        return conv;
      }
    }
    return null;
  }

  public async listByUser(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ conversations: Conversation[]; total: number }> {
    if (mongoose.connection.readyState === 1) {
      const filter = {
        participant_ids: userId,
        hidden_by_user_ids: { $ne: userId },
      };
      const skip = (page - 1) * limit;

      const [docs, total] = await Promise.all([
        ConversationModel.find(filter)
          .sort({ last_interaction_at: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        ConversationModel.countDocuments(filter).exec(),
      ]);

      return {
        conversations: docs.map((doc) => this.toDomain(doc)),
        total,
      };
    }

    const filtered = Array.from(this.inMemoryStore.values())
      .filter((c) => c.isParticipant(userId) && !c.isHiddenFor(userId))
      .sort((a, b) => b.lastInteractionAt.getTime() - a.lastInteractionAt.getTime());

    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    return {
      conversations: paginated,
      total: filtered.length,
    };
  }

  public async save(conversation: Conversation): Promise<Conversation> {
    if (mongoose.connection.readyState === 1) {
      const doc = await ConversationModel.findByIdAndUpdate(
        conversation.id,
        {
          $set: {
            participant_ids: conversation.participantIds,
            last_call_match_id: conversation.lastCallMatchId,
            last_interaction_at: conversation.lastInteractionAt,
            hidden_by_user_ids: conversation.hiddenByUserIds,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      ).exec();

      return this.toDomain(doc);
    }

    this.inMemoryStore.set(conversation.id, conversation);
    return conversation;
  }
}
