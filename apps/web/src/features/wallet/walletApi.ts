import {
  ApiResponse,
  ICoinPackage,
  ICreateRazorpayOrderResponse,
  IVerifyPaymentRequest,
  IWalletBalance,
  IWalletTransaction,
} from '@donkey-play/shared-types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

export const walletApi = {
  async getBalance(): Promise<IWalletBalance> {
    const res = await fetch(`${API_BASE}/wallet/balance`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const json: ApiResponse<IWalletBalance> = await res.json();
    if (!res.ok) {
      const errPayload = json as unknown as { error?: { message?: string } };
      throw new Error(errPayload.error?.message || 'Failed to fetch wallet balance');
    }
    return json.data;
  },

  async getPackages(): Promise<ICoinPackage[]> {
    const res = await fetch(`${API_BASE}/wallet/packages`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const json: ApiResponse<ICoinPackage[]> = await res.json();
    if (!res.ok) {
      const errPayload = json as unknown as { error?: { message?: string } };
      throw new Error(errPayload.error?.message || 'Failed to fetch coin packages');
    }
    return json.data;
  },

  async createOrder(packageId: string): Promise<ICreateRazorpayOrderResponse> {
    const res = await fetch(`${API_BASE}/wallet/orders`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageId }),
    });
    const json: ApiResponse<ICreateRazorpayOrderResponse> = await res.json();
    if (!res.ok) {
      const errPayload = json as unknown as { error?: { message?: string } };
      throw new Error(errPayload.error?.message || 'Failed to create payment order');
    }
    return json.data;
  },

  async verifyPayment(params: IVerifyPaymentRequest): Promise<{
    purchasedCoinsBalance: number;
    withdrawableEarningsPaise: number;
    transaction: IWalletTransaction;
  }> {
    const res = await fetch(`${API_BASE}/wallet/orders/verify`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const json = (await res.json()) as {
      success: boolean;
      data: {
        purchasedCoinsBalance: number;
        withdrawableEarningsPaise: number;
        transaction: IWalletTransaction;
      };
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message || 'Payment verification failed');
    return json.data;
  },

  async getTransactions(page: number = 1, limit: number = 20): Promise<{
    transactions: IWalletTransaction[];
    meta?: { page?: number; limit?: number; total?: number };
  }> {
    const res = await fetch(`${API_BASE}/wallet/transactions?page=${page}&limit=${limit}`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });
    const json: ApiResponse<IWalletTransaction[]> = await res.json();
    if (!res.ok) {
      const errPayload = json as unknown as { error?: { message?: string } };
      throw new Error(errPayload.error?.message || 'Failed to fetch transactions');
    }
    return {
      transactions: json.data,
      meta: json.meta,
    };
  },
};
