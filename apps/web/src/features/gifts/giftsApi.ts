import {
  ApiResponse,
  IGiftSendRequest,
  IGiftSendResponse,
  IVirtualGift,
} from '@donkey-play/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const giftsApi = {
  async listGifts(): Promise<IVirtualGift[]> {
    const res = await fetch(`${API_BASE}/gifts`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const json: ApiResponse<IVirtualGift[]> = await res.json();
    if (!res.ok) {
      const errPayload = json as unknown as { error?: { message?: string } };
      throw new Error(errPayload.error?.message || 'Failed to fetch gift catalog');
    }
    return json.data;
  },

  async sendGift(payload: IGiftSendRequest): Promise<IGiftSendResponse> {
    const res = await fetch(`${API_BASE}/gifts/send`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json: ApiResponse<IGiftSendResponse> = await res.json();
    if (!res.ok) {
      const errPayload = json as unknown as { error?: { message?: string } };
      throw new Error(errPayload.error?.message || 'Failed to send virtual gift');
    }
    return json.data;
  },
};
