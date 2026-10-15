import { describe, expect, it } from 'vitest';
import { walletApi } from './walletApi';
import { WalletView } from './components/WalletView';

describe('Frontend Wallet & Razorpay Module', () => {
  it('exports WalletView component', () => {
    expect(WalletView).toBeDefined();
  });

  it('exposes wallet REST API client methods including UPI and withdrawals', () => {
    expect(typeof walletApi.getBalance).toBe('function');
    expect(typeof walletApi.getPackages).toBe('function');
    expect(typeof walletApi.createOrder).toBe('function');
    expect(typeof walletApi.verifyPayment).toBe('function');
    expect(typeof walletApi.getTransactions).toBe('function');
    expect(typeof walletApi.updateUpiId).toBe('function');
    expect(typeof walletApi.withdraw).toBe('function');
  });
});
