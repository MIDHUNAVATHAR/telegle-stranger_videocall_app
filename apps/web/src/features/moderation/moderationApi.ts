import { api } from '../../shared/api/client';
import {
  IBlockUserRequest,
  IReportRequest,
} from '@donkey-play/shared-types';

export const moderationApi = {
  reportUser: (payload: IReportRequest) =>
    api.post<{
      reportId: string;
      actionTaken: string;
      autoBanned: boolean;
      createdAt: string;
    }>('/moderation/reports', payload),

  blockUser: (payload: IBlockUserRequest) =>
    api.post<{ id: string; blockedUserId: string }>('/moderation/blocks', payload),

  unblockUser: (targetUserId: string) =>
    api.delete<{ success: boolean; message: string }>(`/moderation/blocks/${targetUserId}`),

  listBlocks: () =>
    api.get<Array<{ id: string; blockedUserId: string; createdAt: string }>>('/moderation/blocks'),
};
