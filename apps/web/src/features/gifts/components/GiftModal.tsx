'use client';

import React, { useEffect, useState } from 'react';
import { IVirtualGift } from '@donkey-play/shared-types';
import { Modal } from '../../../shared/components/Modal';
import { IconGift, IconDollar } from '../../../shared/components/Icons';
import { VirtualGift } from '../../../shared/types';
import { giftsApi } from '../giftsApi';

const DEFAULT_GIFTS: IVirtualGift[] = [
  { id: 'gift_rose_5c', name: 'Rose', slug: 'rose-5c', coinPrice: 5, creatorEarningPaise: 350, iconUrl: '🌹' },
  { id: 'gift_coffee_5c', name: 'Hot Coffee', slug: 'coffee-5c', coinPrice: 5, creatorEarningPaise: 350, iconUrl: '☕' },
  { id: 'gift_banana_10c', name: 'Banana', slug: 'banana-10c', coinPrice: 10, creatorEarningPaise: 700, iconUrl: '🍌' },
  { id: 'gift_chocolate_10c', name: 'Chocolate', slug: 'chocolate-10c', coinPrice: 10, creatorEarningPaise: 700, iconUrl: '🍫' },
  { id: 'gift_fire_15c', name: 'Fire Flame', slug: 'fire-15c', coinPrice: 15, creatorEarningPaise: 1050, iconUrl: '🔥' },
  { id: 'gift_heart_25c', name: 'Heart Glow', slug: 'heart-25c', coinPrice: 25, creatorEarningPaise: 1750, iconUrl: '💖' },
  { id: 'gift_party_35c', name: 'Party Popper', slug: 'party-35c', coinPrice: 35, creatorEarningPaise: 2450, iconUrl: '🎉' },
  { id: 'gift_diamond_50c', name: 'Diamond', slug: 'diamond-50c', coinPrice: 50, creatorEarningPaise: 3500, iconUrl: '💎' },
  { id: 'gift_rocket_75c', name: 'Rocket', slug: 'rocket-75c', coinPrice: 75, creatorEarningPaise: 5250, iconUrl: '🚀' },
  { id: 'gift_crown_100c', name: 'Royal Crown', slug: 'crown-100c', coinPrice: 100, creatorEarningPaise: 7000, iconUrl: '👑' },
  { id: 'gift_car_250c', name: 'Sports Car', slug: 'car-250c', coinPrice: 250, creatorEarningPaise: 17500, iconUrl: '🏎️' },
  { id: 'gift_castle_500c', name: 'Golden Castle', slug: 'castle-500c', coinPrice: 500, creatorEarningPaise: 35000, iconUrl: '🏰' },
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
              color: '#22c55e',
            }}
          >
            <IconDollar size={18} color="#22c55e" /> {coins} Coins
          </strong>
        </div>

        {/* Gift Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '10px',
            maxHeight: '340px',
            overflowY: 'auto',
            paddingRight: '4px',
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
                  padding: '12px 8px',
                  backgroundColor: 'var(--surface-raised)',
                  borderRadius: 'var(--radius-md)',
                  opacity: canAfford ? 1 : 0.45,
                  cursor: canAfford && !isSending ? 'pointer' : 'not-allowed',
                  transition: 'background-color var(--t-quick) ease, transform var(--t-press) ease',
                  textAlign: 'center',
                  gap: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                  }}
                >
                  {gift.iconUrl ? gift.iconUrl : <IconGift size={22} />}
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
                    color: '#22c55e',
                    fontWeight: 700,
                  }}
                >
                  <IconDollar size={14} color="#22c55e" /> {gift.coinPrice} Coins
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
