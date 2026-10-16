import { MatchmakingService, JoinQueueResult } from '../../infrastructure/services/MatchmakingService';
import { UserRepository } from '../../../users/domain/repositories/UserRepository';
import { UserNotFoundError } from '../../../users/domain/errors/UserErrors';
import { IWalletRepository } from '../../../wallet/domain/repositories/WalletRepository';

export interface JoinQueueInput {
  userId: string;
  filter: 'ANY' | 'MALE' | 'FEMALE';
}

export class JoinQueueUseCase {
  constructor(
    private readonly matchmakingService: MatchmakingService,
    private readonly userRepository: UserRepository,
    private readonly walletRepository?: IWalletRepository
  ) {}

  public async execute(input: JoinQueueInput): Promise<JoinQueueResult> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    let coinBalance = 100;
    if (this.walletRepository) {
      try {
        const wallet = await this.walletRepository.createOrGet(user.id);
        coinBalance = wallet.purchasedCoinsBalance;
      } catch (err) {
        if (input.filter !== 'ANY') {
          throw err;
        }
      }
    }

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
