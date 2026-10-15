# Donkey Play — Authentication, Authorization & Security Architecture

This document establishes the security, authentication, authorization, and moderation specifications for **Donkey Play**.

---

## 1. Authentication Architecture

Donkey Play features a frictionless, passwordless onboarding experience. Users authenticate via **Brevo Email OTP** or **Google Sign-In**. In both flows, **first-time authentication automatically creates the user account**; no separate registration flow is required.

---

### 1.1 Brevo Email OTP Authentication

#### Step-by-Step Security Lifecycle
1. **Request Dispatch (`POST /api/v1/auth/otp/send`)**:
   - Client sends `{ "email": "user@example.com" }`.
   - Backend normalizes email (`lowercase`, `trim`).
   - Checks Redis rate limit: `ratelimit:otp:email:<email>` (60-second cooldown) and `ratelimit:otp:ip:<ip>` (max 10 requests/hour).
   - Generates a cryptographically secure 6-digit numeric OTP via `crypto.randomInt(100000, 999999)`.
   - Computes SHA-256 hash of the OTP and stores it in Redis:
     - Key: `auth:otp:<email>`
     - Hash field: `hash` (SHA-256 string)
     - Hash field: `attempts` (`0`)
     - TTL: 300 seconds (5 minutes)
   - Transmits email using the **Brevo API (v3 transactional email)** with an authenticated sender domain (SPF/DKIM/DMARC compliant).

2. **Verification & Auto-Registration (`POST /api/v1/auth/otp/verify`)**:
   - Client sends `{ "email": "user@example.com", "code": "123456" }`.
   - Server fetches `auth:otp:<email>`.
   - If `attempts >= 3`, deletes key and returns `400 Bad Request` with code `MAX_ATTEMPTS_EXCEEDED`.
   - Computes SHA-256 of submitted code and performs a constant-time comparison (`crypto.timingSafeEqual`) against the stored hash.
   - On match:
     - Deletes `auth:otp:<email>` immediately.
     - Queries MongoDB for an existing user with this email.
     - **If user does not exist**:
       - Creates new `User` with default display name (e.g., `Player_7182`), `age: 18`, `gender: "PREFER_NOT_TO_SAY"`, `role: "USER"`.
       - Creates default `UserPreferences` record.
       - Creates `Wallet` record with `0` coins and `0` paise.
     - **If user exists**:
       - Checks if account is banned (`is_banned === true`). If active ban exists, aborts with `403 Forbidden`.
       - Updates `last_login_at = new Date()`.
     - Issues JWT tokens and sets secure HTTP cookies.

---

### 1.2 Google OAuth 2.0 / Google Identity Services

#### Security Lifecycle
1. **Client Interaction**: Client loads Google Identity Services SDK, displays one-tap or sign-in button, and receives an authorized Google ID Token (JWT).
2. **Backend Verification (`POST /api/v1/auth/google`)**:
   - Client sends `{ "id_token": "<google_jwt>" }`.
   - Server verifies the token signature against Google's public JWKS using `google-auth-library`:
     ```typescript
     const ticket = await googleClient.verifyIdToken({
       idToken: body.id_token,
       audience: process.env.GOOGLE_CLIENT_ID
     });
     const payload = ticket.getPayload();
     ```
   - Checks `payload.email_verified === true`.
   - Queries MongoDB by `google_id: payload.sub` OR `email: payload.email`.
   - **Auto-Registration**: If not found, initializes new User with `display_name: payload.name`, `avatar_url: payload.picture`, `email: payload.email`, `google_id: payload.sub`, and initializes preferences and wallet.
   - Issues JWT tokens and sets secure cookies.

---

## 2. Session Management & Token Strategy

Donkey Play uses **stateless JWT tokens stored in HttpOnly, Secure, SameSite=Strict cookies** to provide seamless browser security and protect against Cross-Site Scripting (XSS) and Cross-Site Request Forgery (CSRF).

### 2.1 Token Specifications

| Token | Payload | Expiry | Cookie Name | Flags |
|---|---|---|---|---|
| **Access Token** | `{ sub: userId, role, isBanned }` | 15 minutes | `dp_access_token` | `HttpOnly; Secure; SameSite=Strict; Path=/` |
| **Refresh Token** | `{ sub: userId, tokenVersion }` | 7 days | `dp_refresh_token` | `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` |

### 2.2 Token Refresh Flow (`POST /api/v1/auth/refresh`)
- Web client's Axios/Fetch interceptor intercepts `401 Unauthorized`.
- Makes request to `/api/v1/auth/refresh` (browser automatically attaches `dp_refresh_token` cookie).
- Server verifies refresh token signature and checks `tokenVersion` against user's record in MongoDB.
- Issues fresh 15-minute access token in `dp_access_token` cookie.

