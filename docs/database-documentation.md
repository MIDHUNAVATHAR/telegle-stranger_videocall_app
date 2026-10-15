# Donkey Play — Database Architecture & Data Design

This document specifies the complete MongoDB database architecture, Mongoose schemas, data validation rules, indexes, and retention policies for **Donkey Play**.

---

## 1. Overview & Data Modeling Principles

Donkey Play utilizes **MongoDB 7.0+** with **Mongoose ODM** within a modular monolith architecture. The data layer adheres to the following principles:

1. **Repository Pattern & Modular Isolation**: Mongoose models are isolated inside their respective bounded contexts (`src/modules/*/repositories/`). Modules interact with other domain models exclusively through services or well-defined domain events.
2. **ACID Transactions for Financial & Critical State**: Multi-document MongoDB sessions (`client.startSession()`) are strictly enforced for wallet mutations (coin purchases, gifts, payouts) and match handshakes.
3. **Strict Schemas with Zod Alignment**: Database schemas reflect domain invariants validated at API boundaries by Zod schemas.
4. **Optimistic Concurrency Control**: High-contention documents (`wallets`) employ version numbers (`versionKey: '__v'` or custom `version`) to prevent lost updates.
5. **Soft Deletions for Inbox Visibility**: User conversations support per-participant soft deletion (`hidden_by_user_ids`) so hiding a chat is local to that user.

---

## 2. Entity Relationship Summary

| Collection | Domain Module | Primary Key | Key Relationships |
|---|---|---|---|
| `users` | `users` | `_id` (ObjectId) | 1:1 `user_preferences`, 1:1 `wallets` |
| `user_preferences` | `users` | `_id` (ObjectId) | N:1 `users` (`user_id`) |
| `conversations` | `conversations` | `_id` (ObjectId) | N:M `users` (`participant_ids`), N:1 `matches` (`last_call_match_id`) |
| `matches` | `matching` | `_id` (ObjectId) | N:1 `users` (`user_a_id`, `user_b_id`, `charged_user_id`) |
| `wallets` | `wallet` | `_id` (ObjectId) | 1:1 `users` (`user_id`), 1:N `wallet_transactions` |
| `wallet_transactions` | `wallet` | `_id` (ObjectId) | N:1 `wallets` (`wallet_id`), N:1 `users` (`user_id`) |
| `gifts` | `gifts` | `_id` (ObjectId) | 1:N `gift_transfers` |
| `gift_transfers` | `gifts` | `_id` (ObjectId) | N:1 `gifts`, N:1 `users` (sender/recipient), N:1 `matches` |
| `withdrawals` | `wallet` | `_id` (ObjectId) | N:1 `users` (`user_id`) |
| `reports` | `moderation` | `_id` (ObjectId) | N:1 `users` (reporter/reported), N:1 `matches` |
| `blocks` | `moderation` | `_id` (ObjectId) | N:1 `users` (blocker/blocked) |

---

## 3. Detailed Collection Schemas

### 3.1 `users` Collection

Stores account identity, demographic metadata, moderation standing, and authentication linkages.

```typescript
interface IUser {
  _id: Types.ObjectId;
  email?: string; // Lowercase, trimmed, unique if present
  google_id?: string; // Unique if present
  display_name: string; // 2 - 30 characters
  age: number; // >= 18 enforced
  gender: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY';
  avatar_url?: string; // Cloudinary secure URL
  bio?: string; // Max 200 characters
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  is_banned: boolean; // Fast check flag
  banned_until?: Date; // Active ban expiration timestamp
  ban_reason?: string;
  last_login_at: Date;
  created_at: Date;
  updated_at: Date;
}
```

