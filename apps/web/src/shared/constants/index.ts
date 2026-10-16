import { VirtualGift } from '../types';

export const POPULAR_INTERESTS = [
  'Gaming',
  'Anime',
  'Music',
  'Coding',
  'Fitness',
  'Travel',
  'Movies',
  'Foodie',
  'Art',
  'Languages',
];

export const AVAILABLE_GIFTS: VirtualGift[] = [
  { id: 'carrot', name: 'Golden Carrot', cost: 20, icon: 'CARROT', description: 'Fresh crisp crunch' },
  { id: 'crown', name: 'Telegle Crown', cost: 100, icon: 'CROWN', description: 'King of the lobby' },
  { id: 'taco', name: 'Spicy Taco', cost: 35, icon: 'TACO', description: 'Spice up the chat' },
  { id: 'diamond', name: 'Blue Diamond', cost: 250, icon: 'DIAMOND', description: 'Ultra prestige' },
  { id: 'rocket', name: 'Speed Rocket', cost: 500, icon: 'ROCKET', description: 'To the stratosphere' },
  { id: 'heart', name: 'Spark Heart', cost: 10, icon: 'HEART', description: 'Send good vibes' },
];

export const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=480&q=80';
export const DEFAULT_AVATAR_MALE = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80';
export const DEFAULT_AVATAR_FEMALE = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=480&q=80';

export const getSafeAvatarUrl = (avatarUrl?: string | null, gender?: string): string => {
  if (avatarUrl && !avatarUrl.startsWith('blob:') && avatarUrl !== '/logo.png') {
    return avatarUrl;
  }
  return (gender || '').toUpperCase() === 'MALE' ? DEFAULT_AVATAR_MALE : DEFAULT_AVATAR_FEMALE;
};

export const INITIAL_USER = {
  id: 'usr_me_01',
  name: 'User',
  tag: '',
  avatar: DEFAULT_AVATAR,
  coins: 0,
  country: 'Global',
  countryCode: 'UN',
  interests: ['Gaming', 'Music'],
  bio: '',
  isOnline: true,
};

export const SAMPLE_STRANGERS = [
  {
    id: 'st_01',
    name: 'Yuki Tanaka',
    age: 22,
    country: 'Japan',
    countryFlag: 'JP',
    interests: ['Anime', 'Coding', 'Music'],
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=480&q=80',
    distanceKm: 8400,
    status: 'Practicing English and listening to lofi beats',
  },
  {
    id: 'st_02',
    name: 'Mateo Silva',
    age: 24,
    country: 'Brazil',
    countryFlag: 'BR',
    interests: ['Fitness', 'Travel', 'Gaming'],
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=480&q=80',
    distanceKm: 6200,
    status: 'Coffee fan and weekend competitive gamer',
  },
  {
    id: 'st_03',
    name: 'Sofia Rossi',
    age: 21,
    country: 'Italy',
    countryFlag: 'IT',
    interests: ['Art', 'Movies', 'Foodie'],
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=480&q=80',
    distanceKm: 4100,
    status: 'Design student saying hello to the world',
  },
  {
    id: 'st_04',
    name: 'Liam Chen',
    age: 23,
    country: 'Canada',
    countryFlag: 'CA',
    interests: ['Music', 'Coding', 'Gaming'],
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=480&q=80',
    distanceKm: 2800,
    status: 'Producer working on new summer beats',
  },
  {
    id: 'st_05',
    name: 'Chloe Dupont',
    age: 20,
    country: 'France',
    countryFlag: 'FR',
    interests: ['Travel', 'Art', 'Languages'],
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=480&q=80',
    distanceKm: 5900,
    status: 'Architecture student sharing city sketches',
  },
  {
    id: 'st_06',
    name: 'Kai Berg',
    age: 25,
    country: 'Norway',
    countryFlag: 'NO',
    interests: ['Fitness', 'Photography', 'Travel'],
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=480&q=80',
    distanceKm: 7100,
    status: 'Nordic trail runner and mountain hiker',
  },
];
