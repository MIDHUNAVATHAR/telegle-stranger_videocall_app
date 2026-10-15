'use client';

import React, { useEffect, useState } from 'react';
import { ICoinPackage, IWalletTransaction } from '@donkey-play/shared-types';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { IconBolt, IconClock, IconGift, IconLock } from '../../../shared/components/Icons';
import { walletApi } from '../walletApi';

const DEFAULT_PACKAGES: ICoinPackage[] = [
  { id: 'pack_starter_10', name: 'Starter Pack', baseCoins: 10, bonusCoins: 0, totalCoins: 10, pricePaise: 1000, priceInr: 10 },
  { id: 'pack_popular_50', name: 'Popular Pack', baseCoins: 50, bonusCoins: 5, totalCoins: 55, pricePaise: 5000, priceInr: 50 },
  { id: 'pack_value_100', name: 'Value Pack', baseCoins: 100, bonusCoins: 20, totalCoins: 120, pricePaise: 10000, priceInr: 100 },
  { id: 'pack_mega_500', name: 'Mega VIP Pack', baseCoins: 500, bonusCoins: 150, totalCoins: 650, pricePaise: 50000, priceInr: 500 },
];

interface WalletViewProps {
  coins?: number;
  onAddCoins?: (amount: number) => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ coins: propCoins, onAddCoins }) => {
  const [balance, setBalance] = useState<number>(propCoins ?? 0);
  const [earningsInr, setEarningsInr] = useState<number>(0);
  const [packages, setPackages] = useState<ICoinPackage[]>(DEFAULT_PACKAGES);
  const [transactions, setTransactions] = useState<IWalletTransaction[]>([]);
  const [processingPackageId, setProcessingPackageId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const fetchWalletData = async () => {
    try {
      const [balData, pkgData, txData] = await Promise.allSettled([
        walletApi.getBalance(),
        walletApi.getPackages(),
        walletApi.getTransactions(1, 5),
      ]);

      if (balData.status === 'fulfilled') {
        setBalance(balData.value.purchasedCoinsBalance);
        setEarningsInr(balData.value.withdrawableEarningsInr);
      }
      if (pkgData.status === 'fulfilled' && pkgData.value.length > 0) {
        setPackages(pkgData.value);
      }
      if (txData.status === 'fulfilled') {
        setTransactions(txData.value.transactions);
      }
    } catch {
      // Keep defaults gracefully
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handlePurchase = async (pkg: ICoinPackage) => {
    setProcessingPackageId(pkg.id);
    setStatusMessage(null);

    try {
      // 1. Create order on backend
      const order = await walletApi.createOrder(pkg.id);

      // 2. In browser environments where Razorpay SDK script is loaded:
      interface RazorpayCheckoutInstance {
        open: () => void;
      }
      const razorpayWindow = window as unknown as Window & {
        Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckoutInstance;
      };

      if (razorpayWindow.Razorpay) {
        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'Donkey Play Coins',
          description: `Purchase ${pkg.totalCoins} Coins`,
          order_id: order.orderId,
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            const verifyResult = await walletApi.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            setBalance(verifyResult.purchasedCoinsBalance);
            if (onAddCoins) onAddCoins(pkg.totalCoins);
            setStatusMessage(`Successfully recharged ${pkg.totalCoins} Coins!`);
            fetchWalletData();
          },
          theme: {
            color: '#FF5A1F',
          },
        };
        const rzp = new razorpayWindow.Razorpay(options);
        rzp.open();
      } else {
        // Fallback for development / test preview: verify with mock signature
        const verifyResult = await walletApi.verifyPayment({
          razorpayOrderId: order.orderId,
          razorpayPaymentId: `pay_${Date.now()}`,
          razorpaySignature: 'mock_valid_signature',
        });
        setBalance(verifyResult.purchasedCoinsBalance);
        if (onAddCoins) onAddCoins(pkg.totalCoins);
        setStatusMessage(`Successfully recharged ${pkg.totalCoins} Coins!`);
        fetchWalletData();
      }
    } catch (err: unknown) {
      const error = err as Error;
      setStatusMessage(`Payment failed: ${error.message || 'Unknown error'}`);
    } finally {
      setProcessingPackageId(null);
    }
  };

  return (
    <div data-ui style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-20)', padding: '16px' }}>
      {/* Feedback Banner */}
      {statusMessage && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: statusMessage.includes('failed') ? '#7f1d1d' : '#14532d',
            color: '#fff',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--step-small)',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          {statusMessage}
        </div>
      )}

      {/* Main Balance Card */}
      <Card
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          gap: 'var(--space-12)',
          padding: 'var(--space-24)',
          backgroundColor: 'var(--surface-raised)',
        }}
      >
        <span
          style={{
            fontSize: 'var(--step-small)',
            color: 'var(--ink-secondary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Purchased Coins Balance
        </span>
        <h1
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: 'var(--step-head)',
            fontWeight: 800,
            color: 'var(--accent)',
            letterSpacing: '-0.02em',
            margin: 0,
          }}
        >
          <IconBolt size={32} /> {balance} Coins
        </h1>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <Badge variant="accent">Instant Delivery</Badge>
          <Badge variant="default">Non-Cashoutable</Badge>
        </div>

        <p style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)', margin: '4px 0 0' }}>
          Use coins for gender filter matchmaking (1 coin) and sending in-call virtual gifts.
        </p>
      </Card>

      {/* Creator Earnings Card — Informational Only (Invariant: No Withdrawals) */}
      <Card
        style={{
          padding: 'var(--space-16)',
          backgroundColor: 'var(--surface)',
          border: '1px solid #1e2230',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconGift size={20} color="var(--accent)" />
            <strong style={{ fontSize: 'var(--step-body)' }}>Creator Gift Earnings</strong>
          </div>
          <Badge variant="default">Informational</Badge>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#10b981' }}>
            ₹{earningsInr.toFixed(2)}
          </span>
          <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
            earned from video call gifts
          </span>
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--ink-tertiary)',
            backgroundColor: 'var(--surface-raised)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <IconLock size={14} />
          <span>Informational balance. Withdrawals are currently disabled per platform safety policy.</span>
        </div>
      </Card>

      {/* Recharge Packages Grid */}
      <div>
        <h2
          style={{
            fontSize: 'var(--step-lead)',
            fontWeight: 700,
            marginBottom: 'var(--space-12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Recharge Coins</span>
          <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)', fontWeight: 400 }}>
            Powered by Razorpay
          </span>
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '12px',
          }}
        >
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: 'var(--space-16)',
                gap: '8px',
                position: 'relative',
              }}
            >
              {pkg.bonusCoins > 0 && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'var(--accent)',
                    color: 'var(--accent-ink)',
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  +{pkg.bonusCoins} Bonus
                </span>
              )}
              <strong
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: 'var(--step-lead)',
                  color: 'var(--ink)',
                }}
              >
                <IconBolt size={18} /> {pkg.totalCoins}
              </strong>
              <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
                Coins
              </span>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                style={{ marginTop: '8px' }}
                disabled={processingPackageId === pkg.id}
                onClick={() => handlePurchase(pkg)}
              >
                {processingPackageId === pkg.id ? 'Processing...' : `₹${pkg.priceInr}`}
              </Button>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Ledger Transactions */}
      <div>
        <h3
          style={{
            fontSize: 'var(--step-body)',
            fontWeight: 700,
            marginBottom: 'var(--space-8)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <IconClock size={16} /> Recent Transactions
        </h3>
        {transactions.length === 0 ? (
          <Card style={{ padding: 'var(--space-16)', textAlign: 'center', color: 'var(--ink-secondary)' }}>
            No recent transactions yet
          </Card>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {transactions.map((tx) => (
              <div
                key={tx.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: 'var(--surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--step-small)',
                }}
              >
                <div>
                  <strong style={{ display: 'block', color: 'var(--ink)' }}>
                    {tx.type.replace(/_/g, ' ')}
                  </strong>
                  <span style={{ color: 'var(--ink-tertiary)', fontSize: '11px' }}>
                    {new Date(tx.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontWeight: 700,
                      color: tx.coinsAmount >= 0 ? '#10b981' : 'var(--accent)',
                    }}
                  >
                    {tx.coinsAmount > 0 ? `+${tx.coinsAmount}` : tx.coinsAmount} Coins
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
