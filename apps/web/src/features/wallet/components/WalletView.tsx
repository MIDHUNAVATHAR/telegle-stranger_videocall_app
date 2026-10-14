import React, { useState } from 'react';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { Badge } from '../../../shared/components/Badge';
import { IconBolt } from '../../../shared/components/Icons';

interface WalletViewProps {
  coins: number;
  onAddCoins: (amount: number) => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ coins, onAddCoins }) => {
  const [dailyClaimed, setDailyClaimed] = useState(false);

  const handleClaimDaily = () => {
    if (!dailyClaimed) {
      onAddCoins(50);
      setDailyClaimed(true);
    }
  };

  const PACKAGES = [
    { id: 'p1', amount: 100, price: '$0.99', popular: false },
    { id: 'p2', amount: 550, price: '$4.99', popular: true, bonus: '+10% Bonus' },
    { id: 'p3', amount: 1200, price: '$9.99', popular: false, bonus: '+20% Bonus' },
    { id: 'p4', amount: 3000, price: '$19.99', popular: false, bonus: '+35% VIP' },
  ];

  return (
    <div data-ui style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-20)' }}>
      {/* Wallet Balance Card */}
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
          Available Balance
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
          }}
        >
          <IconBolt size={32} /> {coins} Coins
        </h1>

        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <Badge variant="accent">VIP Level 1</Badge>
          <Badge variant="default">Instant Delivery</Badge>
        </div>

        {/* Daily Reward Box */}
        <div
          style={{
            width: '100%',
            marginTop: 'var(--space-16)',
            padding: 'var(--space-16)',
            backgroundColor: 'var(--surface)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ textAlign: 'left' }}>
            <strong style={{ fontSize: 'var(--step-body)', display: 'block' }}>
              Daily Login Streak
            </strong>
            <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
              Claim +50 Free Coins today
            </span>
          </div>
          <Button
            variant={dailyClaimed ? 'secondary' : 'primary'}
            size="sm"
            disabled={dailyClaimed}
            onClick={handleClaimDaily}
          >
            {dailyClaimed ? 'Claimed' : 'Claim +50'}
          </Button>
        </div>
      </Card>

      {/* Recharge Packages */}
      <div>
        <h2
          style={{
            fontSize: 'var(--step-lead)',
            fontWeight: 700,
            marginBottom: 'var(--space-12)',
          }}
        >
          Recharge Coins
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '12px',
          }}
        >
          {PACKAGES.map((pkg) => (
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
              {pkg.bonus && (
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
                  {pkg.bonus}
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
                <IconBolt size={18} /> {pkg.amount}
              </strong>
              <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
                Coins
              </span>
              <Button
                variant="secondary"
                size="sm"
                fullWidth
                style={{ marginTop: '8px' }}
                onClick={() => onAddCoins(pkg.amount)}
              >
                {pkg.price}
              </Button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
