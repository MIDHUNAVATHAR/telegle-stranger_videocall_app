import { api } from '../../shared/api/client';
import {
  ICoinPackage,
  ICreateRazorpayOrderResponse,
  IVerifyPaymentRequest,
  IWalletBalance,
  IWalletTransaction,
} from '@donkey-play/shared-types';

export const walletApi = {
  getBalance: () => api.get<IWalletBalance>('/wallet/balance'),

  getPackages: () => api.get<ICoinPackage[]>('/wallet/packages'),

  createOrder: (packageId: string) =>
    api.post<ICreateRazorpayOrderResponse>('/wallet/orders', { packageId }),

  verifyPayment: (params: IVerifyPaymentRequest) =>
    api.post<{
      purchasedCoinsBalance: number;
      withdrawableEarningsPaise: number;
      transaction: IWalletTransaction;
    }>('/wallet/orders/verify', params),

  getTransactions: (page = 1, limit = 10) =>
    api.get<{
      transactions: IWalletTransaction[];
      total: number;
      page: number;
      limit: number;
    }>(`/wallet/transactions?page=${page}&limit=${limit}`),
};
