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

  public async existsByUsername(username: string, excludeUserId?: string): Promise<boolean> {
    const clean = username.trim().toLowerCase();
    for (const user of this.users.values()) {
      if (excludeUserId && user.id === excludeUserId) continue;
      if (user.username.toLowerCase() === clean) {
        return true;
      }
    }
    return false;
  }

  public async searchByUsername(query: string, excludeUserId?: string): Promise<User[]> {
    const clean = query.trim().toLowerCase().replace(/^@/, '');
    if (!clean) return [];
    const results: User[] = [];
    for (const user of this.users.values()) {
      if (excludeUserId && user.id === excludeUserId) continue;
      if (user.isBanned) continue;
      if (user.username.toLowerCase().includes(clean)) {
        results.push(user);
      }
      if (results.length >= 10) break;
    }
    return results;
  }

  public async save(user: User): Promise<User> {
    this.users.set(user.id, user);
    return user;
  }

  public clear(): void {
    this.users.clear();
  }
}
