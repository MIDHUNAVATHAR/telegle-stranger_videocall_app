'use client';

import React, { useEffect, useState } from 'react';
import { IVirtualGift } from '@donkey-play/shared-types';
import { Modal } from '../../../shared/components/Modal';
import { IconBolt, IconGift } from '../../../shared/components/Icons';
import { VirtualGift } from '../../../shared/types';
import { giftsApi } from '../giftsApi';

const DEFAULT_GIFTS: IVirtualGift[] = [
  { id: 'gift_rose_10c', name: 'Rose', slug: 'rose-10c', coinPrice: 10, creatorEarningPaise: 700, iconUrl: '🌹' },
  { id: 'gift_heart_25c', name: 'Heart Glow', slug: 'heart-25c', coinPrice: 25, creatorEarningPaise: 1750, iconUrl: '💖' },
  { id: 'gift_sparkler_50c', name: 'Sparkler', slug: 'sparkler-50c', coinPrice: 50, creatorEarningPaise: 3500, iconUrl: '✨' },
  { id: 'gift_crown_200c', name: 'Royal Crown', slug: 'crown-200c', coinPrice: 200, creatorEarningPaise: 14000, iconUrl: '👑' },
];

interface GiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  coins: number;
  recipientUserId?: string;
  matchSessionId?: string;
  onSendGift: (gift: VirtualGift) => void;
}

export const GiftModal: React.FC<GiftModalProps> = ({
  isOpen,
  onClose,
  coins,
  recipientUserId,
  matchSessionId,
  onSendGift,
}) => {
  const [gifts, setGifts] = useState<IVirtualGift[]>(DEFAULT_GIFTS);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      giftsApi
        .listGifts()
        .then((fetched) => {
          if (fetched && fetched.length > 0) setGifts(fetched);
        })
        .catch(() => {
          // Keep defaults
        });
    }
  }, [isOpen]);

  const handleGiftClick = async (gift: IVirtualGift) => {
    if (coins < gift.coinPrice) return;
    setIsSending(true);
    setErrorMessage(null);

    try {
      if (recipientUserId) {
        await giftsApi.sendGift({
          giftSlug: gift.slug,
          recipientUserId,
          matchSessionId,
        });
      }

      onSendGift({
        id: gift.slug,
        name: gift.name,
        cost: gift.coinPrice,
        icon: gift.iconUrl,
        description: `70% creator share (₹${(gift.creatorEarningPaise / 100).toFixed(2)})`,
      });
      onClose();
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || 'Failed to send gift');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Send Virtual Gift">
      <div data-ui style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-20)' }}>
        {errorMessage && (
          <div
            role="alert"
            style={{
              padding: '10px 14px',
              backgroundColor: '#7f1d1d',
              color: '#fff',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--step-small)',
              textAlign: 'center',
            }}
          >
            {errorMessage}
          </div>
        )}

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
            Your Coin Balance
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
          {gifts.map((gift) => {
            const canAfford = coins >= gift.coinPrice;
            return (
              <button
                key={gift.id || gift.slug}
                disabled={!canAfford || isSending}
                onClick={() => handleGiftClick(gift)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: 'var(--space-16)',
                  backgroundColor: 'var(--surface-raised)',
                  borderRadius: 'var(--radius-md)',
                  opacity: canAfford ? 1 : 0.45,
                  cursor: canAfford && !isSending ? 'pointer' : 'not-allowed',
                  transition: 'background-color var(--t-quick) ease, transform var(--t-press) ease',
                  textAlign: 'center',
                  gap: '8px',
                  border: '1px solid #1e2230',
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
                    fontSize: '24px',
                  }}
                >
                  {gift.iconUrl ? gift.iconUrl : <IconGift size={24} />}
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
                  <IconBolt size={14} /> {gift.coinPrice} Coins
                </span>
                <span style={{ fontSize: '11px', color: '#10b981' }}>
                  Creator earns ₹{(gift.creatorEarningPaise / 100).toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>

        {coins < 10 && (
          <p
            style={{
              fontSize: 'var(--step-small)',
              color: 'var(--ink-tertiary)',
              textAlign: 'center',
            }}
          >
            Low on coins? Head to the Wallet tab to recharge.
          </p>
        )}
      </div>
    </Modal>
  );
};
