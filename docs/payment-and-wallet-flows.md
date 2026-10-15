# Donkey Play — Payment, Wallet & Financial Accounting Architecture

This document specifies the dual-balance wallet design, payment gateway integrations, revenue distribution, and payout mechanisms for **Donkey Play**.

---

## 1. Dual-Balance Accounting Architecture

To comply with regulatory standards (Prevention of Money Laundering Act, RBI PSS Regulations) and prevent fraud, Donkey Play strictly bifurcates user funds into two distinct balances:

```
┌─────────────────────────────────────────────────────────────┐
│                       USER WALLET                           │
├──────────────────────────────┬──────────────────────────────┤
│ 1. PURCHASED COINS (Coins)   │ 2. WITHDRAWABLE EARNINGS     │
│                              │    (INR Paise)               │
├──────────────────────────────┼──────────────────────────────┤
│ • Bought via Razorpay INR    │ • Earned exclusively by      │
│ • Used for:                  │   receiving virtual gifts    │
│   - Gender filter (1 coin)   │ • 100% Cashoutable to UPI    │
│   - Direct re-call (1 coin)  │ • Minimum threshold: ₹500    │
│   - Sending gifts (10-200c)  │   (50,000 paise)             │
│ • NON-WITHDRAWABLE / NO CASH │ • Never converted to coins   │
└──────────────────────────────┴──────────────────────────────┘
```

### 1.1 Invariant Rules
1. **No Cashout of Purchased Coins**: Purchased coins can never be converted into cash or withdrawn to bank accounts.
2. **No Coin Conversion of Earnings**: Withdrawable earnings cannot be converted back into purchased coins.
3. **Paise Precision**: All fiat amounts in MongoDB and Redis are stored as 64-bit integers in **INR paise** (₹1.00 = 100 paise) to avoid floating-point inaccuracies.

---

## 2. Coin Packages Catalog

Coin packages are configurable via the backend and database. A low-barrier ₹10 starter tier ensures maximum conversion:

| Package ID | Coins Provided | Bonus Coins | Total Coins | Price (INR) | Price (Paise) | Best For |
|---|---|---|---|---|---|---|
| `pack_starter_10` | 10 | 0 | **10** | ₹10 | 1,000 | Casual try-out, 10 filter calls |
| `pack_popular_50` | 50 | 5 | **55** | ₹50 | 5,000 | Regular socializer |
| `pack_value_100` | 100 | 20 | **120** | ₹100 | 10,000 | Gifting & custom filter calls |
| `pack_mega_500` | 500 | 150 | **650** | ₹500 | 50,000 | VIP & heavy gifter |

---

## 3. Virtual Gifts Catalog & 70/30 Revenue Split

Users can send virtual gifts during 1-on-1 video calls. The platform implements a **70% Creator / 30% Platform** split:

```
Sender spends: 10 Coins (Base nominal value: ₹10.00 / 1,000 paise)
  ├── 70% to Recipient: 700 paise (₹7.00) credited to withdrawable_earnings_paise
  └── 30% Platform Fee: 300 paise (₹3.00) retained by Donkey Play
```

### 3.1 Catalog Configuration

| Gift Name | Slug | Sender Cost | Recipient Earns (Paise) | Recipient Earns (INR) | Platform Fee (Paise) |
|---|---|---|---|---|---|
| **Rose** | `rose-10c` | 10 coins | 700 paise | ₹7.00 | 300 paise |
| **Heart Glow** | `heart-25c` | 25 coins | 1,750 paise | ₹17.50 | 750 paise |
| **Sparkler** | `sparkler-50c` | 50 coins | 3,500 paise | ₹35.00 | 1,500 paise |
| **Royal Crown** | `crown-200c` | 200 coins | 14,000 paise | ₹140.00 | 6,000 paise |

### 3.2 In-Call Gift Transfer Execution
When sender calls `POST /api/v1/gifts/send` or emits `send_gift` via Socket.IO:
1. Server starts an ACID MongoDB session transaction.
2. Checks sender's `purchased_coins_balance >= gift.coin_price`.
3. Atomically decrements sender's `purchased_coins_balance` by `gift.coin_price`.
4. Atomically increments recipient's `withdrawable_earnings_paise` by `gift.creator_earning_paise`.
5. Inserts `gift_transfers` record linking both users and the `match_id`.
6. Inserts two `wallet_transactions` ledger entries (one debit for sender, one credit for recipient).
7. Emits `gift_received` event to recipient over Socket.IO to trigger realtime 3D/Lottie overlay on receiver's video screen.

