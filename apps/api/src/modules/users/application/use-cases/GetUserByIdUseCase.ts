import { UserNotFoundError } from '../../domain/errors/UserErrors';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { UserResponseDTO } from '../dto/UserDTOs';

export class GetUserByIdUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  public async execute(userId: string): Promise<UserResponseDTO> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(userId);
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      karmaScore: user.karmaScore,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
