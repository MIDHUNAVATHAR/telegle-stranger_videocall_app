import { User } from '../../domain/entities/User';
import { UserDocument } from '../persistence/mongoose/UserModel';

export class UserMapper {
  public static toDomain(doc: UserDocument): User {
    return User.reconstitute({
      id: doc.userId,
      username: doc.username,
      email: doc.email,
      bio: doc.bio,
      karmaScore: doc.karmaScore,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  public static toPersistence(user: User): {
    userId: string;
    username: string;
    email: string;
    bio?: string;
    karmaScore: number;
    isActive: boolean;
  } {
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      bio: user.bio,
      karmaScore: user.karmaScore,
      isActive: user.isActive,
    };
  }
}
