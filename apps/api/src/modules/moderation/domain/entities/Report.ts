import { ReportReason } from '@donkey-play/shared-types';

export interface IReportEntity {
  id: string;
  reporterId: string;
  reportedUserId: string;
  matchSessionId?: string;
  reason: ReportReason;
  details?: string;
  status: 'PENDING' | 'ACTIONED' | 'DISMISSED';
  actionTaken: 'NONE' | 'MUTUAL_BLOCK_24H' | 'AUTO_BAN_24H' | 'PERMANENT_BAN';
  createdAt: Date;
}

export interface IBlockEntity {
  id: string;
  userId: string;
  blockedUserId: string;
  reason: 'USER_INITIATED' | 'POST_REPORT_AUTO';
  expiresAt?: Date | null;
  createdAt: Date;
}
