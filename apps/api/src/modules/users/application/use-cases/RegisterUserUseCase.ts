import { User } from '../../domain/entities/User';
import { UserAlreadyExistsError } from '../../domain/errors/UserErrors';
import { UserRepository } from '../../domain/repositories/UserRepository';
import { CreateUserInputDTO, UserResponseDTO } from '../dto/UserDTOs';

export class RegisterUserUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  public async execute(input: CreateUserInputDTO): Promise<UserResponseDTO> {
    const emailExists = await this.userRepository.existsByEmail(input.email.trim().toLowerCase());
    if (emailExists) {
      throw new UserAlreadyExistsError(input.email);
    }

    const usernameExists = await this.userRepository.existsByUsername(input.username.trim());
    if (usernameExists) {
      throw new UserAlreadyExistsError(input.username);
    }

    const user = User.create({
      username: input.username,
      email: input.email,
      bio: input.bio,
    });

    const savedUser = await this.userRepository.save(user);

    return {
      id: savedUser.id,
      username: savedUser.username,
      email: savedUser.email,
      bio: savedUser.bio,
      karmaScore: savedUser.karmaScore,
      isActive: savedUser.isActive,
      createdAt: savedUser.createdAt.toISOString(),
      updatedAt: savedUser.updatedAt.toISOString(),
    };
  }
}