#### Fields & Validations
- `email`: `String`, optional, sparse index, lowercase, validated with RFC 5322 regex.
- `google_id`: `String`, optional, sparse index, unique.
- `display_name`: `String`, required, min 2, max 30 chars. Stripped of HTML/script injection tags.
- `age`: `Number`, required, min 18. Strict validation; registration fails if age < 18.
- `gender`: `String`, enum `['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY']`, default `'PREFER_NOT_TO_SAY'`.
- `avatar_url`: `String`, optional, valid Cloudinary HTTPS URL format.
- `bio`: `String`, optional, max length 200 characters.
- `role`: `String`, enum `['USER', 'MODERATOR', 'ADMIN']`, default `'USER'`.
- `is_banned`: `Boolean`, default `false`. Indexed for rapid auth gatekeeping.
- `banned_until`: `Date`, optional. Set when automated 24h ban or admin action occurs.
- `last_login_at`: `Date`, default `Date.now`.

#### Indexes
- `{ email: 1 }` (unique, sparse)
- `{ google_id: 1 }` (unique, sparse)
- `{ is_banned: 1, banned_until: 1 }` (compound index for fast token validation)
- `{ created_at: -1 }` (user management queries)

#### Sample Document
```json
{
  "_id": "660c2830f3b9c45019a8e001",
  "email": "alex.morgan@example.com",
  "google_id": "109876543210987654321",
  "display_name": "Alex M",
  "age": 22,
  "gender": "FEMALE",
  "avatar_url": "https://res.cloudinary.com/donkey-play/image/upload/v1713180000/avatars/u_660c2830.webp",
  "bio": "Love tech, chill music, and travel talks ✈️",
  "role": "USER",
  "is_banned": false,
  "banned_until": null,
  "last_login_at": "2026-10-15T00:50:00.000Z",
  "created_at": "2026-10-10T12:00:00.000Z",
  "updated_at": "2026-10-15T00:50:00.000Z"
}
```

---

### 3.2 `user_preferences` Collection

Stores client preferences, call behavior, and matchmaking defaults.

```typescript
interface IUserPreferences {
  _id: Types.ObjectId;
  user_id: Types.ObjectId; // 1:1 with users
  preferred_gender: 'ANY' | 'MALE' | 'FEMALE';
  allow_incoming_calls: boolean;
  sound_enabled: boolean;
  video_enabled_default: boolean;
  mic_enabled_default: boolean;
  updated_at: Date;
}
```

#### Fields & Validations
- `user_id`: `ObjectId`, required, ref `'User'`, unique.
- `preferred_gender`: `String`, enum `['ANY', 'MALE', 'FEMALE']`, default `'ANY'`.
- `allow_incoming_calls`: `Boolean`, default `true`. Allows direct calls from Messages inbox.
- `sound_enabled`: `Boolean`, default `true`.
- `video_enabled_default`: `Boolean`, default `true`.
- `mic_enabled_default`: `Boolean`, default `true`.

#### Indexes
- `{ user_id: 1 }` (unique)

---

### 3.3 `conversations` Collection

Tracks connections made between pairs of users who met via video chat. Facilitates the Messages inbox.

```typescript
interface IConversation {
  _id: Types.ObjectId;
  participant_ids: [Types.ObjectId, Types.ObjectId]; // Exactly 2 users
  last_call_match_id?: Types.ObjectId; // Pointer to last MATCH
  last_interaction_at: Date; // Sort timestamp for inbox
  hidden_by_user_ids: Types.ObjectId[]; // Soft-deleted participant IDs
  created_at: Date;
  updated_at: Date;
}
```

#### Fields & Validations
- `participant_ids`: `[ObjectId]`, array of exactly 2 user ObjectIds, sorted lexicographically before insertion to ensure canonical pair deduplication.
- `last_call_match_id`: `ObjectId`, ref `'Match'`, optional.
- `last_interaction_at`: `Date`, required, updated whenever a call finishes between the participants.
- `hidden_by_user_ids`: `[ObjectId]`, defaults to `[]`. When user A deletes the conversation, `userA` is added to this array. The conversation is omitted from user A's inbox list, but persists for user B. If user A and user B connect in a call again, `hidden_by_user_ids` is reset.

#### Indexes
- `{ participant_ids: 1 }` (unique compound index for pair uniqueness)
- `{ participant_ids: 1, last_interaction_at: -1 }` (inbox query and pagination)
- `{ hidden_by_user_ids: 1 }` (filter out hidden conversations)

