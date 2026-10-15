import Redis from 'ioredis';
import { getRedisClient } from '../../../../config/redis';
import { logger } from '../../../../common/logger';

export class PresenceService {
  constructor(private readonly redis: Redis = getRedisClient()) {}

  public async recordHeartbeat(userId: string): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.sadd('presence:online_users', userId);
      pipeline.setex(`presence:heartbeat:${userId}`, 60, '1');
      await pipeline.exec();
    } catch (error) {
      logger.error(`Failed to record heartbeat for user ${userId}`, { error });
    }
  }

  public async removeHeartbeat(userId: string): Promise<void> {
    try {
      const pipeline = this.redis.pipeline();
      pipeline.srem('presence:online_users', userId);
      pipeline.del(`presence:heartbeat:${userId}`);
      await pipeline.exec();
    } catch (error) {
      logger.error(`Failed to remove heartbeat for user ${userId}`, { error });
    }
  }

  public async getOnlineCount(): Promise<number> {
    try {
      const count = await this.redis.scard('presence:online_users');
      return count;
    } catch (error) {
      logger.error('Failed to get online users count from Redis', { error });
      return 0;
    }
  }

  public async isUserOnline(userId: string): Promise<boolean> {
    try {
      const exists = await this.redis.exists(`presence:heartbeat:${userId}`);
      return exists === 1;
    } catch {
      return false;
    }
  }

  public async sweepInactive(): Promise<number> {
    try {
      const users = await this.redis.smembers('presence:online_users');
      if (!users || users.length === 0) return 0;

      let swept = 0;
      for (const userId of users) {
        const isAlive = await this.redis.exists(`presence:heartbeat:${userId}`);
        if (!isAlive) {
          await this.redis.srem('presence:online_users', userId);
          swept++;
        }
      }

      return swept;
    } catch (error) {
      logger.error('Failed to execute presence inactive sweep', { error });
      return 0;
    }
  }
}
