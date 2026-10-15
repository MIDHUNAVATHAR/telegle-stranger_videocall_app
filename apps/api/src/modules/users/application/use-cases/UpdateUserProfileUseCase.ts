import { UserRepository } from '../../domain/repositories/UserRepository';
import { User, UserGender } from '../../domain/entities/User';
import { UserNotFoundError } from '../../domain/errors/UserErrors';

export interface UpdateUserProfileInput {
  userId: string;
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

    user.updateProfile({
      displayName: input.displayName,
      bio: input.bio,
      gender: input.gender,
      age: input.age,
      avatarUrl: input.avatarUrl,
    });

    return this.userRepository.save(user);
  }
}
