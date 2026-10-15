import { ReportReason } from '@donkey-play/shared-types';
import { getRedisClient } from '../../../../config/redis';
import { UserRepository } from '../../../users/domain/repositories/UserRepository';
import { IBlockEntity, IReportEntity } from '../../domain/entities/Report';
import {
  BlockNotFoundError,
  CannotBlockSelfError,
  CannotReportSelfError,
} from '../../domain/errors/ModerationErrors';
import { IModerationRepository } from '../../domain/repositories/ModerationRepository';

export class ModerationUseCases {
  constructor(
    private readonly moderationRepository: IModerationRepository,
    private readonly userRepository?: UserRepository
  ) {}

  async reportUser(params: {
    reporterId: string;
    targetUserId: string;
    matchSessionId?: string;
    reason: ReportReason;
    details?: string;
  }): Promise<{ report: IReportEntity; autoBanned: boolean }> {
    const { reporterId, targetUserId, matchSessionId, reason, details } = params;

    if (reporterId === targetUserId) {
      throw new CannotReportSelfError();
    }

    const now = Date.now();
    const mutualBlockExpiry = new Date(now + 24 * 60 * 60 * 1000); // 24 hours

    // 1. Enforce 24-hour mutual block between reporter and target
    const redis = getRedisClient();
    await Promise.all([
      this.moderationRepository.createBlock({
        userId: reporterId,
        blockedUserId: targetUserId,
        reason: 'POST_REPORT_AUTO',
        expiresAt: mutualBlockExpiry,
      }),
      this.moderationRepository.createBlock({
        userId: targetUserId,
        blockedUserId: reporterId,
        reason: 'POST_REPORT_AUTO',
        expiresAt: mutualBlockExpiry,
      }),
      redis.sadd(`block:${reporterId}`, targetUserId),
      redis.sadd(`block:${targetUserId}`, reporterId),
      redis.expire(`block:${reporterId}`, 86400),
      redis.expire(`block:${targetUserId}`, 86400),
    ]);

    // 2. Rolling 1-hour Redis tracking & automatic 24-hour ban rule (5 unique reports)
    const redisKey = `reports:target:${targetUserId}`;
    const oneHourAgo = now - 3600 * 1000;

    // Add reporter to sorted set with timestamp score
    await redis.zadd(redisKey, now, reporterId);
    // Remove reports older than 1 hour
    await redis.zremrangebyscore(redisKey, 0, oneHourAgo);
    // Count unique reports in the past 1 hour
    const uniqueReportCount = await redis.zcard(redisKey);

    let actionTaken: 'MUTUAL_BLOCK_24H' | 'AUTO_BAN_24H' = 'MUTUAL_BLOCK_24H';
    let autoBanned = false;

    if (uniqueReportCount >= 5) {
      actionTaken = 'AUTO_BAN_24H';
      autoBanned = true;

      // Drop banned user from online presence
      await redis.srem('presence:online_users', targetUserId);

      // If user repo is available, set ban on user entity
      if (this.userRepository) {
        const targetUser = await this.userRepository.findById(targetUserId);
        if (targetUser) {
          targetUser.applyBan(24 * 3600); // 24 hours ban
          await this.userRepository.save(targetUser);
        }
      }
    }

    // 3. Save report in repository
    const report = await this.moderationRepository.createReport({
      reporterId,
      reportedUserId: targetUserId,
      matchSessionId,
      reason,
      details,
      status: autoBanned ? 'ACTIONED' : 'PENDING',
      actionTaken,
    });

    return { report, autoBanned };
  }

  async blockUser(userId: string, targetUserId: string): Promise<IBlockEntity> {
    if (userId === targetUserId) {
      throw new CannotBlockSelfError();
    }

    const redis = getRedisClient();
    await redis.sadd(`block:${userId}`, targetUserId);

    return this.moderationRepository.createBlock({
      userId,
      blockedUserId: targetUserId,
      reason: 'USER_INITIATED',
      expiresAt: null, // Permanent user block
    });
  }

  async unblockUser(userId: string, targetUserId: string): Promise<void> {
    const deleted = await this.moderationRepository.deleteBlock(userId, targetUserId);
    if (!deleted) {
      throw new BlockNotFoundError();
    }

    const redis = getRedisClient();
    await redis.srem(`block:${userId}`, targetUserId);
  }

  async listBlocks(userId: string): Promise<IBlockEntity[]> {
    return this.moderationRepository.listBlocks(userId);
  }

  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    return this.moderationRepository.isBlocked(userAId, userBId);
  }
}
