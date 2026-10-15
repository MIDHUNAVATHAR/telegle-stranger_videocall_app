import { describe, expect, it } from 'vitest';
import { walletApi } from './walletApi';
import { WalletView } from './components/WalletView';

describe('Frontend Wallet & Razorpay Module', () => {
  it('exports WalletView component', () => {
    expect(WalletView).toBeDefined();
  });

  it('exposes wallet REST API client methods', () => {
    expect(typeof walletApi.getBalance).toBe('function');
    expect(typeof walletApi.getPackages).toBe('function');
    expect(typeof walletApi.createOrder).toBe('function');
    expect(typeof walletApi.verifyPayment).toBe('function');
    expect(typeof walletApi.getTransactions).toBe('function');
  });

  it('strictly adheres to zero withdrawals invariant (no withdrawal client method)', () => {
    const untypedWalletApi = walletApi as unknown as Record<string, unknown>;
    expect(untypedWalletApi.requestWithdrawal).toBeUndefined();
    expect(untypedWalletApi.submitUpiPayout).toBeUndefined();
  });
});
