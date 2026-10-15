import { api } from '../../shared/api/client';
import {
  IGiftSendRequest,
  IGiftSendResponse,
  IVirtualGift,
} from '@donkey-play/shared-types';

export const giftsApi = {
  listGifts: () => api.get<IVirtualGift[]>('/gifts'),

  sendGift: (payload: IGiftSendRequest) =>
    api.post<IGiftSendResponse>('/gifts/send', payload),
};
