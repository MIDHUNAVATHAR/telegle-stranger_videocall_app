# Donkey Play — Redis Data Architecture & In-Memory Design

This document details the Redis 7.2+ in-memory architecture for **Donkey Play**. Redis is employed for high-throughput, low-latency operational state: **real-time online presence, matchmaking queues, atomic coin reservation locks, rate limiting, and automated 5-report abuse prevention**.

---

## 1. Overview & Operational Principles

1. **Isolation from Persistence**: Redis acts as an ephemeral state and concurrency coordinator. MongoDB remains the system of record for persistent user profiles, financial balances, and relationship history.
2. **Explicit TTL on Every Ephemeral Key**: All operational keys (OTPs, session locks, rate limits) MUST have explicit TTLs to prevent memory leaks.
3. **Atomic Lua Scripts for Concurrency**: All matchmaking pairing, queue popping, and 1-hour rolling report aggregations are executed via single-turn Lua scripts to avoid race conditions.
4. **Presence Accuracy**: The displayed online user count is the **cardinality of unique active user IDs** (`SCARD presence:online_users`), not raw Socket.IO connections.

---

## 2. Key Naming Conventions & Data Structures

| Key Pattern | Redis Type | TTL / Eviction | Purpose |
|---|---|---|---|
| `presence:online_users` | `SET` | Persistent Set (cleaned by sweeps) | Set of active user IDs currently online |
| `presence:heartbeat:<userId>` | `STRING` | 60 seconds | Heartbeat lease for individual user |
| `auth:otp:<email>` | `HASH` | 300 seconds (5m) | Stores SHA256 hashed OTP, attempts count |
| `ratelimit:otp:email:<email>` | `STRING` | 60 seconds | Cooldown between OTP send requests |
| `ratelimit:otp:ip:<ip>` | `STRING` | 3600 seconds (1h) | Max 10 OTP requests per IP per hour |
| `match:queue:any` | `ZSET` | Persistent ZSet | Free random matchmaking pool (score = epoch ms) |
| `match:queue:male` | `ZSET` | Persistent ZSet | Users seeking male partners (score = epoch ms) |
| `match:queue:female` | `ZSET` | Persistent ZSet | Users seeking female partners (score = epoch ms) |
| `match:reserved_coin:<userId>` | `STRING` | 60 seconds | Atomic hold on 1 coin during matchmaking |
| `match:session:<sessionId>` | `HASH` | 7200 seconds (2h) | Active WebRTC call room metadata |
| `call:timer:<sessionId>` | `STRING` | 5 seconds | Enforces 5-second minimum call countdown |
| `reports:target:<targetUserId>` | `ZSET` | 3600 seconds (1h sliding) | Rolling 1-hour window of reports against user |
| `block:<userId>` | `SET` | 86400 seconds (24h) | Cache of user IDs blocked or mutually excluded |
| `idempotency:pay:<paymentId>` | `STRING` | 86400 seconds (24h) | Prevents duplicate Razorpay order credits |
| `idempotency:withdrawal:<key>` | `STRING` | 86400 seconds (24h) | Prevents duplicate withdrawal processing |

---

## 3. Deep-Dive: Key Namespaces & Data Schemas

### 3.1 Online Presence & Heartbeat

#### Problem Solved
Raw socket connection counts inflate online user numbers when a user opens multiple browser tabs, or momentarily drop during cellular network switches.

#### Design
- **Key**: `presence:online_users` (Redis `SET`).
- **Heartbeat Lease**: `presence:heartbeat:<userId>` (`STRING` with TTL = 60s).
- **Client Cadence**: The web client transmits a heartbeat ping every 25 seconds over Socket.IO.
- **Server Action**:
  ```redis
  SADD presence:online_users "<userId>"
  SETEX presence:heartbeat:<userId> 60 "1"
  ```
- **Eviction Sweep**: A lightweight server cron (every 30 seconds) queries users whose `presence:heartbeat:<userId>` key has expired and removes them from `presence:online_users` via `SREM`.
- **Online Count Calculation**:
  ```redis
  SCARD presence:online_users
  ```

---

### 3.2 Authentication & OTP Verification

#### Keys
- `auth:otp:<email>` (`HASH` with 300s TTL)
  - Fields:
    - `hash`: SHA-256 hash of the 6-digit numeric OTP.
    - `attempts`: Integer, initial value `0`, maximum allowed `3`.
    - `created_at`: Unix timestamp.

#### Rate Limiting Keys
- `ratelimit:otp:email:<email>`: `STRING` set with `SETEX ... 60 "1"`. If key exists, subsequent OTP send requests return `429 Too Many Requests`.
- `ratelimit:otp:ip:<ip>`: Incremented counter with 3600s TTL. Enforces maximum 10 requests per hour per IP.

---

### 3.3 Matchmaking Queues & Coin Reservation

#### Queue Keys
Queues use Redis Sorted Sets (`ZSET`), with member = `<userId>` and score = `<enqueued_timestamp_ms>`. This guarantees FIFO matching order:
- `match:queue:any` — Free random matching pool.
- `match:queue:female` — Users filtering for female matches (cost: 1 coin).
- `match:queue:male` — Users filtering for male matches (cost: 1 coin).

