import { UserRepository } from '../../domain/repositories/UserRepository';
import { User, UserGender } from '../../domain/entities/User';
import { UserNotFoundError, UserAlreadyExistsError } from '../../domain/errors/UserErrors';

export interface UpdateUserProfileInput {
  userId: string;
  username?: string;
  displayName?: string;
  bio?: string;
  gender?: UserGender;
  age?: number;
  avatarUrl?: string;
}

export class UpdateUserProfileUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  public async execute(input: UpdateUserProfileInput): Promise<User> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    if (input.username) {
      const cleanUsername = input.username.trim();
      if (cleanUsername.toLowerCase() !== user.username.toLowerCase()) {
        const isTaken = await this.userRepository.existsByUsername(cleanUsername, user.id);
        if (isTaken) {
          throw new UserAlreadyExistsError(`Username "${cleanUsername}" is already taken`);
        }
      }
    }

    user.updateProfile({
      username: input.username,
      displayName: input.displayName || input.username,
      bio: input.bio,
      gender: input.gender,
      age: input.age,
      avatarUrl: input.avatarUrl,
    });

    return this.userRepository.save(user);
  }
}