#### Sample Document
```json
{
  "_id": "660c2830f3b9c45019a8e020",
  "participant_ids": [
    "660c2830f3b9c45019a8e001",
    "660c2830f3b9c45019a8e002"
  ],
  "last_call_match_id": "660c2830f3b9c45019a8e040",
  "last_interaction_at": "2026-10-15T00:55:00.000Z",
  "hidden_by_user_ids": [],
  "created_at": "2026-10-14T18:20:00.000Z",
  "updated_at": "2026-10-15T00:55:00.000Z"
}
```

---

### 3.4 `matches` Collection

Records every matching handshake, signaling session, duration, and coin consumption.

```typescript
interface IMatch {
  _id: Types.ObjectId;
  session_id: string; // UUIDv4 for WebRTC room
  user_a_id: Types.ObjectId; // Initiator / Searcher
  user_b_id: Types.ObjectId; // Paired Candidate
  match_type: 'RANDOM_FREE' | 'GENDER_FILTER_PAID' | 'DIRECT_INBOX_CALL';
  coin_charged: number; // 0 or 1
  charged_user_id?: Types.ObjectId; // User from whom coin was debited
  status: 'INITIATED' | 'CONNECTED' | 'COMPLETED' | 'SKIPPED' | 'FAILED' | 'REPORTED';
  duration_seconds: number; // Duration of active media connection
  started_at: Date;
  connected_at?: Date;
  ended_at?: Date;
  metadata?: Record<string, unknown>;
}
```

#### Fields & Validations
- `session_id`: `String`, required, unique UUIDv4.
- `user_a_id`: `ObjectId`, ref `'User'`, required.
- `user_b_id`: `ObjectId`, ref `'User'`, required.
- `match_type`: `String`, enum `['RANDOM_FREE', 'GENDER_FILTER_PAID', 'DIRECT_INBOX_CALL']`.
- `coin_charged`: `Number`, enum `[0, 1]`, default `0`.
- `charged_user_id`: `ObjectId`, ref `'User'`, optional (populated when `coin_charged > 0`).
- `status`: `String`, enum `['INITIATED', 'CONNECTED', 'COMPLETED', 'SKIPPED', 'FAILED', 'REPORTED']`.
- `duration_seconds`: `Number`, default `0`, min `0`.
- `started_at`: `Date`, default `Date.now`.
- `connected_at`: `Date`, timestamp when both WebRTC peers exchanged SDP answers and ice candidates.
- `ended_at`: `Date`, timestamp when signaling room closed.

#### Indexes
- `{ session_id: 1 }` (unique)
- `{ user_a_id: 1, created_at: -1 }`
- `{ user_b_id: 1, created_at: -1 }`
- `{ status: 1, started_at: -1 }`

---

### 3.5 `wallets` Collection

Maintains strict separation between **Purchased Non-Withdrawable Coins** and **Withdrawable Cash Earnings** (stored in INR paise to eliminate floating-point rounding errors).

```typescript
interface IWallet {
  _id: Types.ObjectId;
  user_id: Types.ObjectId; // 1:1 with users
  purchased_coins_balance: number; // Coins bought or refunded (non-cashoutable)
  withdrawable_earnings_paise: number; // Earned from gifts in INR paise (₹1 = 100 paise)
  total_coins_spent: number; // Lifetime analytics
  total_earnings_withdrawn_paise: number; // Lifetime cashouts
  version: number; // Optimistic locking
  created_at: Date;
  updated_at: Date;
}
```

#### Invariants & Constraints
- `purchased_coins_balance >= 0`: Mongo schema validator (`{ $gte: 0 }`). It is impossible for coins to drop below zero.
- `withdrawable_earnings_paise >= 0`: Mongo schema validator (`{ $gte: 0 }`).
- Currency amounts are exclusively integers representing paise (₹10.00 = `1000`, ₹500.00 = `50000`).

#### Indexes
- `{ user_id: 1 }` (unique)

