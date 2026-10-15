import { UserNotFoundError } from '../../domain/errors/UserErrors';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { User } from '../../domain/entities/User';

export class GetUserByIdUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  public async execute(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    return user;
  }
}

