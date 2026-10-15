import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { getRedisClient } from '../../src/config/redis';
import { JwtTokenService } from '../../src/modules/auth/infrastructure/services/JwtTokenService';
import { User } from '../../src/modules/users/domain/entities/User';
import { InMemoryUserRepository } from '../mocks/InMemoryUserRepository';
import { WalletModel, WalletTransactionModel } from '../../src/modules/wallet/infrastructure/persistence/mongoose/WalletModel';
import { walletRepository, MongooseWalletRepository } from '../../src/modules/wallet';

describe('Phase 7: Coin Wallet & Razorpay Payments Module', () => {
  let userRepo: InMemoryUserRepository;
  let tokenService: JwtTokenService;
  let app: ReturnType<typeof createApp>;
  let testUser: User;
  let authToken: string;

  beforeEach(async () => {
    const redis = getRedisClient();
    await redis.flushall();

    (walletRepository as MongooseWalletRepository).clearInMemoryStore();
    if (process.env.TEST_LIVE_MONGO) {
      await WalletModel.deleteMany({});
      await WalletTransactionModel.deleteMany({});
    }

    userRepo = new InMemoryUserRepository();
    tokenService = new JwtTokenService();

    app = createApp({
      userRepository: userRepo,
      tokenService,
    });

    testUser = User.create({
      email: 'alex.gamer@example.com',
      username: 'alex_gamer',
      displayName: 'Alex Gamer',
      age: 23,
      gender: 'NON_BINARY',
    });
    await userRepo.save(testUser);

    authToken = tokenService.generateTokens(testUser).accessToken;
  });

  describe('GET /api/v1/wallet/packages', () => {
    it('should return available coin packages catalog with INR pricing', async () => {
      const res = await request(app).get('/api/v1/wallet/packages');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(4);
      expect(res.body.data[0]).toMatchObject({
        id: 'pack_starter_10',
        totalCoins: 10,
        priceInr: 10,
        pricePaise: 1000,
      });
      expect(res.body.data[1]).toMatchObject({
        id: 'pack_popular_50',
        totalCoins: 55,
        priceInr: 50,
        pricePaise: 5000,
      });
    });
  });

  describe('GET /api/v1/wallet/balance', () => {
    it('should return 401 Unauthorized if no token provided', async () => {
      const res = await request(app).get('/api/v1/wallet/balance');
      expect(res.status).toBe(401);
    });

    it('should return 0 balance initialized for new user', async () => {
      const res = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        purchasedCoinsBalance: 0,
        withdrawableEarningsPaise: 0,
        withdrawableEarningsInr: 0,
      });
    });
  });

  describe('POST /api/v1/wallet/orders', () => {
    it('should reject invalid package id with 400', async () => {
      const res = await request(app)
        .post('/api/v1/wallet/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ packageId: 'invalid_package' });

      expect(res.status).toBe(400);
    });

    it('should create order for valid package', async () => {
      const res = await request(app)
        .post('/api/v1/wallet/orders')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ packageId: 'pack_starter_10' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('orderId');
      expect(res.body.data.amount).toBe(1000);
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data).toHaveProperty('keyId');
    });
  });

  describe('POST /api/v1/wallet/orders/verify & Idempotency', () => {
    it('should reject invalid signature', async () => {
      const res = await request(app)
        .post('/api/v1/wallet/orders/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpayOrderId: 'order_test_123',
          razorpayPaymentId: 'pay_test_456',
          razorpaySignature: 'completely_invalid_signature',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should verify payment, credit coins and record in ledger', async () => {
      const paymentId = `pay_${Date.now()}`;
      const orderId = `order_${Date.now()}`;

      const res = await request(app)
        .post('/api/v1/wallet/orders/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: 'mock_valid_signature',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.purchasedCoinsBalance).toBe(10);
      expect(res.body.data.transaction.coinsAmount).toBe(10);
      expect(res.body.data.transaction.type).toBe('COIN_PURCHASE');
      expect(res.body.data.transaction.status).toBe('COMPLETED');

      // Idempotency test: submit the exact same paymentId again
      const duplicateRes = await request(app)
        .post('/api/v1/wallet/orders/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: 'mock_valid_signature',
        });

      expect(duplicateRes.status).toBe(200);
      // Balance must NOT double-credit! It should remain 10
      expect(duplicateRes.body.data.purchasedCoinsBalance).toBe(10);
    });
  });

  describe('GET /api/v1/wallet/transactions', () => {
    it('should list transactions for user', async () => {
      // Credit payment first
      const paymentId = `pay_tx_${Date.now()}`;
      await request(app)
        .post('/api/v1/wallet/orders/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          razorpayOrderId: 'order_tx_test',
          razorpayPaymentId: paymentId,
          razorpaySignature: 'mock_valid_signature',
        });

      const res = await request(app)
        .get('/api/v1/wallet/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].coinsAmount).toBe(10);
      expect(res.body.data[0].type).toBe('COIN_PURCHASE');
    });
  });

  describe('PUT /api/v1/wallet/upi (Payout UPI Management)', () => {
    it('should reject invalid UPI ID format with 400', async () => {
      const res = await request(app)
        .put('/api/v1/wallet/upi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ upiId: 'invalid-upi-no-symbol' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should update payout UPI ID successfully and reflect in balance', async () => {
      const res = await request(app)
        .put('/api/v1/wallet/upi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ upiId: 'alex.gamer@okaxis' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.upiId).toBe('alex.gamer@okaxis');

      const balRes = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(balRes.body.data.payoutUpiId).toBe('alex.gamer@okaxis');
    });
  });

  describe('POST /api/v1/wallet/withdraw (Instant Razorpay UPI Payouts)', () => {
    it('should reject withdrawal when no UPI ID is configured', async () => {
      // User with no UPI ID
      const freshUser = User.create({
        email: 'fresh@example.com',
        username: 'fresh_creator',
        age: 21,
        gender: 'FEMALE',
      });
      await userRepo.save(freshUser);
      const freshToken = tokenService.generateTokens(freshUser).accessToken;

      const res = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${freshToken}`)
        .send({ amountInr: 100 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MISSING_PAYOUT_UPI');
    });

    it('should reject withdrawal when earnings balance is insufficient', async () => {
      // Set UPI ID first
      await request(app)
        .put('/api/v1/wallet/upi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ upiId: 'alex@okhdfcbank' });

      const res = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amountInr: 50 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_EARNINGS');
    });

    it('should reject withdrawal when user has purchased coins but no gift earnings', async () => {
      // Credit purchased coins
      await walletRepository.creditCoins(
        testUser.id,
        100,
        `credit_order_${Date.now()}`,
        'RAZORPAY_ORDER',
        'order_123'
      );

      // Set UPI ID
      await request(app)
        .put('/api/v1/wallet/upi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ upiId: 'alex@okhdfcbank' });

      const res = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amountInr: 50 });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('PURCHASED_COINS_NON_WITHDRAWABLE');
      expect(res.body.error.message).toContain('Purchased coins cannot be withdrawn');
    });

    it('should disburse withdrawal via Razorpay, deduct balance, and log transaction', async () => {
      // 1. Link UPI ID
      await request(app)
        .put('/api/v1/wallet/upi')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ upiId: 'alex@okhdfcbank' });

      // 2. Credit test earnings (e.g. 7000 paise = ₹70 from received gifts)
      await walletRepository.creditEarningsPaise(
        testUser.id,
        7000,
        `credit_gift_${Date.now()}`,
        'GIFT',
        'gift_test_123'
      );

      // Verify balance before
      const balBefore = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${authToken}`);
      expect(balBefore.body.data.withdrawableEarningsPaise).toBe(7000);
      expect(balBefore.body.data.withdrawableEarningsInr).toBe(70);

      // 3. Request withdrawal of ₹50
      const res = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amountInr: 50 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('payoutId');
      expect(res.body.data.amountInr).toBe(50);
      expect(res.body.data.amountPaise).toBe(5000);
      expect(res.body.data.upiId).toBe('alex@okhdfcbank');
      expect(res.body.data.status).toBe('COMPLETED');
      expect(res.body.data.remainingEarningsPaise).toBe(2000);
      expect(res.body.data.remainingEarningsInr).toBe(20);

      // 4. Verify transaction was recorded
      const txRes = await request(app)
        .get('/api/v1/wallet/transactions')
        .set('Authorization', `Bearer ${authToken}`);

      const withdrawalTx = txRes.body.data.find(
        (tx: { type: string }) => tx.type === 'WITHDRAWAL_PAYOUT'
      );
      expect(withdrawalTx).toBeDefined();
      expect(withdrawalTx.currencyAmountPaise).toBe(-5000);
    });
  });
});
