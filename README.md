# Donkey Play (Stranger Connect)

<div align="center">

> **Chat. Connect. Play.**  
> A high-performance, mobile-first WebRTC random video matching platform featuring per-user call permissions, virtual gifts economy, referral rewards, safety moderation, and automated CI/CD deployments.

[![CI Pipeline](https://github.com/donkey-play/stranger-connect/actions/workflows/ci.yml/badge.svg)](https://github.com/donkey-play/stranger-connect/actions/workflows/ci.yml)
[![Deploy API](https://github.com/donkey-play/stranger-connect/actions/workflows/deploy-api.yml/badge.svg)](https://github.com/donkey-play/stranger-connect/actions/workflows/deploy-api.yml)
[![Deploy Web](https://github.com/donkey-play/stranger-connect/actions/workflows/deploy-web.yml/badge.svg)](https://github.com/donkey-play/stranger-connect/actions/workflows/deploy-web.yml)
![Node Version](https://img.shields.io/badge/node-22.x-brightgreen.svg)
![Next.js](https://img.shields.io/badge/next.js-15.3-black.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.8-blue.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

</div>

---

## 1. Architecture & Tech Stack

```mermaid
flowchart TD
    Client["Next.js 15 Web App (React 19 / Vercel)"]
    API["Express Modular Monolith (Docker / Node 22)"]
    Redis[("Redis 7 Cache & Presence")]
    Mongo[("MongoDB Atlas Database")]
    STUN["Google STUN Servers (WebRTC P2P)"]
    Brevo["Brevo Email OTP API"]
    Razorpay["Razorpay Payments"]
    Cloudinary["Cloudinary CDN"]

    Client <-->|HTTPS REST / Cookies| API
    Client <-->|WSS Socket.IO Signaling| API
    Client <-->|Direct WebRTC P2P Stream| STUN
    API <-->|Presence / Queues / Locks| Redis
    API <-->|Domain Entities / Ledger| Mongo
    API -->|Email Delivery| Brevo
    API -->|Payment Verification| Razorpay
    Client -->|Direct Signed Uploads| Cloudinary
```

- **Monorepo Manager:** [Turborepo](https://turbo.build/) with [pnpm](https://pnpm.io/) workspaces.
- **Frontend (`apps/web`):** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Lucide icons.
- **Backend (`apps/api`):** Node.js 22, Express.js (Clean Architecture & Modular Monolith), TypeScript, Socket.IO.
- **Data & Caching:**
  - **MongoDB + Mongoose:** Users, Profiles, Conversations, Gifts, Wallets, Transactions, Reports, Blocks.
  - **Redis 7:** Online presence, matchmaking queues, temporary coin reservations, 5-second call locks, rolling 1-hour abuse counters.
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

## 2. Core Features & Business Rules

### 2.1 1-on-1 WebRTC Video Chat
- **Instant Radar Matching:** Fast pairing based on preferences (gender filter reserves 1 coin; free for open matching).
- **Safety Lock Timer:** 10-second countdown lock on the leave button prevents instant skips.
- **Anti-Flicker In-Call Messaging:** Users can text during active video calls without local or remote camera streams flickering or reloading.
- **Privacy Controls:** Emergency report, user block, and privacy blur shield.

### 2.2 Per-User Video Call Permissions
- **Disabled by Default:** The direct Video Call button in message chats is disabled by default to protect user privacy.
- **In-Chat Permission Toggle:** Users can open any conversation chat box and click `Allow Call: [ON / OFF]`.
- **Dynamic Activation:** As soon as the other user enables calls in their chat, the opposite user's Video Call button dynamically unlocks and activates.

### 2.3 Virtual Gifts & Creator Economy
- **Animated Gifts:** Send virtual gifts (Rose, Coffee, Chocolate, Crown, Super Car, Luxury Yacht, etc.) during calls or via chat.
- **Revenue Split:** 70% of gift value is credited as creator earnings to the recipient's wallet; 30% is retained as the platform fee.

### 2.4 Referral Program & Coin Wallet Rules
- **Referral Rewards:** Referrers receive **10 bonus coins** when a new user signs up using their referral link (supports Email OTP and Google OAuth).
- **Non-Withdrawable Coins:** Purchased coins and referral reward coins cannot be withdrawn.
- **Gift Earnings Withdrawal:** Only creator gift earnings can be withdrawn to a verified UPI ID.
- **Minimum Withdrawal Limit:** Instant withdrawal option enables exclusively when gift earnings reach **₹500**.
- **Secure UPI ID Management:** Locked UPI ID input with dedicated edit and verification controls.

### 2.5 Safety, Moderation & Anti-Abuse
- **Automated 24h Ban:** 5 unique abuse reports against a user within a rolling 1-hour window (tracked via Redis Sorted Sets) trigger an automated 24-hour account suspension.
- **Mutual 24h Block:** Reporting a user automatically creates a mutual 24-hour block preventing future matching.
- **Ephemeral In-Call Chat:** Messages exchanged during active calls are relayed purely in-memory via WebSockets and are never stored in the database.

---

## 3. Monorepo Directory Structure

```text
donkey-play/
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Automated Lint, Typecheck, Test & Build Check
│       ├── deploy-api.yml             # CD for Backend (Docker on Server with Auto-Install)
│       └── deploy-web.yml             # CD for Frontend (Vercel Production Deployment)
├── apps/
│   ├── web/                           # Next.js 15 Frontend
│   │   ├── src/
│   │   │   ├── app/                   # App Router layout, providers & pages
│   │   │   ├── features/              # Feature modules (auth, chat, gifts, matching, etc.)
│   │   │   └── shared/                # Layouts, UI primitives, hooks & HTTP client
│   └── api/                           # Express Modular Monolith Backend
│       ├── src/
│       │   ├── common/                # Middleware (Auth, Errors), AppError classes
│       │   ├── config/                # Environment, DB, Redis, Swagger configs
│       │   ├── modules/               # Domain modules (auth, users, conversations, wallet, etc.)
│       │   ├── app.ts                 # Express routes, helmet, cors, cookies
│       │   └── server.ts              # HTTP + Socket.IO server startup
│       └── tests/                     # Vitest unit & integration test suites
├── packages/
│   ├── shared-types/                  # Shared TypeScript interfaces & models
│   ├── validation/                    # Shared Zod validation schemas
│   └── typescript-config/             # Base tsconfig presets
├── Dockerfile                         # Production multi-stage Docker build for API
├── docker-compose.yml                 # Local Redis service
├── docker-compose.prod.yml            # Production compose file for API & Redis
├── pnpm-workspace.yaml
├── turbo.json
└── package.json
```

---

## 4. Environment Variables Reference

### 4.1 Backend (`apps/api/.env`)
| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | API Server Port | `5000` |
| `NODE_ENV` | Runtime environment | `development` / `production` |
| `MONGO_URI` | MongoDB Connection String | `mongodb://localhost:27017/donkey_play` |
| `REDIS_HOST` | Redis Server Host | `localhost` / `redis` |
| `REDIS_PORT` | Redis Server Port | `6379` |
| `REDIS_PASSWORD`| Redis Auth Password (optional) | |
| `JWT_SECRET` | Secret key for access token signing | min 32 chars |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens | min 32 chars |
| `CORS_ALLOWED_ORIGINS` | Allowed origins (comma-separated) | `http://localhost:3000,https://yourdomain.com` |
| `BREVO_API_KEY` | Brevo API key for Email OTPs | `xkeysib-...` |
| `BREVO_SENDER_EMAIL` | Sender email address | `no-reply@yourdomain.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `...apps.googleusercontent.com` |
| `CLOUDINARY_URL` | Cloudinary signed URL credentials | `cloudinary://key:secret@cloudname` |
| `RAZORPAY_KEY_ID` | Razorpay Key ID | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret | `...` |
| `platform_commision_gift` | Platform commission percentage deducted from gifts | `30` (30% fee, 70% to creator) |
| `referral_coins_amount` | Referral reward coins given to referrer upon signup | `10` |

### 4.2 Frontend (`apps/web/.env.local`)
| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Backend REST API endpoint | `http://localhost:5000/api/v1` |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO signaling server endpoint | `http://localhost:5000` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth Web Client ID | `...apps.googleusercontent.com` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay Public Key ID | `rzp_test_...` |

---

## 5. Local Development Setup

### 5.1 Prerequisites
- **Node.js:** `>= 20.x` (Recommended: Node 22)
- **pnpm:** `12.x` (Configured via `corepack enable`)
- **Docker & Docker Compose:** For running local Redis

### 5.2 Step-by-Step Setup
1. **Clone the repository:**
   ```bash
   git clone https://github.com/donkey-play/stranger-connect.git
   cd stranger-connect
   ```

2. **Enable pnpm and install dependencies:**
   ```bash
   corepack enable
   pnpm install
   ```

3. **Start local Redis service:**
   ```bash
   docker compose up -d redis
   ```

4. **Setup environment files:**
   ```bash
   cp .env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

5. **Run test suites:**
   ```bash
   pnpm turbo test
   ```

6. **Start both frontend and backend in watch mode:**
   ```bash
   pnpm turbo dev
   ```
   - Frontend is accessible at: `http://localhost:3000`
   - Backend API is accessible at: `http://localhost:5000`
   - Swagger Documentation: `http://localhost:5000/api/docs`

---

## 6. CI/CD & Automated Deployment

The project includes pre-configured GitHub Actions workflows for continuous integration and zero-downtime continuous deployment:

```mermaid
flowchart LR
    Push["Push / PR to GitHub"] --> CI["ci.yml: Lint, Typecheck, Test, Build"]
    Push --> CheckBranch{"Branch == main / master?"}
    CheckBranch -->|Changes in apps/api/**| CD_API["deploy-api.yml (SSH / Docker)"]
    CheckBranch -->|Changes in apps/web/**| CD_WEB["deploy-web.yml (Vercel)"]
    CD_API --> Server["Server: Auto-Install Docker -> Run Containers"]
    CD_WEB --> Vercel["Vercel: Pull & Deploy Production Web"]
```

### 6.1 Workflows Overview
1. **`.github/workflows/ci.yml`**:
   - Triggers on every push and pull request across all branches.
   - Runs `pnpm turbo lint`, `pnpm turbo typecheck`, backend Vitest tests, frontend Vitest tests, and monorepo build verification.

2. **`.github/workflows/deploy-api.yml` (Backend Server Deployment)**:
   - Triggers only on push to `main` when `apps/api/**` or shared dependencies change.
   - Validates tests and build.
   - Connects to your deployment server over SSH.
   - **Automated Docker Provisioning**: Detects if Docker and Docker Compose are installed on the server; if missing, automatically installs and enables them.
   - Pulls the latest code, injects configuration, builds the Docker image, runs the containers via `docker-compose.prod.yml`, and verifies `/health/readiness`.

3. **`.github/workflows/deploy-web.yml` (Frontend Vercel Deployment)**:
   - Triggers only on push to `main` when `apps/web/**` or shared packages change.
   - Runs typecheck and tests.
   - Pulls the newest code and deploys to production on **Vercel** with instant cache purging.

### 6.2 Required GitHub Repository Secrets

Configure the following secrets in **GitHub Repository Settings > Secrets and variables > Actions**:

#### Server SSH (For Backend Deployment)
- `SERVER_HOST`: Public IP address or domain of your backend server.
- `SERVER_USER`: SSH user (e.g., `ubuntu`, `debian`, `root`).
- `SERVER_SSH_KEY`: Private SSH key for server access.
- `SERVER_PORT`: SSH port (Default: `22`).
- `DEPLOY_DIR`: Target deployment folder on the server (Default: `~/stranger_connect`).
- `API_ENV_FILE`: Contents of your production `apps/api/.env` file.

#### Vercel (For Frontend Deployment)
- `VERCEL_TOKEN`: Vercel personal access token (Generate from [Vercel Account Tokens](https://vercel.com/account/tokens)).
- `VERCEL_ORG_ID`: Your Vercel Organization / User ID (Found in project `.vercel/project.json` or team settings).
- `VERCEL_PROJECT_ID`: Your Vercel Project ID.

---

## 7. Healthchecks & Diagnostics

The backend includes built-in diagnostic and health monitoring endpoints:

- `GET /health` or `GET /api/v1/health`: Returns API service status and process uptime.
- `GET /health/liveness` or `GET /api/v1/health/liveness`: Process liveness check for Kubernetes/Docker.
- `GET /health/readiness` or `GET /api/v1/health/readiness`: Verifies active connection status and latency for both **MongoDB** and **Redis**.

```bash
# Example readiness check response:
curl -s http://localhost:5000/health/readiness | jq .
{
  "status": "UP",
  "services": {
    "mongo": { "status": "UP", "readyState": 1, "latencyMs": 4 },
    "redis": { "status": "UP", "latencyMs": 3 }
  },
  "timestamp": "2026-10-15T07:44:19.547Z"
}
```

---

## 8. License

This project is licensed under the [MIT License](LICENSE).
