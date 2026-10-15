# Donkey Play — REST API & Socket.IO Realtime Interface Specification

This document defines the complete API contract for **Donkey Play**, covering all REST endpoints (`/api/v1/*`), real-time Socket.IO events, request/response schemas, error codes, and Swagger UI integration.

---

## 1. API Architecture & Standards

- **Base URL**: `/api/v1` (e.g. `http://localhost:5000/api/v1` or `https://api.donkeyplay.com/api/v1`)
- **Interactive Swagger Documentation**: Exposed at `/api/docs` in the Express server.
- **Specification Format**: OpenAPI 3.1 (`openapi/donkey-play.openapi.yaml`).
- **Content Type**: `application/json` (UTF-8).
- **Authentication**: JWT via secure HttpOnly cookies (`dp_access_token`) or `Authorization: Bearer <token>`.
- **Validation**: Strict runtime validation using Zod. Unrecognized query parameters or payload properties are rejected or stripped.

### 1.1 Standard JSON Response Envelope

#### Successful Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_COINS",
    "message": "You need at least 1 coin to use gender-filtered matching",
    "details": []
  }
}
```

---

## 2. REST Endpoints Catalog

### 2.1 Authentication Module (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/otp/send` | Public | Send 6-digit verification code to user email |
| `POST` | `/auth/otp/verify` | Public | Verify code, auto-register first-time user, issue JWT cookies |
| `POST` | `/auth/google` | Public | Verify Google ID Token, auto-register, issue JWT cookies |
| `POST` | `/auth/refresh` | Cookie | Rotate access token using valid `dp_refresh_token` |
| `POST` | `/auth/logout` | Session | Clear session cookies, delete Redis heartbeat |
| `GET` | `/auth/me` | Bearer/Cookie | Return authenticated user identity & standing |

---

### 2.2 Users & Profile Module (`/api/v1/users`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/users/me` | Bearer/Cookie | Retrieve current user profile and preferences |
| `PATCH` | `/users/me` | Bearer/Cookie | Update user profile (display name, bio, gender, age) |
| `POST` | `/users/me/avatar/sign` | Bearer/Cookie | Generate signed Cloudinary upload params |
| `GET` | `/users/:id` | Bearer/Cookie | Fetch public profile of a user |
| `PATCH` | `/users/me/preferences`| Bearer/Cookie | Update matching and calling preferences |

---

### 2.3 Matchmaking Module (`/api/v1/matching`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/matching/presence` | Public/Auth | Return total count of unique active online users |
| `POST` | `/matching/queue/join` | Bearer/Cookie | Join matchmaking queue (HTTP fallback) |
| `POST` | `/matching/queue/leave`| Bearer/Cookie | Cancel search & release any reserved coins |

---

### 2.4 Conversations & Inbox Module (`/api/v1/conversations`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/conversations` | Bearer/Cookie | List previous call partners (paginated) |
| `GET` | `/conversations/:id` | Bearer/Cookie | Get conversation details with partner user profile |
| `DELETE` | `/conversations/:id` | Bearer/Cookie | Soft-delete conversation from current user's inbox |
| `POST` | `/conversations/:id/call`| Bearer/Cookie | Initiate direct 1-coin call to former partner |

---

### 2.5 Video Calls Module (`/api/v1/calls`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/calls/:sessionId` | Bearer/Cookie | Fetch call room status & participant details |
| `POST` | `/calls/:sessionId/end` | Bearer/Cookie | End call session (enforces 5-second minimum) |

---

### 2.6 Wallet & Payments Module (`/api/v1/wallet`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/wallet/balance` | Bearer/Cookie | Return purchased coins and withdrawable paise balances |
| `GET` | `/wallet/packages` | Public/Auth | List available coin purchase packages |
| `POST` | `/wallet/orders` | Bearer/Cookie | Create Razorpay payment order for selected package |
| `POST` | `/wallet/orders/verify` | Bearer/Cookie | Verify signature and credit purchased coins |
| `POST` | `/wallet/webhook` | Webhook | Razorpay webhook listener for order events |
| `GET` | `/wallet/transactions` | Bearer/Cookie | Paginated ledger transaction history |
| `POST` | `/wallet/withdrawals` | Bearer/Cookie | Request UPI cash withdrawal (min ₹500) |
| `GET` | `/wallet/withdrawals` | Bearer/Cookie | List payout history and status |
| `POST` | `/wallet/webhook/payout`| Webhook | RazorpayX webhook for payout status updates |

---

### 2.7 Gifts Module (`/api/v1/gifts`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/gifts` | Public/Auth | Get active virtual gifts catalog and prices |
| `POST` | `/gifts/send` | Bearer/Cookie | Send virtual gift during an active video call |

---

### 2.8 Moderation & Safety Module (`/api/v1/moderation`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/moderation/reports` | Bearer/Cookie | Report a user (triggers 24h mutual block + ban check) |
| `POST` | `/moderation/blocks` | Bearer/Cookie | Block a user permanently from matching |
| `DELETE` | `/moderation/blocks/:id` | Bearer/Cookie | Unblock a previously blocked user |
| `GET` | `/moderation/blocks` | Bearer/Cookie | List currently blocked users |

---

## 3. Real-Time Socket.IO Protocol

Socket.IO handles real-time signaling, queue status, ephemeral in-call chat, and presence tracking.

