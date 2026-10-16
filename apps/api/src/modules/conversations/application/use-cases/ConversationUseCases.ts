import { ConversationRepository } from '../../domain/repositories/ConversationRepository';
import { Conversation } from '../../domain/entities/Conversation';
import {
  ConversationNotFoundError,
  DirectCallNotAllowedError,
  UserAlreadyInCallError,
} from '../../domain/errors/ConversationErrors';
import { UserRepository } from '../../../users/domain/repositories/UserRepository';
import { UserPreferencesUseCase } from '../../../users/application/use-cases/UserPreferencesUseCase';
import { MatchmakingService } from '../../../matching/infrastructure/services/MatchmakingService';
import { PresenceService } from '../../../matching/infrastructure/services/PresenceService';

export interface PublicPartnerDTO {
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

export interface ConversationItemDTO {
  _id: string;
  id: string;
  partner: PublicPartnerDTO;
  last_interaction_at: string;
  last_message_text?: string;
  last_message_sender_id?: string;
  video_call_enabled_by_partner: boolean;
  video_call_enabled_by_me: boolean;
}

export class ListConversationsUseCase {
  constructor(
    private readonly conversationRepo: ConversationRepository,
    private readonly userRepo: UserRepository,
    private readonly presenceService?: PresenceService
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
      const isOnline = this.presenceService ? await this.presenceService.isUserOnline(partnerId) : false;

      const partnerDto: PublicPartnerDTO = {
        id: partnerId,
        username: partner?.username || 'stranger',
        display_name: partner?.displayName || partner?.username || 'Stranger',
        avatar_url: partner?.avatarUrl,
        bio: partner?.bio,
        gender: partner?.gender || 'OTHER',
        age: partner?.age || 20,
        karmaScore: partner?.karmaScore || 100,
        is_online: isOnline,
      };

      items.push({
        _id: conv.id,
        id: conv.id,
        partner: partnerDto,
        last_interaction_at: conv.lastInteractionAt.toISOString(),
        last_message_text: conv.lastMessageText || '',
        last_message_sender_id: conv.lastMessageSenderId || '',
        video_call_enabled_by_partner: conv.isVideoCallEnabledBy(partnerId),
        video_call_enabled_by_me: conv.isVideoCallEnabledBy(userId),
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
    private readonly userRepo: UserRepository,
    private readonly presenceService?: PresenceService
  ) {}

  public async execute(conversationId: string, currentUserId: string): Promise<ConversationItemDTO> {
    const conv = await this.conversationRepo.findById(conversationId);
    if (!conv || !conv.isParticipant(currentUserId)) {
      throw new ConversationNotFoundError(conversationId);
    }

    const partnerId = conv.getPartnerId(currentUserId);
    const partner = await this.userRepo.findById(partnerId);
    const isOnline = this.presenceService ? await this.presenceService.isUserOnline(partnerId) : false;

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
        is_online: isOnline,
      },
      last_interaction_at: conv.lastInteractionAt.toISOString(),
      video_call_enabled_by_partner: conv.isVideoCallEnabledBy(partnerId),
      video_call_enabled_by_me: conv.isVideoCallEnabledBy(currentUserId),
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

export class ToggleVideoCallPermissionUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  public async execute(
    conversationId: string,
    currentUserId: string,
    enabled: boolean
  ): Promise<{
    conversation_id: string;
    video_call_enabled_by_me: boolean;
    video_call_enabled_by_partner: boolean;
  }> {
    const conv = await this.conversationRepo.findById(conversationId);
    if (!conv || !conv.isParticipant(currentUserId)) {
      throw new ConversationNotFoundError(conversationId);
    }

    conv.setVideoCallEnabled(currentUserId, enabled);
    await this.conversationRepo.save(conv);

    const partnerId = conv.getPartnerId(currentUserId);

    return {
      conversation_id: conv.id,
      video_call_enabled_by_me: conv.isVideoCallEnabledBy(currentUserId),
      video_call_enabled_by_partner: conv.isVideoCallEnabledBy(partnerId),
    };
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
  ): Promise<{ session_id: string; status: string; partner_id: string }> {
    const conv = await this.conversationRepo.findById(conversationId);
    if (!conv || !conv.isParticipant(callerId)) {
      throw new ConversationNotFoundError(conversationId);
    }

    const partnerId = conv.getPartnerId(callerId);

    // Rule: Opposite person must have opened chat and enabled video call for this conversation!
    if (!conv.isVideoCallEnabledBy(partnerId)) {
      throw new DirectCallNotAllowedError('Video call is not enabled by partner for this conversation');
    }

    const preferences = await this.preferencesUseCase.getPreferences(partnerId);

    if (preferences.allowIncomingCalls === false) {
      throw new DirectCallNotAllowedError('Partner is not accepting direct incoming calls');
    }

    // Check if partner is already in an active video call!
    const partnerActiveSession = await this.matchmakingService.getActiveSessionId(partnerId);
    if (partnerActiveSession) {
      throw new UserAlreadyInCallError('User is already on another call');
    }

    // Check if caller is already in an active video call!
    const callerActiveSession = await this.matchmakingService.getActiveSessionId(callerId);
    if (callerActiveSession) {
      throw new UserAlreadyInCallError('You are already on another call');
    }

    // Direct calls create a paired ringing session in MatchmakingService
    const sessionData = await this.matchmakingService.createDirectCallSession(callerId, partnerId);
    const sessionId = (sessionData?.id as string) || `call_direct_${Date.now()}`;

    // Update conversation record
    conv.recordNewCall(sessionId);
    await this.conversationRepo.save(conv);

    return {
      session_id: sessionId,
      status: 'RINGING',
      partner_id: partnerId,
    };
  }
}

export class RecordCallConnectionUseCase {
  constructor(private readonly conversationRepo: ConversationRepository) {}

  public async execute(
    userAId: string,
    userBId: string,
    matchId?: string,
    lastMessageText?: string,
    lastMessageSenderId?: string
  ): Promise<Conversation> {
    let conv = await this.conversationRepo.findByParticipants(userAId, userBId);
    if (!conv) {
      conv = Conversation.create(userAId, userBId, matchId, lastMessageText, lastMessageSenderId);
    } else {
      conv.recordNewCall(matchId, lastMessageText, lastMessageSenderId);
    }
    return this.conversationRepo.save(conv);
  }
}
