// User & Profile Types
export type UserGender = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN';

export interface IUserProfile {
  id: string;
  email?: string;
  displayName: string;
  age: number;
  gender: UserGender;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  isBanned: boolean;
  bannedUntil?: string | null;
  createdAt: string;
}

export interface IUserPreferences {
  preferredGender: 'ANY' | 'MALE' | 'FEMALE';
  allowIncomingCalls: boolean;
  soundEnabled: boolean;
}

// Matchmaking & Call Types
export type MatchFilter = 'ANY' | 'MALE' | 'FEMALE';
export type MatchStatus =
  | 'INITIATED'
  | 'CONFIRMING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'CONNECTED'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'FAILED'
  | 'REPORTED';

export interface IMatchPartnerProfile {
  id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  age: number;
  gender: UserGender | string;
}

export interface IMatchSession {
  sessionId: string;
  partner: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    bio?: string;
    gender: UserGender;
    age?: number;
  };
  filterUsed: MatchFilter;
  coinCharged: number;
  startedAt: string;
}

export interface IMatchDecisionResponse {
  sessionId: string;
  status: 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
  message: string;
}

// Wallet & Financial Types
export interface IWalletBalance {
  purchasedCoinsBalance: number;
  withdrawableEarningsPaise: number;
  withdrawableEarningsInr: number;
  withdrawableGiftCoins?: number;
  isPurchasedCoinsWithdrawable?: boolean;
  payoutUpiId?: string;
  totalEarningsWithdrawnPaise?: number;
}

export interface ICoinPackage {
  id: string;
  name: string;
  baseCoins: number;
  bonusCoins: number;
  totalCoins: number;
  pricePaise: number;
  priceInr: number;
}

export interface IWalletTransaction {
  id: string;
  type: string;
  coinsAmount: number;
  currencyAmountPaise: number;
  idempotencyKey: string;
  referenceType: string;
  referenceId: string;
  status: string;
  balanceAfter: {
    purchasedCoins: number;
    withdrawablePaise: number;
  };
  createdAt: string;
}

export interface ICreateRazorpayOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface IVerifyPaymentRequest {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface IUpdateUpiIdRequest {
  upiId: string;
}

export interface IWithdrawRequest {
  amountInr?: number;
  amountPaise?: number;
  coins?: number;
}

export interface IWithdrawResponse {
  payoutId: string;
  amountInr: number;
  amountPaise: number;
  withdrawnGiftCoins?: number;
  upiId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  remainingEarningsPaise: number;
  remainingEarningsInr: number;
  remainingGiftCoins?: number;
  transaction: IWalletTransaction;
}

// Virtual Gifts Types
export interface IVirtualGift {
  id: string;
  name: string;
  slug: string;
  coinPrice: number;
  creatorEarningPaise: number;
  iconUrl: string;
}

export interface IGiftSendRequest {
  giftSlug: string;
  recipientUserId: string;
  matchSessionId?: string;
}

export interface IGiftSendResponse {
  transferId: string;
  gift: IVirtualGift;
  remainingCoins: number;
  sentAt: string;
}

// Moderation Types
export type ReportReason =
  | 'HARASSMENT'
  | 'NUDITY_INAPPROPRIATE'
  | 'UNDERAGE'
  | 'SPAM'
  | 'OTHER';

export interface IReportRequest {
  targetUserId: string;
  matchSessionId?: string;
  reason: ReportReason;
  details?: string;
}

export interface IBlockUserRequest {
  targetUserId: string;
}

// Standard API Response Envelopes
export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    name?: string;
    message: string;
    details?: unknown[];
  };
}
