import {
  ApiResponse,
  IBlockUserRequest,
  IReportRequest,
} from '@donkey-play/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const moderationApi = {
  async reportUser(payload: IReportRequest): Promise<{
    reportId: string;
    actionTaken: string;
    autoBanned: boolean;
    createdAt: string;
  }> {
    const res = await fetch(`${API_BASE}/moderation/reports`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Failed to submit report');
    return json.data;
  },

  async blockUser(payload: IBlockUserRequest): Promise<{ id: string; blockedUserId: string }> {
    const res = await fetch(`${API_BASE}/moderation/blocks`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Failed to block user');
    return json.data;
  },

  async unblockUser(targetUserId: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/moderation/blocks/${targetUserId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error?.message || 'Failed to unblock user');
    return true;
  },

  async listBlocks(): Promise<Array<{ id: string; blockedUserId: string; createdAt: string }>> {
    const res = await fetch(`${API_BASE}/moderation/blocks`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const json: ApiResponse<Array<{ id: string; blockedUserId: string; createdAt: string }>> =
      await res.json();
    if (!res.ok) {
      const errPayload = json as unknown as { error?: { message?: string } };
      throw new Error(errPayload.error?.message || 'Failed to list blocks');
    }
    return json.data;
  },
};