#### Coin Reservation Lifecycle
When a user requests a gender filter:
1. Server verifies user has `>= 1` coin.
2. Server writes temporary reservation:
   ```redis
   SETEX match:reserved_coin:<userId> 60 "1"
   ```
3. User is placed into the target queue.
4. If match is found and confirmed, reservation is deleted and MongoDB wallet is debited 1 coin.
5. If search is cancelled, times out, or peer declines, reservation is deleted:
   ```redis
   DEL match:reserved_coin:<userId>
   ```
   *The user's persistent coin balance in MongoDB is never debited until a call actually connects.*

---

### 3.4 Call Session & 5-Second Minimum Lock

#### Active Room Metadata
- **Key**: `match:session:<sessionId>` (`HASH`, TTL 2 hours)
  - Fields:
    - `userA`: `<userId>`
    - `userB`: `<userId>`
    - `matchType`: `'RANDOM_FREE' | 'GENDER_FILTER_PAID' | 'DIRECT_INBOX_CALL'`
    - `coinCharged`: `'0' | '1'`
    - `chargedUserId`: `<userId>`
    - `startedAt`: `<timestamp>`

#### 5-Second Minimum Rule Enforcement
To prevent instant skip-spamming, a server-enforced lock key is set upon WebRTC connection:
```redis
SETEX call:timer:<sessionId> 5 "LOCKED"
```
When client emits `leave_call`, the server checks:
```redis
EXISTS call:timer:<sessionId>
```
If key exists, the server rejects the leave request with error code `MIN_DURATION_NOT_MET` (unless the user is filing a safety report or the connection dropped).

---

## 4. Atomic Lua Scripts

### 4.1 Match Reservation Script (`match_reserve.lua`)

Executes the atomic pairing of two candidate users, verifying mutual exclusions and popping them simultaneously from the active queues to prevent double-matching.

```lua
-- KEYS: [1] queueA, [2] queueB, [3] blockSetA, [4] blockSetB
-- ARGV: [1] userA, [2] userB, [3] sessionId, [4] ttlSeconds

local queueA = KEYS[1]
local queueB = KEYS[2]
local blockSetA = KEYS[3]
local blockSetB = KEYS[4]

local userA = ARGV[1]
local userB = ARGV[2]
local sessionId = ARGV[3]
local ttlSeconds = tonumber(ARGV[4])

-- Check mutual blocks
if redis.call('SISMEMBER', blockSetA, userB) == 1 then
    return -1 -- Blocked
end
if redis.call('SISMEMBER', blockSetB, userA) == 1 then
    return -1 -- Blocked
end

-- Verify presence of both users
local heartbeatA = redis.call('EXISTS', 'presence:heartbeat:' .. userA)
local heartbeatB = redis.call('EXISTS', 'presence:heartbeat:' .. userB)

if heartbeatA == 0 or heartbeatB == 0 then
    return -2 -- One of the users disconnected
end

-- Pop both users from queues
redis.call('ZREM', queueA, userA)
redis.call('ZREM', queueB, userB)

-- Create atomic session lock
local sessionKey = 'match:session:' .. sessionId
redis.call('HSET', sessionKey, 'userA', userA, 'userB', userB, 'status', 'PAIRED')
redis.call('EXPIRE', sessionKey, ttlSeconds)

return 1 -- Success
```

---

### 4.2 Rolling 1-Hour Report Ban Script (`report_rate_limit_and_ban.lua`)

Maintains a sliding 1-hour window of unique abuse reports for a target user. If 5 distinct reporters file reports within 1 hour, triggers an automatic 24-hour server-side ban.

```lua
-- KEYS: [1] reportsKey (reports:target:<targetUserId>)
-- ARGV: [1] reporterId, [2] currentTimestampMs, [3] oneHourAgoMs, [4] banThreshold

local reportsKey = KEYS[1]
local reporterId = ARGV[1]
local now = tonumber(ARGV[2])
local oneHourAgo = tonumber(ARGV[3])
local threshold = tonumber(ARGV[4]) -- 5

-- 1. Prune reports older than 1 hour (sliding window)
redis.call('ZREMRANGEBYSCORE', reportsKey, 0, oneHourAgo)

-- 2. Add current report (score = current timestamp, member = reporterId)
-- Note: Using reporterId as member ensures that duplicate reports from the SAME reporter within the hour do not count as multiple qualifying strikes
redis.call('ZADD', reportsKey, now, reporterId)
redis.call('EXPIRE', reportsKey, 3600)

-- 3. Count unique reporters within the 1-hour window
local reportCount = redis.call('ZCARD', reportsKey)

if reportCount >= threshold then
    return { 1, reportCount } -- Ban threshold reached! Trigger 24h ban.
else
    return { 0, reportCount } -- Below threshold. Safe.
end
```

---

## 5. Persistence, Clustering & Disaster Recovery

1. **AOF (Append-Only File) Configuration**:
   - `appendonly yes`
   - `appendfsync everysec` (at most 1 second of non-critical presence/queue data loss in crash).
2. **RDB Snapshots**: Periodic backups every 15 minutes (`save 900 1`).
3. **Graceful Degradation**:
   - If Redis becomes unavailable, REST authentication falls back to MongoDB for OTP verification (with degraded latency).
   - Matchmaking gracefully pauses with descriptive user messaging (`"Matchmaking temporarily unavailable, reconnecting..."`) rather than crashing the Express server.