#### Sample Document
```json
{
  "_id": "660c2830f3b9c45019a8e030",
  "user_id": "660c2830f3b9c45019a8e001",
  "purchased_coins_balance": 85,
  "withdrawable_earnings_paise": 62500,
  "total_coins_spent": 35,
  "total_earnings_withdrawn_paise": 50000,
  "version": 4,
  "created_at": "2026-10-10T12:00:00.000Z",
  "updated_at": "2026-10-15T00:45:00.000Z"
}
```

---

### 3.6 `wallet_transactions` Collection

Immutable double-entry financial ledger capturing every mutation to user balances.

```typescript
interface IWalletTransaction {
  _id: Types.ObjectId;
  wallet_id: Types.ObjectId;
  user_id: Types.ObjectId;
  type: 
    | 'COIN_PURCHASE'
    | 'GENDER_FILTER_DEBIT'
    | 'DIRECT_CALL_DEBIT'
    | 'GIFT_SENT_DEBIT'
    | 'GIFT_RECEIVED_CREDIT'
    | 'WITHDRAWAL_DEBIT'
    | 'WITHDRAWAL_REVERSAL_CREDIT'
    | 'REFUND_CREDIT';
  coins_amount: number; // Signed delta: +N or -N
  currency_amount_paise: number; // Signed delta in INR paise: +N or -N
  idempotency_key: string; // Unique key (e.g., pay_987 or uuid)
  reference_type: 'RAZORPAY_ORDER' | 'MATCH' | 'CONVERSATION' | 'GIFT' | 'WITHDRAWAL';
  reference_id: string; // Target entity ID
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  balance_after: {
    purchased_coins: number;
    withdrawable_paise: number;
  };
  metadata: Record<string, unknown>;
  created_at: Date;
}
```

#### Indexes
- `{ idempotency_key: 1 }` (unique, eliminates duplicate processing)
- `{ user_id: 1, created_at: -1 }` (transaction history retrieval)
- `{ wallet_id: 1, created_at: -1 }`
- `{ reference_type: 1, reference_id: 1 }`

---

### 3.7 `gifts` Collection

Master catalog of virtual gifts available to send during calls.

```typescript
interface IGift {
  _id: Types.ObjectId;
  name: string; // E.g., "Rose", "Super Star", "Crown"
  slug: string; // E.g., "rose-10c"
  coin_price: number; // Cost to sender (e.g., 10, 50, 100, 500)
  creator_earning_paise: number; // Net payout value to recipient in paise (e.g. 700 paise = ₹7.00 for a 10 coin gift)
  icon_url: string; // Static PNG/WebP asset
  animation_url?: string; // Lottie JSON or WebM animation overlay
  is_active: boolean; // Soft disable
  display_order: number;
  created_at: Date;
  updated_at: Date;
}
```

#### Initial Catalog Seed Data
| Name | Slug | Coin Price | Creator Earning (70%) | Platform Fee (30%) | Asset Type |
|---|---|---|---|---|---|
| Rose | `rose-10c` | 10 coins | ₹7.00 (700 paise) | ₹3.00 (300 paise) | Lottie Particles |
| Heart Glow | `heart-25c` | 25 coins | ₹17.50 (1750 paise) | ₹7.50 (750 paise) | Floating Hearts |
| Sparkler | `sparkler-50c` | 50 coins | ₹35.00 (3500 paise) | ₹15.00 (1500 paise) | Golden Sparkles |
| Royal Crown | `crown-200c` | 200 coins | ₹140.00 (14000 paise) | ₹60.00 (6000 paise) | 3D Crown Crown |

#### Indexes
- `{ slug: 1 }` (unique)
- `{ is_active: 1, display_order: 1 }`

---

### 3.8 `gift_transfers` Collection

Audit log of every gift exchanged between users during a video call session.

```typescript
interface IGiftTransfer {
  _id: Types.ObjectId;
  gift_id: Types.ObjectId;
  sender_id: Types.ObjectId;
  recipient_id: Types.ObjectId;
  match_id: Types.ObjectId; // Video call context
  coins_spent: number;
  creator_earnings_paise: number;
  platform_fee_paise: number;
  created_at: Date;
}
```

