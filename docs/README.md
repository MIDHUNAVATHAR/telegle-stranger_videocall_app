# Donkey Play — Complete Architecture, Database & API Documentation

Welcome to the central technical documentation for **Donkey Play**, a mobile-first social discovery, random matching, and one-to-one video chat application.

---

## 1. Documentation Index

The specification is divided into implementation-ready documents and architectural diagrams:

| Document | File Path | Description |
|---|---|---|
| **Database Documentation** | [`docs/database-documentation.md`](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/docs/database-documentation.md) | MongoDB schemas, Mongoose models, data types, indexes, and retention policies |
| **Redis Data Design** | [`docs/redis-data-design.md`](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/docs/redis-data-design.md) | In-memory keys, data structures, TTL strategy, and atomic Lua scripts |
| **API Documentation** | [`docs/api-documentation.md`](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/docs/api-documentation.md) | REST API endpoints, Socket.IO realtime events, error catalog, and Swagger UI |
| **Authentication & Security** | [`docs/authentication-and-security.md`](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/docs/authentication-and-security.md) | Brevo OTP, Google OAuth, JWT cookies, Cloudinary signatures, Razorpay verification, and 5-report ban policy |
| **Payment & Wallet Flows** | [`docs/payment-and-wallet-flows.md`](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/docs/payment-and-wallet-flows.md) | Dual-balance accounting, coin packages, virtual gifts, 70/30 split, Razorpay orders, and UPI payouts |
| **OpenAPI 3.1 Specification** | [`openapi/donkey-play.openapi.yaml`](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/openapi/donkey-play.openapi.yaml) | Machine-readable OpenAPI 3.1 contract powering Swagger UI at `/api/docs` |
| **Testing Environment Template** | [`.env.test.example`](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/.env.test.example) | Environment variable definitions for test suites and development |

### Architecture Diagrams (Mermaid)

