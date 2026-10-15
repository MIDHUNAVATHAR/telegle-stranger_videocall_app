'use client';

import React, { useEffect, useState } from 'react';
import { IVirtualGift } from '@donkey-play/shared-types';
import { Modal } from '../../../shared/components/Modal';
import { IconBolt, IconGift } from '../../../shared/components/Icons';
import { VirtualGift } from '../../../shared/types';
import { giftsApi } from '../giftsApi';

const DEFAULT_GIFTS: IVirtualGift[] = [
  { id: 'gift_rose_5c', name: 'Rose', slug: 'rose-5c', coinPrice: 5, creatorEarningPaise: 350, iconUrl: '🌹' },
  { id: 'gift_banana_10c', name: 'Banana', slug: 'banana-10c', coinPrice: 10, creatorEarningPaise: 700, iconUrl: '🍌' },
  { id: 'gift_heart_25c', name: 'Heart Glow', slug: 'heart-25c', coinPrice: 25, creatorEarningPaise: 1750, iconUrl: '💖' },
  { id: 'gift_crown_100c', name: 'Royal Crown', slug: 'crown-100c', coinPrice: 100, creatorEarningPaise: 7000, iconUrl: '👑' },
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
    if (coins < gift.coinPrice || isSending) return;
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
        description: `Sent ${gift.name}`,
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
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              color: '#ef4444',
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
            border: '1px solid rgba(255, 255, 255, 0.05)',
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
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
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
              </button>
            );
          })}
        </div>

        {coins < 5 && (
          <p
            style={{
              fontSize: 'var(--step-small)',
              color: 'var(--ink-secondary)',
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
