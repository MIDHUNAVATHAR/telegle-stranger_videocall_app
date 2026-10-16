import mongoose, { Types } from 'mongoose';
import { IBlockEntity, IReportEntity } from '../../../domain/entities/Report';
import { IModerationRepository } from '../../../domain/repositories/ModerationRepository';
import { BlockModel, IBlockDocument, IReportDocument, ReportModel } from '../mongoose/ModerationModel';

function toDbId(id?: string): Types.ObjectId | string | undefined {
  if (!id) return undefined;
  if (Types.ObjectId.isValid(id) && id.length === 24 && !id.includes('-')) {
    return new Types.ObjectId(id);
  }
  return id;
}

export class MongooseModerationRepository implements IModerationRepository {
  private inMemoryReports: IReportEntity[] = [];
  private inMemoryBlocks = new Map<string, IBlockEntity>();

  public clearInMemoryStore(): void {
    this.inMemoryReports = [];
    this.inMemoryBlocks.clear();
  }

  private mapReport(doc: IReportDocument): IReportEntity {
    return {
      id: doc._id.toString(),
      reporterId: doc.reporter_id.toString(),
      reportedUserId: doc.reported_user_id.toString(),
      matchSessionId: doc.match_id ? doc.match_id.toString() : undefined,
      reason: doc.reason as IReportEntity['reason'],
      details: doc.details,
      status: doc.status as IReportEntity['status'],
      actionTaken: doc.action_taken as IReportEntity['actionTaken'],
      createdAt: doc.created_at,
    };
  }

  private mapBlock(doc: IBlockDocument): IBlockEntity {
    return {
      id: doc._id.toString(),
      userId: doc.user_id.toString(),
      blockedUserId: doc.blocked_user_id.toString(),
      reason: doc.reason as IBlockEntity['reason'],
      expiresAt: doc.expires_at,
      createdAt: doc.created_at,
    };
  }

  async createReport(report: Omit<IReportEntity, 'id' | 'createdAt'>): Promise<IReportEntity> {
    if (mongoose.connection.readyState === 1) {
      const doc = await ReportModel.create({
        reporter_id: toDbId(report.reporterId),
        reported_user_id: toDbId(report.reportedUserId),
        match_id: toDbId(report.matchSessionId),
        reason: report.reason,
        details: report.details,
        status: report.status,
        action_taken: report.actionTaken,
      });
      return this.mapReport(doc);
    }

    const created: IReportEntity = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...report,
      createdAt: new Date(),
    };
    this.inMemoryReports.push(created);
    return created;
  }

  async createBlock(block: Omit<IBlockEntity, 'id' | 'createdAt'>): Promise<IBlockEntity> {
    if (mongoose.connection.readyState === 1) {
      const userObjectId = toDbId(block.userId);
      const blockedObjectId = toDbId(block.blockedUserId);

      const doc = await BlockModel.findOneAndUpdate(
        { user_id: userObjectId, blocked_user_id: blockedObjectId },
        {
          reason: block.reason,
          expires_at: block.expiresAt,
          created_at: new Date(),
        },
        { upsert: true, new: true }
      );
      return this.mapBlock(doc);
    }

    const key = `${block.userId}:${block.blockedUserId}`;
    const created: IBlockEntity = {
      id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      ...block,
      createdAt: new Date(),
    };
    this.inMemoryBlocks.set(key, created);
    return created;
  }

  async deleteBlock(userId: string, blockedUserId: string): Promise<boolean> {
    if (mongoose.connection.readyState === 1) {
      const res = await BlockModel.deleteOne({
        user_id: toDbId(userId),
        blocked_user_id: toDbId(blockedUserId),
      });
      return (res.deletedCount || 0) > 0;
    }

    const key = `${userId}:${blockedUserId}`;
    return this.inMemoryBlocks.delete(key);
  }

  async listBlocks(userId: string): Promise<IBlockEntity[]> {
    const now = new Date();
    if (mongoose.connection.readyState === 1) {
      const docs = await BlockModel.find({
        user_id: toDbId(userId),
        $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
      });
      return docs.map((d) => this.mapBlock(d));
    }

    return Array.from(this.inMemoryBlocks.values()).filter((b) => {
      if (b.userId !== userId) return false;
      if (b.expiresAt && b.expiresAt.getTime() <= now.getTime()) return false;
      return true;
    });
  }

  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    const now = new Date();
    if (mongoose.connection.readyState === 1) {
      const aObj = toDbId(userAId);
      const bObj = toDbId(userBId);

      const count = await BlockModel.countDocuments({
        $and: [
          {
            $or: [
              { user_id: aObj, blocked_user_id: bObj },
              { user_id: bObj, blocked_user_id: aObj },
            ],
          },
          {
            $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
          },
        ],
      });
      return count > 0;
    }

    const key1 = `${userAId}:${userBId}`;
    const key2 = `${userBId}:${userAId}`;

    const b1 = this.inMemoryBlocks.get(key1);
    if (b1 && (!b1.expiresAt || b1.expiresAt.getTime() > now.getTime())) {
      return true;
    }

    const b2 = this.inMemoryBlocks.get(key2);
    if (b2 && (!b2.expiresAt || b2.expiresAt.getTime() > now.getTime())) {
      return true;
    }

    return false;
  }

  async checkBlockStatus(userAId: string, userBId: string): Promise<{ isBlockedByA: boolean; isBlockedByB: boolean }> {
    const now = new Date();
    if (mongoose.connection.readyState === 1) {
      const aObj = toDbId(userAId);
      const bObj = toDbId(userBId);

      const [byA, byB] = await Promise.all([
        BlockModel.countDocuments({
          user_id: aObj,
          blocked_user_id: bObj,
          $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
        }),
        BlockModel.countDocuments({
          user_id: bObj,
          blocked_user_id: aObj,
          $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
        }),
      ]);

      return {
        isBlockedByA: byA > 0,
        isBlockedByB: byB > 0,
      };
    }

    const key1 = `${userAId}:${userBId}`;
    const key2 = `${userBId}:${userAId}`;

    const b1 = this.inMemoryBlocks.get(key1);
    const b2 = this.inMemoryBlocks.get(key2);

    const isAValid = b1 ? (!b1.expiresAt || b1.expiresAt.getTime() > now.getTime()) : false;
    const isBValid = b2 ? (!b2.expiresAt || b2.expiresAt.getTime() > now.getTime()) : false;

    return {
      isBlockedByA: isAValid,
      isBlockedByB: isBValid,
    };
  }
}