#### Indexes
- `{ sender_id: 1, created_at: -1 }`
- `{ recipient_id: 1, created_at: -1 }`
- `{ match_id: 1 }`

---

### 3.9 `withdrawals` Collection

Tracks creator payout requests to verified UPI Virtual Payment Addresses (VPAs).

```typescript
interface IWithdrawal {
  _id: Types.ObjectId;
  user_id: Types.ObjectId;
  amount_paise: number; // Minimum 50,000 paise (₹500.00)
  upi_id: string; // E.g., "alex.morgan@oksbi"
  idempotency_key: string; // UUIDv4 generated at client request
  razorpayx_payout_id?: string; // Payout identifier returned by RazorpayX
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' | 'FAILED';
  rejection_reason?: string;
  created_at: Date;
  processed_at?: Date;
}
```

#### Validations & Rules
- `amount_paise`: Integer, min `50000` (₹500 threshold).
- `upi_id`: Validated against UPI VPA regex `^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$`.
- A user cannot initiate a new withdrawal if an existing withdrawal is in `PENDING` or `PROCESSING` status.

#### Indexes
- `{ idempotency_key: 1 }` (unique)
- `{ user_id: 1, status: 1 }` (rapid active withdrawal checking)
- `{ razorpayx_payout_id: 1 }` (sparse unique for webhook lookups)

---

### 3.10 `reports` Collection

Stores abuse and violation reports filed by users.

```typescript
interface IReport {
  _id: Types.ObjectId;
  reporter_id: Types.ObjectId;
  reported_user_id: Types.ObjectId;
  match_id?: Types.ObjectId; // Call session in which violation happened
  reason: 
    | 'HARASSMENT'
    | 'NUDITY_INAPPROPRIATE'
    | 'UNDERAGE'
    | 'SPAM'
    | 'OTHER';
  details?: string; // Free-text description (max 500 chars)
  status: 'PENDING' | 'ACTIONED' | 'DISMISSED';
  action_taken: 'NONE' | 'MUTUAL_BLOCK_24H' | 'AUTO_BAN_24H' | 'PERMANENT_BAN';
  created_at: Date;
}
```

#### Invariants & Automated Logic
- Submitting a report automatically creates a 24-hour mutual block between `reporter_id` and `reported_user_id`.
- The report is logged in Redis sorted set `reports:target:<reported_user_id>`. If 5 unique reporters report the target within a rolling 1-hour window, the server automatically bans the target user for 24 hours (`is_banned = true`, `banned_until = now + 24h`).

#### Indexes
- `{ reported_user_id: 1, created_at: -1 }`
- `{ reporter_id: 1, reported_user_id: 1, created_at: -1 }`
- `{ status: 1, created_at: 1 }` (moderator review queue)

---

### 3.11 `blocks` Collection

Stores user-initiated and system-enforced mutual matching blocks.

```typescript
interface IBlock {
  _id: Types.ObjectId;
  user_id: Types.ObjectId; // Who triggered or owns block
  blocked_user_id: Types.ObjectId; // Who is blocked
  reason: 'USER_INITIATED' | 'POST_REPORT_AUTO';
  expires_at?: Date; // Null for permanent block, timestamp for 24h auto-block
  created_at: Date;
}
```

#### Indexes
- `{ user_id: 1, blocked_user_id: 1 }` (unique)
- `{ expires_at: 1 }` (MongoDB TTL index: documents expire automatically when `expires_at` is in the past)

---

## 4. Data Retention & Archiving Strategy

1. **Reports**: Retained permanently in MongoDB for audit compliance and law enforcement inquiries.
2. **Matches**: Full records kept for 90 days. Aggregated metrics (total calls, duration) are stored on `users` if needed; raw match records older than 180 days are archived to cold storage (MongoDB Archive or S3 JSON).
3. **Conversations**: Persisted indefinitely until explicitly deleted or both users delete accounts.
4. **Wallet Transactions**: Immutable financial ledger. **Never deleted**. Retained for minimum 7 years for financial compliance.
5. **Temporary Blocks**: Enforced via MongoDB TTL index `{ expires_at: 1 }` with `expireAfterSeconds: 0`.
