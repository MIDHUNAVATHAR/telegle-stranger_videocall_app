import React from 'react';
import { Modal } from '../../../shared/components/Modal';
import { IconBolt, IconGift } from '../../../shared/components/Icons';
import { AVAILABLE_GIFTS } from '../../../shared/constants';
import { VirtualGift } from '../../../shared/types';

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: number;
  onSendGift: (gift: VirtualGift) => void;
}

export const GiftModal: React.FC<GiftModalProps> = ({
  isOpen,
  onClose,
  coins,
  onSendGift,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Virtual Gift">
      <div data-ui style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-20)' }}>
        {/* Coin Balance Chip */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-12) var(--space-16)',
            backgroundColor: 'var(--surface-raised)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <span style={{ fontSize: 'var(--step-small)', color: 'var(--ink-secondary)' }}>
            Your Balance
          </span>
          <strong
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--step-lead)',
              color: 'var(--accent)',
            }}
          >
            <IconBolt size={18} /> {coins} Coins
          </strong>
        </div>

        {/* Gift Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '12px',
          }}
        >
          {AVAILABLE_GIFTS.map((gift) => {
            const canAfford = coins >= gift.cost;
            return (
              <button
                key={gift.id}
                disabled={!canAfford}
                onClick={() => {
                  onSendGift(gift);
                  onClose();
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: 'var(--space-16)',
                  backgroundColor: 'var(--surface-raised)',
                  borderRadius: 'var(--radius-md)',
                  opacity: canAfford ? 1 : 0.45,
                  cursor: canAfford ? 'pointer' : 'not-allowed',
                  transition: 'background-color var(--t-quick) ease, transform var(--t-press) ease',
                  textAlign: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                  }}
                >
                  <IconGift size={24} />
                </div>
                <span
                  style={{
                    fontSize: 'var(--step-small)',
                    fontWeight: 700,
                    color: 'var(--ink)',
                  }}
                >
                  {gift.name}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: 'var(--step-small)',
                    color: 'var(--accent)',
                    fontWeight: 700,
                  }}
                >
                  <IconBolt size={14} /> {gift.cost} Coins
                </span>
              </button>
            );
          })}
        </div>

        {coins < 50 && (
          <p
            style={{
              fontSize: 'var(--step-small)',
              color: 'var(--ink-tertiary)',
              textAlign: 'center',
            }}
          >
            Low on coins? Head to the Wallet tab to recharge or claim daily rewards.
          </p>
        )}
      </div>
    </Modal>
  );
};