---

## 4. Razorpay Coin Purchase Flow

### 4.1 Order Creation (`POST /api/v1/wallet/orders`)
- Validates `package_id`.
- Calls Razorpay Orders API:
  ```typescript
  const order = await razorpay.orders.create({
    amount: pkg.price_paise, // e.g. 1000 for ₹10
    currency: 'INR',
    receipt: `rcpt_${userId}_${Date.now()}`,
    notes: { userId, packageId: pkg.id, coins: pkg.total_coins }
  });
  ```
- Returns `{ orderId: order.id, amount: order.amount, currency: "INR", keyId: process.env.RAZORPAY_KEY_ID }` to client.

### 4.2 Checkout & Verification
- Client opens Razorpay Checkout modal.
- On successful payment, client posts credentials to `POST /api/v1/wallet/orders/verify`:
  - `razorpay_order_id`
  - `razorpay_payment_id`
  - `razorpay_signature`
- Server verifies HMAC SHA256 signature using `RAZORPAY_KEY_SECRET`.
- Acquires Redis idempotency lock: `SETNX idempotency:pay:<paymentId> "PROCESSING"`.
- If key was already set, returns current wallet balance without re-executing.
- In MongoDB transaction:
  - Updates `purchased_coins_balance = purchased_coins_balance + pkg.total_coins`.
  - Appends `wallet_transactions` entry with `status: 'COMPLETED'`.
- Returns updated balance.

---

## 5. Creator UPI Payouts via RazorpayX

Creators who receive gifts can withdraw their accumulated earnings to their personal UPI ID once they reach the minimum threshold.

### 5.1 Withdrawal Rules & Constraints
1. **Minimum Threshold**: **₹500.00** (`50,000 paise`). Requests for less than ₹500 are rejected with `400 Bad Request`.
2. **UPI Validation**: Must match standard UPI Virtual Payment Address format (`username@bank`).
3. **Single Active Withdrawal**: A user cannot request a second withdrawal if a previous withdrawal is currently in `PENDING` or `PROCESSING` state.

### 5.2 Withdrawal Lifecycle State Machine

```
[User Submits Request]
         │
         ▼
    (PENDING) ───[Debit withdrawable_earnings_paise in MongoDB]
         │
         ▼
   (PROCESSING) ───[Call RazorpayX Payouts API]
         │
         ├───────────────────────────────┐
         │                               │
         ▼ (Webhook: payout.processed)    ▼ (Webhook: payout.rejected / payout.reversed)
    (COMPLETED)                     (FAILED / REVERSED)
   [Ledger Closed]                  [Automatic Refund of Paise to User Wallet]
```

### 5.3 Payout Webhook Handling (`POST /api/v1/wallet/webhook/payout`)
- Verifies RazorpayX webhook signature.
- If event is `payout.processed`:
  - Updates `withdrawals.status = "COMPLETED"`.
  - Updates `wallet_transactions.status = "COMPLETED"`.
- If event is `payout.reversed` or `payout.failed`:
  - Updates `withdrawals.status = "FAILED"`.
  - Starts MongoDB transaction:
    - Refunds `amount_paise` back to `withdrawable_earnings_paise`.
    - Inserts `wallet_transactions` entry with type `WITHDRAWAL_REVERSAL_CREDIT`.

---

## 6. Financial Ledger & Automated Reconciliation

1. **Double-Entry Discipline**: No wallet balance is ever updated with a bare `$inc` without writing a corresponding `wallet_transactions` ledger document inside the same MongoDB session.
2. **Balance Snapshots**: Every transaction document stores `balance_after.purchased_coins` and `balance_after.withdrawable_paise` for point-in-time auditing.
3. **Daily Reconciliation Job**:
   - A scheduled cron runs at 03:00 AM UTC.
   - For all active wallets, computes `expectedBalance = sum(transactions)`.
   - If `wallet.balance != expectedBalance`, flags an alert in Slack/Datadog and freezes automatic payouts for that account.
