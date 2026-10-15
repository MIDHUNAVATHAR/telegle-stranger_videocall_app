import { IBlockEntity, IReportEntity } from '../entities/Report';

export interface IModerationRepository {
  createReport(report: Omit<IReportEntity, 'id' | 'createdAt'>): Promise<IReportEntity>;
  createBlock(block: Omit<IBlockEntity, 'id' | 'createdAt'>): Promise<IBlockEntity>;
  deleteBlock(userId: string, blockedUserId: string): Promise<boolean>;
  listBlocks(userId: string): Promise<IBlockEntity[]>;
  isBlocked(userAId: string, userBId: string): Promise<boolean>;
}
