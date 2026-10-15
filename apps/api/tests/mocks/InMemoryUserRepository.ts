import { User } from '../../src/modules/users/domain/entities/User';
import { UserRepository } from '../../src/modules/users/domain/repositories/UserRepository';

export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();

  public async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const normalized = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email.toLowerCase() === normalized) {
        return user;
      }
    }
    return null;
  }

  public async findByUsername(username: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  public async findByGoogleId(googleId: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.googleId === googleId) {
        return user;
      }
    }
    return null;
  }

  public async existsByEmail(email: string): Promise<boolean> {
    return (await this.findByEmail(email)) !== null;
  }

  public async existsByUsername(username: string): Promise<boolean> {
    return (await this.findByUsername(username)) !== null;
  }

  public async save(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  public clear(): void {
    this.users.clear();
  }
}
