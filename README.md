# Donkey Play

> **Chat. Connect. Play.**  
> A mobile-first social discovery, random matching, and one-to-one video calling platform designed with safety, modern aesthetics, and real-time responsiveness.

---

## 1. Architecture & Tech Stack

- **Monorepo Manager:** [Turborepo](https://turbo.build/) with [pnpm](https://pnpm.io/) workspaces.
- **Frontend (`apps/web`):** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons.
- **Backend (`apps/api`):** Node.js, Express.js (Modular Monolith), TypeScript, Socket.IO.
- **Data & Cache:**
  - **MongoDB + Mongoose:** Users, Profiles, Conversations, Gifts, Wallets, Transactions, Reports, Blocks.
  - **Redis 7:** Online presence, matchmaking queues, temporary coin reservations, 5-second call timers, rolling 1-hour abuse counters.
- **Real-Time & Media:**
  - **Socket.IO:** Real-time presence, queue notifications, signaling (`/signaling` namespace), ephemeral in-call chat relay.
  - **WebRTC:** Peer-to-peer 1-on-1 video & audio with Google STUN (`stun:stun.l.google.com:19302`).
- **External Integrations:**
  - **Brevo API:** Transactional Email OTP authentication.
  - **Google Identity Services:** OAuth token verification & automatic onboarding.
  - **Cloudinary:** Signed uploads for user avatars and gallery photos.
  - **Razorpay:** Order creation and HMAC-SHA256 verified coin package top-ups.
- **API Documentation:** OpenAPI 3.1 & Swagger UI at `/api/docs`.

---

## 2. Product Rules & System Invariants

1. **Zero Withdrawals Policy:**  
   The creator earnings wallet UI is strictly informational. No withdrawal endpoints, banking schemas, or UPI payout rails exist.
2. **STUN-Only WebRTC:**  
   Calls utilize Google public STUN servers (`stun:stun.l.google.com:19302`). Zero TURN servers or media server dependencies.
3. **5-Second Server Call Lock:**  
   Calls enforce a 5-second minimum duration via Redis keys (`call:timer:<sessionId>`). Early skip attempts are rejected with `400 Bad Request` unless an emergency safety report is filed.
4. **Matchmaking Coin Reservation:**  
   Random matching is free (0 coins). Gender filtering reserves 1 coin during queuing; the coin is debited only upon successful connection and automatically refunded/cancelled on exit.
5. **Ephemeral In-Call Chat:**  
   Messages exchanged during active calls are relayed purely in-memory via Socket.IO events and never written to persistent databases. Call connections automatically initialize conversation records in the Messages inbox.
6. **Automated Abuse Ban:**  
   5 unique abuse reports against a user within a rolling 1-hour window (tracked in Redis ZSETs) automatically enact a 24-hour account suspension.

---

## 3. Monorepo Structure

```text
donkey-play/
├── apps/
│   ├── web/                           # Next.js 15 Frontend
│   │   ├── src/
│   │   │   ├── app/                   # App Router layout, providers & pages
│   │   │   ├── features/              # Feature-driven UI modules
│   │   │   │   ├── auth/              # OTP & Google Sign-In modals, auth hook
│   │   │   │   ├── matching/          # Radar animation, queue filter, socket sync
│   │   │   │   ├── video-call/        # WebRTC stream views, timer, controls
│   │   │   │   ├── chat/              # Messages inbox & direct conversation
│   │   │   │   ├── profile/           # Profile views, edit modals, Cloudinary sign
│   │   │   │   ├── wallet/            # Coin packages, Razorpay checkout, ledger
│   │   │   │   ├── gifts/             # Virtual gifts catalog & animations
│   │   │   │   ├── moderation/        # User report modal & block management
│   │   │   │   └── settings/          # Account settings & community standards
│   │   │   └── shared/                # Layouts, UI primitives, hooks & HTTP client
│   └── api/                           # Express Modular Monolith Backend
│       ├── src/
│       │   ├── config/                # Environment, DB, Redis & Cloudinary configs
│       │   ├── common/                # Middleware (Auth, Errors), AppError classes
│       │   ├── modules/               # Domain modules
│       │   │   ├── auth/              # OTP, Google auth, token issuance
│       │   │   ├── users/             # Profile, photos, preferences
│       │   │   ├── matching/          # Redis presence, queues, locks, Socket.IO
│       │   │   ├── conversations/     # Inbox, direct call endpoints
│       │   │   ├── wallet/            # Ledger, Razorpay verification
│       │   │   ├── gifts/             # Catalog, coin transfer & creator earnings
│       │   │   └── moderation/        # Reports, 24h ban logic, mutual blocks
│       │   ├── app.ts                 # Express routes, helmet, cors, cookies
│       │   └── server.ts              # HTTP + Socket.IO server startup
├── packages/
│   ├── shared-types/                  # Shared TypeScript interfaces & models
│   ├── validation/                    # Zod schemas for requests & responses
│   └── typescript-config/             # Base tsconfig presets
├── docs/                              # Architecture, DB, API & security docs
├── openapi/                           # donkey-play.openapi.yaml
├── docker-compose.yml                 # MongoDB 7 & Redis 7 services
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 4. Quick Start Guide

### 4.1 Prerequisites
- **Node.js:** `>= 20.x`
- **pnpm:** `>= 9.x`
- **Docker & Docker Compose:** For running local MongoDB and Redis instances.

### 4.2 Start Databases
Spin up local MongoDB 7 and Redis 7 containers:
```bash
docker compose up -d
```

### 4.3 Install Dependencies
Install all workspace dependencies across apps and shared packages:
```bash
pnpm install
```

### 4.4 Configure Environment Variables
Copy and customize `.env` files for both applications:
```bash
cp .env.example .env
```

Key environment configurations:
- **Backend (`apps/api`):** Default runs on port `5000` (`PORT=5000`, `MONGODB_URI=mongodb://localhost:27017/donkey_play`, `REDIS_URL=redis://localhost:6379`).
- **Frontend (`apps/web`):** Default runs on port `3000` (`NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1`, `NEXT_PUBLIC_SOCKET_URL=http://localhost:5000`).

### 4.5 Start in Development Mode
Launch both frontend and backend concurrently via Turborepo:
```bash
pnpm dev
```
Or start individually:
```bash
# Start Backend API (http://localhost:5000)
pnpm --filter api dev

# Start Frontend Web (http://localhost:3000)
pnpm --filter web dev
```

Interactive Endpoints:
- **Web App:** [http://localhost:3000](http://localhost:3000)
- **API Health:** [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)
- **Swagger Documentation:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)

---

## 5. Verification & Testing

Every module includes Vitest automated test suites with both in-memory unit tests and integration tests.

```bash
# Run all tests across workspace (83+ tests)
pnpm test

# Run TypeScript typechecks
pnpm typecheck

# Run ESLint validation
pnpm lint

# Build production artifacts
pnpm build
```

---

## 6. Safety & Community Guidelines

Donkey Play is an adult (18+) social platform. All interactions adhere strictly to our safety policies:
- **Strictly No Nudity:** Zero tolerance for nudity or sexually explicit conduct during video calls.
- **Respect Others:** Harassment, hate speech, and abusive conduct trigger immediate bans.
- **Quick Exit & Emergency Reporting:** One-tap emergency reporting bypasses call locks and triggers mutual 24-hour blocks.
