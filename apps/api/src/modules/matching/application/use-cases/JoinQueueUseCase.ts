import { MatchmakingService, JoinQueueResult } from '../../infrastructure/services/MatchmakingService';
import { UserRepository } from '../../../users/domain/repositories/UserRepository';
import { UserNotFoundError } from '../../../users/domain/errors/UserErrors';

export interface JoinQueueInput {
  userId: string;
  filter: 'ANY' | 'MALE' | 'FEMALE';
}

export class JoinQueueUseCase {
  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly userRepository: UserRepository
  ) {}

  public async execute(input: JoinQueueInput): Promise<JoinQueueResult> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    // Default coin balance for testing/guest fallback is 100 or user karma
    // Persistent wallet balance will be integrated in Phase 7 (Wallet module)
    const coinBalance = 100;

    const result = await this.matchmakingService.joinQueue(
      user.id,
      input.filter,
      user.gender,
      coinBalance
    );

    if (result.status === 'PAIRED' && result.partnerId) {
      const partnerUser = await this.userRepository.findById(result.partnerId);
      if (partnerUser) {
        result.partner = {
          id: partnerUser.id,
          displayName: partnerUser.displayName || partnerUser.username || 'Stranger',
          username: partnerUser.username,
          avatarUrl: partnerUser.avatarUrl,
          age: partnerUser.age,
          gender: partnerUser.gender,
        };
      }
    }

    return result;
  }
}
