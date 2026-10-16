export type TabType = 'matching' | 'video-call' | 'chat' | 'wallet' | 'profile';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  tag: string;
  avatar: string;
  coins: number;
  country: string;
  interests: string[];
  bio: string;
  isOnline: boolean;
}

export interface MatchFilter {
  region: 'global' | 'asia' | 'europe' | 'americas';
  mode: 'video' | 'audio' | 'text';
  selectedInterests: string[];
}

export interface Stranger {
  id: string;
  name: string;
  age: number;
  country: string;
  countryFlag: string;
  interests: string[];
  avatar: string;
  distanceKm: number;
  status: string;
  gender?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: string;
  isSelf: boolean;
  reaction?: string;
  isRead?: boolean;
  createdAt?: number;
}

export interface VirtualGift {
  id: string;
  name: string;
  cost: number;
  icon: string;
  description: string;
}
