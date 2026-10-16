import { User, UserGender, UserRole } from '../../domain/entities/User';
import { UserDocument } from '../persistence/mongoose/UserModel';

export class UserMapper {
  public static toDomain(doc: UserDocument): User {
    return User.reconstitute({
      id: doc.userId,
      username: doc.username,
      displayName: doc.displayName || doc.username,
      email: doc.email,
      googleId: doc.googleId,
      age: doc.age || 18,
      gender: (doc.gender as UserGender) || 'PREFER_NOT_TO_SAY',
      avatarUrl:
        doc.avatarUrl && !doc.avatarUrl.startsWith('blob:') && doc.avatarUrl !== '/logo.png'
          ? doc.avatarUrl
          : doc.gender === 'MALE'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=480&q=80',
      bio: doc.bio || '',
      role: (doc.role as UserRole) || 'USER',
      isBanned: doc.isBanned || false,
      bannedUntil: doc.bannedUntil,
      karmaScore: doc.karmaScore ?? 100,
      isActive: doc.isActive !== false,
      tokenVersion: doc.tokenVersion || 1,
      lastLoginAt: doc.lastLoginAt || doc.createdAt || new Date(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  }

  public static toPersistence(user: User): {
    userId: string;
    username: string;
    displayName: string;
    email: string;
    googleId?: string;
    age: number;
    gender: string;
    avatarUrl: string;
    bio: string;
    role: string;
    isBanned: boolean;
    bannedUntil?: Date | null;
    karmaScore: number;
    isActive: boolean;
    tokenVersion: number;
    lastLoginAt: Date;
  } {
    return {
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      googleId: user.googleId,
      age: user.age,
      gender: user.gender,
      avatarUrl: user.avatarUrl || '',
      bio: user.bio || '',
      role: user.role,
      isBanned: user.isBanned,
      bannedUntil: user.bannedUntil,
      karmaScore: user.karmaScore,
      isActive: user.isActive,
      tokenVersion: user.tokenVersion,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