### 3.1 Namespaces & Connection Handshake
- **Namespaces**:
  - `/signaling` — WebRTC SDP Offer/Answer, ICE candidates, ephemeral chat, in-call gifts.
  - `/matchmaking` — Queue joining, state updates, match handshake.
- **Authentication**: JWT token sent in query param or auth handshake object:
  ```javascript
  const socket = io('/signaling', {
    auth: { token: 'jwt_access_token' },
    transports: ['websocket']
  });
  ```

### 3.2 Client-to-Server Events

| Event Name | Namespace | Payload Schema | Description |
|---|---|---|---|
| `heartbeat_ping` | `/` or `/signaling` | `{ "userId": string }` | Sent every 25s to keep presence lease alive |
| `join_queue` | `/matchmaking` | `{ "filter": "ANY" \| "MALE" \| "FEMALE" }` | Enters matchmaking pool |
| `leave_queue` | `/matchmaking` | `{}` | Leaves queue, releases coin reservation |
| `accept_match` | `/matchmaking` | `{ "sessionId": string }` | Confirms paired match (within 10s) |
| `webrtc_offer` | `/signaling` | `{ "sessionId": string, "sdp": object }` | Transmits WebRTC SDP Offer to peer |
| `webrtc_answer` | `/signaling` | `{ "sessionId": string, "sdp": object }` | Transmits WebRTC SDP Answer to peer |
| `ice_candidate` | `/signaling` | `{ "sessionId": string, "candidate": object }` | Exchanges ICE candidate information |
| `in_call_message`| `/signaling` | `{ "sessionId": string, "text": string }` | Sends ephemeral chat message to peer |
| `send_gift` | `/signaling` | `{ "sessionId": string, "giftId": string }` | Triggers gift transfer during call |
| `leave_call` | `/signaling` | `{ "sessionId": string }` | Exits call (subject to 5-sec minimum check) |

### 3.3 Server-to-Client Events

| Event Name | Namespace | Payload Schema | Description |
|---|---|---|---|
| `presence_update` | Global | `{ "onlineCount": number }` | Emitted periodically with true unique user count |
| `queue_joined` | `/matchmaking` | `{ "status": "SEARCHING", "queue": string }` | Confirms queue placement |
| `match_found` | `/matchmaking` | `{ "sessionId": string, "partnerName": string, "partnerAvatar": string, "timeout": 10 }` | Paired candidate found |
| `call_ready` | `/matchmaking` | `{ "sessionId": string, "isCaller": boolean }` | Both peers accepted; join `/signaling` |
| `webrtc_offer` | `/signaling` | `{ "sessionId": string, "sdp": object }` | Relayed SDP offer from remote peer |
| `webrtc_answer` | `/signaling` | `{ "sessionId": string, "sdp": object }` | Relayed SDP answer from remote peer |
| `ice_candidate` | `/signaling` | `{ "sessionId": string, "candidate": object }` | Relayed ICE candidate from remote peer |
| `in_call_message`| `/signaling` | `{ "senderName": string, "text": string, "timestamp": string }` | Relayed ephemeral message |
| `gift_received` | `/signaling` | `{ "giftId": string, "giftName": string, "senderName": string, "earnedPaise": number }` | Triggers visual animation overlay |
| `peer_left` | `/signaling` | `{ "sessionId": string, "reason": string }` | Peer disconnected or ended call |
| `call_ended` | `/signaling` | `{ "sessionId": string, "durationSec": number }` | Call teardown finalized |
| `error` | Any | `{ "code": string, "message": string }` | Realtime operation error |

---

## 4. Standard Error Codes Catalog

| Error Code | HTTP Status | Description | User Action / Handling |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | Missing, expired, or invalid JWT token | Trigger token refresh or prompt login |
| `FORBIDDEN_BANNED` | 403 | User account is currently banned | Display ban screen with `banned_until` date |
| `INVALID_OTP` | 400 | OTP code does not match | Prompt user to retry code |
| `OTP_EXPIRED` | 400 | OTP is older than 5 minutes | Request a new OTP |
| `MAX_ATTEMPTS_EXCEEDED`| 429 | Exceeded 3 OTP verification attempts | Wait for cooldown and request fresh code |
| `RATE_LIMIT_EXCEEDED` | 429 | Cooldown violation (e.g. < 60s for OTP) | Show countdown timer to user |
| `INSUFFICIENT_COINS` | 402 | User has 0 coins for paid action | Open Coin Purchase modal |
| `INSUFFICIENT_EARNINGS`| 400 | Earnings below ₹500 withdrawal threshold | Accumulate more gift earnings |
| `MIN_DURATION_NOT_MET`| 400 | User tried to leave call before 5s elapsed | Keep Leave button disabled on UI |
| `USER_NOT_FOUND` | 404 | User ID does not exist | Verify user identifier |
| `ALREADY_IN_QUEUE` | 409 | User is already searching in a queue | Cancel active search first |
| `PAYMENT_VERIFY_FAILED`| 400 | Razorpay signature mismatch | Contact support or retry payment |
| `INVALID_UPI_ID` | 400 | UPI VPA does not match standard pattern | Re-enter valid UPI VPA |
| `ACTIVE_WITHDRAWAL_EXISTS`| 409 | Existing withdrawal in progress | Wait for pending withdrawal to settle |
