import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { getRedisClient } from '../../src/config/redis';
import { JwtTokenService } from '../../src/modules/auth/infrastructure/services/JwtTokenService';
import { User } from '../../src/modules/users/domain/entities/User';
import { InMemoryUserRepository } from '../mocks/InMemoryUserRepository';
import { walletRepository, MongooseWalletRepository } from '../../src/modules/wallet';
import { giftRepository, MongooseGiftRepository } from '../../src/modules/gifts';

describe('Phase 8: Virtual Gifts & Coin Economy Module', () => {
  let userRepo: InMemoryUserRepository;
  let tokenService: JwtTokenService;
  let app: ReturnType<typeof createApp>;
  let senderUser: User;
  let recipientUser: User;
  let senderToken: string;
  let recipientToken: string;

  beforeEach(async () => {
    const redis = getRedisClient();
    await redis.flushall();

    (walletRepository as MongooseWalletRepository).clearInMemoryStore();
    (giftRepository as MongooseGiftRepository).clearInMemoryStore();

    userRepo = new InMemoryUserRepository();
    tokenService = new JwtTokenService();

    app = createApp({
      userRepository: userRepo,
      tokenService,
    });

    senderUser = User.create({
      email: 'sender@example.com',
      username: 'sender_sam',
      displayName: 'Sender Sam',
      age: 25,
      gender: 'MALE',
    });
    recipientUser = User.create({
      email: 'creator@example.com',
      username: 'creator_clara',
      displayName: 'Creator Clara',
      age: 22,
      gender: 'FEMALE',
    });

    await userRepo.save(senderUser);
    await userRepo.save(recipientUser);

    senderToken = tokenService.generateTokens(senderUser).accessToken;
    recipientToken = tokenService.generateTokens(recipientUser).accessToken;
  });

  describe('GET /api/v1/gifts', () => {
    it('should return master virtual gifts catalog with 70/30 revenue breakdown', async () => {
      const res = await request(app).get('/api/v1/gifts');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(12);

      const rose = res.body.data.find((g: any) => g.slug === 'rose-5c');
      expect(rose).toBeDefined();
      expect(rose.coinPrice).toBe(5);
      expect(rose.creatorEarningPaise).toBe(350); // ₹3.50
      expect(rose.platformFeePaise).toBe(150); // ₹1.50

      const banana = res.body.data.find((g: any) => g.slug === 'banana-10c');
      expect(banana).toBeDefined();
      expect(banana.coinPrice).toBe(10);
      expect(banana.creatorEarningPaise).toBe(700); // ₹7.00
      expect(banana.platformFeePaise).toBe(300); // ₹3.00
    });
  });

  describe('POST /api/v1/gifts/send', () => {
    it('should reject gifting oneself with 400', async () => {
      const res = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          giftSlug: 'banana-10c',
          recipientUserId: senderUser.id,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_GIFT_SELF');
    });

    it('should reject when sender has insufficient coins with 402', async () => {
      const res = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          giftSlug: 'banana-10c',
          recipientUserId: recipientUser.id,
        });

      expect(res.status).toBe(402);
      expect(res.body.error.code).toBe('INSUFFICIENT_COINS');
    });

    it('should atomically debit sender coins, credit recipient 70% earnings and record transfer', async () => {
      // 1. Credit sender with 50 coins first
      await walletRepository.creditCoins(
        senderUser.id,
        50,
        'test_precredit_sender',
        'SYSTEM',
        'admin_grant'
      );

      // 2. Sender sends 'banana-10c' (10 coins) to recipient
      const sendRes = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          giftSlug: 'banana-10c',
          recipientUserId: recipientUser.id,
          matchSessionId: 'sess_call_789',
        });

      expect(sendRes.status).toBe(200);
      expect(sendRes.body.success).toBe(true);
      expect(sendRes.body.data.remainingCoins).toBe(40);
      expect(sendRes.body.data.gift.slug).toBe('banana-10c');
      expect(sendRes.body.data.transferId).toBeDefined();

      // 3. Verify sender's remaining coin balance is 40
      const senderBalRes = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${senderToken}`);

      expect(senderBalRes.body.data.purchasedCoinsBalance).toBe(40);

      // 4. Verify recipient's creator earnings balance is credited 700 paise (₹7.00)
      const recipientBalRes = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${recipientToken}`);

      expect(recipientBalRes.body.data.withdrawableEarningsPaise).toBe(700);
      expect(recipientBalRes.body.data.withdrawableEarningsInr).toBe(7);
    });

    it('deducts configured platform_commision_gift percentage and adds remaining earnings to recipient wallet', async () => {
      // 1. Credit sender with 100 coins
      await walletRepository.creditCoins(
        senderUser.id,
        100,
        'test_precredit_sender_commission',
        'SYSTEM',
        'admin_grant'
      );

      // 2. Sender sends a 5 coin gift (500 paise total value)
      // With 30% platform commission: 150 paise platform fee, 350 paise to recipient
      const sendRes = await request(app)
        .post('/api/v1/gifts/send')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          giftSlug: 'rose-5c',
          recipientUserId: recipientUser.id,
        });

      expect(sendRes.status).toBe(200);
      expect(sendRes.body.data.gift.platformFeePaise).toBe(150);
      expect(sendRes.body.data.gift.creatorEarningPaise).toBe(350);

      // Verify recipient received net amount after commission deduction
      const recipientBal = await request(app)
        .get('/api/v1/wallet/balance')
        .set('Authorization', `Bearer ${recipientToken}`);

      expect(recipientBal.body.data.withdrawableEarningsPaise).toBe(350);
    });
  });
});

