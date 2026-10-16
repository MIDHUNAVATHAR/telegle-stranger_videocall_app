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
    id: 'gift_coffee_5c',
    name: 'Hot Coffee',
    slug: 'coffee-5c',
    coinPrice: 5,
    creatorEarningPaise: 350, // ₹3.50
    platformFeePaise: 150, // ₹1.50
    iconUrl: '☕',
    isActive: true,
    displayOrder: 2,
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
    displayOrder: 3,
  },
  {
    id: 'gift_chocolate_10c',
    name: 'Chocolate',
    slug: 'chocolate-10c',
    coinPrice: 10,
    creatorEarningPaise: 700, // ₹7.00
    platformFeePaise: 300, // ₹3.00
    iconUrl: '🍫',
    isActive: true,
    displayOrder: 4,
  },
  {
    id: 'gift_fire_15c',
    name: 'Fire Flame',
    slug: 'fire-15c',
    coinPrice: 15,
    creatorEarningPaise: 1050, // ₹10.50
    platformFeePaise: 450, // ₹4.50
    iconUrl: '🔥',
    isActive: true,
    displayOrder: 5,
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
    displayOrder: 6,
  },
  {
    id: 'gift_party_35c',
    name: 'Party Popper',
    slug: 'party-35c',
    coinPrice: 35,
    creatorEarningPaise: 2450, // ₹24.50
    platformFeePaise: 1050, // ₹10.50
    iconUrl: '🎉',
    isActive: true,
    displayOrder: 7,
  },
  {
    id: 'gift_diamond_50c',
    name: 'Diamond',
    slug: 'diamond-50c',
    coinPrice: 50,
    creatorEarningPaise: 3500, // ₹35.00
    platformFeePaise: 1500, // ₹15.00
    iconUrl: '💎',
    isActive: true,
    displayOrder: 8,
  },
  {
    id: 'gift_rocket_75c',
    name: 'Rocket',
    slug: 'rocket-75c',
    coinPrice: 75,
    creatorEarningPaise: 5250, // ₹52.50
    platformFeePaise: 2250, // ₹22.50
    iconUrl: '🚀',
    isActive: true,
    displayOrder: 9,
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
    displayOrder: 10,
  },
  {
    id: 'gift_car_250c',
    name: 'Sports Car',
    slug: 'car-250c',
    coinPrice: 250,
    creatorEarningPaise: 17500, // ₹175.00
    platformFeePaise: 7500, // ₹75.00
    iconUrl: '🏎️',
    isActive: true,
    displayOrder: 11,
  },
  {
    id: 'gift_castle_500c',
    name: 'Golden Castle',
    slug: 'castle-500c',
    coinPrice: 500,
    creatorEarningPaise: 35000, // ₹350.00
    platformFeePaise: 15000, // ₹150.00
    iconUrl: '🏰',
    isActive: true,
    displayOrder: 12,
  },
];