### 2.3 Logout & Revocation (`POST /api/v1/auth/logout`)
- Clears both cookies (`Max-Age=0`).
- Removes user's active session lease in Redis (`DEL presence:heartbeat:<userId>`).
- Client disconnects all Socket.IO connections.

---

## 3. Third-Party Integrations Security

### 3.1 Cloudinary Signed Upload Presets
To prevent unauthorized users from uploading arbitrary files to Cloudinary, **direct unauthenticated uploads are prohibited**.
1. Client requests signed upload parameters via `POST /api/v1/users/me/avatar/sign`.
2. Backend generates a cryptographic signature using `cloudinary.utils.api_sign_request`:
   - Enforces target folder: `donkey_play/avatars/`
   - Allowed formats: `jpg`, `png`, `webp`
   - Max file size: `5 MB`
   - Timestamp with 15-minute expiry
   - Eager transformation: `c_fill,w_500,h_500,g_face,q_auto,f_webp`
3. Client uploads directly to Cloudinary using the signature.
4. Client then updates profile with the secure URL via `PATCH /api/v1/users/me`.

### 3.2 Razorpay Webhook Signature Verification
To prevent forged payment credit attacks:
1. Razorpay webhook endpoint (`POST /api/v1/wallet/webhook`) reads the raw, unparsed request body.
2. Extracts `X-Razorpay-Signature` request header.
3. Computes HMAC SHA-256 over raw body using `RAZORPAY_WEBHOOK_SECRET`:
   ```typescript
   const expectedSignature = crypto
     .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
     .update(rawBody)
     .digest('hex');

   if (!crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(receivedSignature))) {
     throw new UnauthorizedException('Invalid webhook signature');
   }
   ```
4. Checks idempotency using Redis: `SETNX idempotency:pay:<payment_id> "1"` (TTL 24h). If key already exists, returns `200 OK` without re-crediting coins.

---

## 4. Community Safety, Moderation & Ban Architecture

### 4.1 Safety Messaging & Legal Compliance
Donkey Play operates with a strict, proactive safety policy designed to comply with global regulations and avoid app store rejections:
- **Core Messaging**:
  - *"Strictly No Nudity"*
  - *"Respect Others & Play Fair"*
  - *"18+ Verified Adult Community"*
- Explicit mentions of provocative/exploitative terms are banned from marketing and UI banners. The Sunset Flame (`#FF5A1F`) design highlights clear safety badges on match and call screens.

### 4.2 Automated 5-Report / 1-Hour Rolling Ban Rule
To protect users from malicious actors in real time without waiting for manual human moderation:
1. When user A files a report against user B:
   - A MongoDB `reports` record is created.
   - An automatic 24-hour mutual block is established between user A and user B (`SADD block:<userA> <userB>`, `SADD block:<userB> <userA>`), ensuring they can never match or call each other again.
2. The report is recorded in Redis using Lua script `report_rate_limit_and_ban.lua` under key `reports:target:<userB>` with score = current timestamp.
3. **Threshold Check**: If **5 distinct users** file reports against user B within any rolling 60-minute window:
   - The server immediately flags `users.is_banned = true` and `users.banned_until = Date.now() + 24 * 60 * 60 * 1000`.
   - The server instantly terminates any active WebRTC call user B is participating in.
   - User B's active Socket.IO connection is disconnected with error message:
     `"Your account has been temporarily suspended for 24 hours due to multiple community violation reports."`
   - Any further login attempts or token refreshes return `403 Forbidden` until `banned_until` passes.

---

## 5. System Hardening & OWASP Top 10 Protections

1. **Helmet.js Configuration**: Configures secure HTTP headers including Content-Security-Policy (CSP), Strict-Transport-Security (HSTS), X-Frame-Options (DENY), and X-Content-Type-Options (nosniff).
2. **CORS Restrictions**: Express and Socket.IO only allow origins specified in `CORS_ALLOWED_ORIGINS` (e.g. `https://donkeyplay.com`, `http://localhost:3000`).
3. **NoSQL Injection Defense**: All request bodies and query parameters pass through `express-mongo-sanitize` to strip out `$` and `.` operators.
4. **Zod Strict Schema Validation**: Every API route enforces strict Zod validation with `.strict()` where appropriate to strip unauthorized fields before hitting controllers.
5. **Rate Limiting**:
   - Global API limiter: 300 requests per 15 minutes per IP.
   - Auth endpoints limiter: 10 requests per minute per IP.
   - Matchmaking queue join: 1 request every 3 seconds per user.
