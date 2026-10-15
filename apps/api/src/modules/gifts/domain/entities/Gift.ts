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
    id: 'gift_rose_5c',
    name: 'Rose',
    slug: 'rose-5c',
    coinPrice: 5,
    creatorEarningPaise: 350, // ₹3.50
    platformFeePaise: 150, // ₹1.50
    iconUrl: '🌹',
    isActive: true,
    displayOrder: 1,
  },
  {
    id: 'gift_banana_10c',
    name: 'Banana',
    slug: 'banana-10c',
    coinPrice: 10,
    creatorEarningPaise: 700, // ₹7.00
    platformFeePaise: 300, // ₹3.00
    iconUrl: '🍌',
    isActive: true,
    displayOrder: 2,
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
    displayOrder: 3,
  },
  {
    id: 'gift_crown_100c',
    name: 'Royal Crown',
    slug: 'crown-100c',
    coinPrice: 100,
    creatorEarningPaise: 7000, // ₹70.00
    platformFeePaise: 3000, // ₹30.00
    iconUrl: '👑',
    isActive: true,
    displayOrder: 4,
  },
];
