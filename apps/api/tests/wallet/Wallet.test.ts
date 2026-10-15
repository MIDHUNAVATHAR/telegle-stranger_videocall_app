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
      expect(res.body.data).toEqual({
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

  describe('Strict Invariant: Zero Withdrawals', () => {
    it('should ensure no withdrawal endpoints exist (404)', async () => {
      const res = await request(app)
        .post('/api/v1/wallet/withdraw')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amountPaise: 50000, upiId: 'test@okaxis' });

      expect(res.status).toBe(404);
    });
  });
});