- [System Architecture](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/docs/diagrams/system-architecture.mmd)
- [Database Relationships (ERD)](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/docs/diagrams/database-relationships.mmd)
- [Authentication Flow](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/docs/diagrams/authentication-flow.mmd)
- [Matchmaking & Queue Flow](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/docs/diagrams/matchmaking-flow.mmd)
- [Video Call & Signaling Flow](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/docs/diagrams/video-call-flow.mmd)
- [Wallet & Payment Flow](file:///home/midhunm/Desktop/BROTOTYPE/stranger_connect/docs/diagrams/wallet-payment-flow.mmd)

---

## 2. Technology Stack & Operational Topology

- **Monorepo**: Turborepo + pnpm workspaces.
- **Frontend (`apps/web`)**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons.
- **Backend (`apps/api`)**: Node.js, Express.js, TypeScript, Vitest.
- **Database**: MongoDB 7.0+ with Mongoose ODM (Modular Monolith + Repository Pattern).
- **In-Memory Cache & Coordination**: Redis 7.2+ (ioredis, Lua scripts).
- **Real-Time Communication**: Socket.IO 4.8+ (`/signaling`, `/matchmaking`).
- **Video Calling**: WebRTC 1-on-1 (P2P DTLS-SRTP, Google STUN: `stun:stun.l.google.com:19302`).
- **Transactional Email**: Brevo REST API (v3).
- **Third-Party Identity**: Google Identity Services (OAuth 2.0 ID Token verification).
- **CDN & Avatar Storage**: Cloudinary (Secure signed uploads with eager WebP transformation).
- **Payment Gateway**: Razorpay (INR coin pack orders, HMAC SHA256 webhooks).
- **Creator Cashouts**: RazorpayX Payouts API (UPI VPA transfer).
- **API Documentation**: Swagger UI + OpenAPI 3.1.

---

## 3. Explicit Resolution of the 10 Critical Business Rules

This section provides implementation decisions on the 10 core business rules:

### 1. Online Presence Count Calculation
- **Decision**: The displayed online user count is the **cardinality of unique active user IDs** (`SCARD presence:online_users`), NOT raw Socket.IO connection counts.
- **Mechanism**: Every connected client sends a lightweight heartbeat ping every 25 seconds. The server sets a 60-second lease in Redis (`SETEX presence:heartbeat:<userId> 60 "1"`). If a user opens 3 tabs, the set contains only 1 entry. If a socket drops during network handoff, the count remains stable until the lease expires.

### 2. Matchmaking Coin Charging & Reservation Logic
- **Decision**: Free random matching is **0 coins**. Gender-filtered matching costs **1 coin**.
- **Atomic Reservation**: When a user selects a gender filter, 1 coin is temporarily reserved in Redis (`SETEX match:reserved_coin:<userId> 60 "1"`).
- **Deduction & Refund Guarantee**: The coin is only permanently debited from the MongoDB wallet when both users confirm the match and the call room is initialized. If the search is cancelled, the candidate declines, or a 10-second timeout occurs, the reservation key is deleted. **A user is NEVER charged if a call does not connect.**

### 3. Server-Enforced 5-Second Minimum Call Countdown
- **Decision**: To curb disruptive skip-spamming, each video call enforces a 5-second minimum duration countdown.
- **Enforcement**: Upon WebRTC SDP handshake, the server writes `SETEX call:timer:<sessionId> 5 "LOCKED"`. The client UI disables the "Leave" button with a visual countdown. If a client attempts to emit `leave_call` early, the server rejects it.
- **Safety Exception**: Emergency reporting of a user (`POST /moderation/reports`) or genuine network socket termination immediately bypasses this timer and tears down the call.

### 4. In-Call Chat Ephemerality vs. Conversation Inbox Persistence
- **Decision**: In-call text chat messages are **100% ephemeral** (relayed over Socket.IO and never written to MongoDB).
- **Inbox Persistence**: However, the act of connecting in a call creates or updates a persistent `conversations` record between the two participants. Both users can view their past call partners in the Messages inbox, inspect their public profiles, or initiate a direct re-call.

### 5. Re-Calling Costs and Permissions
- **Decision**: Directly initiating a call to a previous partner from the Messages inbox costs **1 coin** (charged exclusively to the caller upon call acceptance).
- **Privacy & Opt-Out**: Users can disable direct inbound calls in their settings (`user_preferences.allow_incoming_calls = false`). If disabled, former partners receive a prompt: *"User is currently not accepting direct calls"*.

### 6. Dual-Balance Accounting Separation
- **Decision**: User wallets are strictly bifurcated into **Purchased Coins** and **Withdrawable Earnings (in INR paise)**.
- **Invariants**: Purchased coins can never be cashed out or withdrawn to a bank account (preventing anti-money-laundering violations). Creator earnings from virtual gifts are denominated in INR paise and can be cashed out to UPI once the ₹500 threshold is reached. Earnings cannot be converted back into coins.

### 7. Minimum Withdrawal Limit & UPI Handling
- **Decision**: Minimum withdrawal amount is **₹500.00** (`50,000 paise`).
- **Processing**: Payouts are dispatched to a validated UPI VPA (e.g., `alex.morgan@oksbi`) via RazorpayX Payouts. The amount is locked in MongoDB during processing. If RazorpayX emits `payout.failed` or `payout.reversed`, the funds are automatically refunded to the user's earnings balance.

### 8. 5-Report / 1-Hour Automated 24h Ban Policy & Mutual Exclusion
- **Decision**: If a user receives reports from **5 unique reporters within a rolling 60-minute window**, the server automatically bans the account for **24 hours** (`is_banned = true`, `banned_until = now + 24h`).
- **Immediate Action**: Any active video call is immediately terminated, the offender's socket is severed, and all future requests return `403 Forbidden`.
- **Mutual Exclusion**: Filing a report against a user automatically creates a 24-hour mutual block in Redis and MongoDB, guaranteeing the two users will never be matched again.

### 9. Safety Branding & Legal Compliance Copy
- **Decision**: Replace all explicit or legally risky tags with proactive safety branding:
  - *"Strictly No Nudity"*
  - *"Respect Others & Play Fair"*
  - *"18+ Verified Adult Community"*
- This preserves legal standing with regulatory bodies and adheres to app store developer policies.

### 10. WebRTC STUN-Only Traversal & Transition to TURN
- **Decision**: The initial version uses public Google STUN servers (`stun:stun.l.google.com:19302`).
- **Known Limitation**: In strict symmetric NAT configurations or restricted corporate/university firewalls (approximately 10–15% of mobile connections), direct P2P hole-punching may fail.
- **Mitigation & Roadmap**: The WebRTC client implements connection timeout detection (8 seconds without ICE connection state `connected`). When connection fails, the user is politely alerted and returned to the search queue. Phase 2 provisions a self-hosted `coturn` instance or Metered.ca TURN server.
