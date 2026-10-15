import { ConversationRepository } from '../../domain/repositories/ConversationRepository';
import { Conversation } from '../../domain/entities/Conversation';
import {
  ConversationNotFoundError,
  DirectCallNotAllowedError,
} from '../../domain/errors/ConversationErrors';
import { UserRepository } from '../../../users/domain/repositories/UserRepository';
import { UserPreferencesUseCase } from '../../../users/application/use-cases/UserPreferencesUseCase';
import { MatchmakingService } from '../../../matching/infrastructure/services/MatchmakingService';

export interface PublicPartnerDTO {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  gender: string;
  age: number;
  karmaScore: number;
}

export interface ConversationItemDTO {
  _id: string;
  id: string;
  partner: PublicPartnerDTO;
  last_interaction_at: string;
}

export class ListConversationsUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly userRepo: UserRepository
  ) {}

  public async execute(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ data: ConversationItemDTO[]; meta: { page: number; limit: number; total: number } }> {
    const { conversations, total } = await this.conversationRepo.listByUser(userId, page, limit);

    const items: ConversationItemDTO[] = [];

    for (const conv of conversations) {
      const partnerId = conv.getPartnerId(userId);
      const partner = await this.userRepo.findById(partnerId);

      const partnerDto: PublicPartnerDTO = {
        id: partnerId,
        username: partner?.username || 'stranger',
        display_name: partner?.displayName || partner?.username || 'Stranger',
        avatar_url: partner?.avatarUrl,
        bio: partner?.bio,
        gender: partner?.gender || 'OTHER',
        age: partner?.age || 20,
        karmaScore: partner?.karmaScore || 100,
      };

      items.push({
        _id: conv.id,
        id: conv.id,
        partner: partnerDto,
        last_interaction_at: conv.lastInteractionAt.toISOString(),
      });
    }

    return {
      data: items,
      meta: { page, limit, total },
    };
  }
}

export class GetConversationByIdUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly userRepo: UserRepository
  ) {}

  public async execute(conversationId: string, currentUserId: string): Promise<ConversationItemDTO> {
    const conv = await this.conversationRepo.findById(conversationId);
    if (!conv || !conv.isParticipant(currentUserId)) {
      throw new ConversationNotFoundError(conversationId);
    }

    const partnerId = conv.getPartnerId(currentUserId);
    const partner = await this.userRepo.findById(partnerId);

    return {
      _id: conv.id,
      id: conv.id,
      partner: {
        id: partnerId,
        username: partner?.username || 'stranger',
        display_name: partner?.displayName || partner?.username || 'Stranger',
        avatar_url: partner?.avatarUrl,
        bio: partner?.bio,
        gender: partner?.gender || 'OTHER',
        age: partner?.age || 20,
        karmaScore: partner?.karmaScore || 100,
      },
      last_interaction_at: conv.lastInteractionAt.toISOString(),
    };
  }
}

export class DeleteConversationUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  public async execute(conversationId: string, currentUserId: string): Promise<void> {
    const conv = await this.conversationRepo.findById(conversationId);
    if (!conv || !conv.isParticipant(currentUserId)) {
      throw new ConversationNotFoundError(conversationId);
    }

    conv.hideFor(currentUserId);
    await this.conversationRepo.save(conv);
  }
}

export class DirectCallUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly preferencesUseCase: UserPreferencesUseCase,
    private readonly matchmakingService: MatchmakingService
  ) {}

  public async execute(
    conversationId: string,
    callerId: string
  ): Promise<{ session_id: string; status: string }> {
    const conv = await this.conversationRepo.findById(conversationId);
    if (!conv || !conv.isParticipant(callerId)) {
      throw new ConversationNotFoundError(conversationId);
    }

    const partnerId = conv.getPartnerId(callerId);
    const preferences = await this.preferencesUseCase.getPreferences(partnerId);

    if (preferences.allowIncomingCalls === false) {
      throw new DirectCallNotAllowedError('Partner is not accepting direct incoming calls');
    }

    // Direct calls create a paired session with direct match type
    const session = await this.matchmakingService.attemptPairing(callerId, 'ANY', 'OTHER');
    const sessionId = session ? session.id : `call_direct_${Date.now()}`;

    // Update conversation record
    conv.recordNewCall(sessionId);
    await this.conversationRepo.save(conv);

    return {
      session_id: sessionId,
      status: 'RINGING',
    };
  }
}

export class RecordCallConnectionUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  public async execute(userAId: string, userBId: string, matchId?: string): Promise<Conversation> {
    let conv = await this.conversationRepo.findByParticipants(userAId, userBId);
    if (!conv) {
      conv = Conversation.create(userAId, userBId, matchId);
    } else {
      conv.recordNewCall(matchId);
    }
    return this.conversationRepo.save(conv);
  }
}
