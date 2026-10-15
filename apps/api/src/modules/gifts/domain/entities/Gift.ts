import { IVirtualGift } from '@donkey-play/shared-types';

export interface IGiftEntity extends IVirtualGift {
  platformFeePaise: number;
  animationUrl?: string;
  isActive: boolean;
  displayOrder: number;
}

export interface IGiftTransferEntity {
  id: string;
  giftId: string;
  giftSlug: string;
  senderId: string;
  recipientId: string;
  matchSessionId?: string;
  coinsSpent: number;
  creatorEarningsPaise: number;
  platformFeePaise: number;
  createdAt: Date;
}

export const SEED_GIFTS: IGiftEntity[] = [
  {
    id: 'gift_rose_10c',
    name: 'Rose',
    slug: 'rose-10c',
    coinPrice: 10,
    creatorEarningPaise: 700, // ₹7.00
    platformFeePaise: 300, // ₹3.00
    iconUrl: '🌹',
    isActive: true,
    displayOrder: 1,
  },
  {
    id: 'gift_heart_25c',
    name: 'Heart Glow',
    slug: 'heart-25c',
    coinPrice: 25,
    creatorEarningPaise: 1750, // ₹17.50
    platformFeePaise: 750, // ₹7.50
    iconUrl: '💖',
    isActive: true,
    displayOrder: 2,
  },
  {
    id: 'gift_sparkler_50c',
    name: 'Sparkler',
    slug: 'sparkler-50c',
    coinPrice: 50,
    creatorEarningPaise: 3500, // ₹35.00
    platformFeePaise: 1500, // ₹15.00
    iconUrl: '✨',
    isActive: true,
    displayOrder: 3,
  },
  {
    id: 'gift_crown_200c',
    name: 'Royal Crown',
    slug: 'crown-200c',
    coinPrice: 200,
    creatorEarningPaise: 14000, // ₹140.00
    platformFeePaise: 6000, // ₹60.00
    iconUrl: '👑',
    isActive: true,
    displayOrder: 4,
  },
];
