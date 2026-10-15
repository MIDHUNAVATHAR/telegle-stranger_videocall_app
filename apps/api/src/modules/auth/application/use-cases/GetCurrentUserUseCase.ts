import { UserRepository } from '../../../users/domain/repositories/UserRepository';
import { User } from '../../../users/domain/entities/User';
import { NotFoundError } from '../../../../common/errors/AppError';
import { AccountBannedError } from '../../domain/errors/AuthErrors';

export class GetCurrentUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  public async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    if (user.isBanned) {
      throw new AccountBannedError(user.bannedUntil);
    }

    return user;
  }
}
