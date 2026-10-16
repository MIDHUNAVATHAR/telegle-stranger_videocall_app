import mongoose from 'mongoose';
import { UserRepository } from '../../../users/domain/repositories/UserRepository';
import { User } from '../../../users/domain/entities/User';
import { RedisOtpService } from '../../infrastructure/services/RedisOtpService';
import { JwtTokenService, AuthTokens } from '../../infrastructure/services/JwtTokenService';
import { AccountBannedError } from '../../domain/errors/AuthErrors';
import { emailSchema, otpCodeSchema } from '@donkey-play/validation';
import { UserPreferencesModel } from '../../../users/infrastructure/persistence/mongoose/UserPreferencesModel';
import { WalletModel } from '../../../users/infrastructure/persistence/mongoose/WalletModel';
import { IWalletRepository } from '../../../wallet/domain/repositories/WalletRepository';
import { MongooseWalletRepository } from '../../../wallet/infrastructure/persistence/repositories/MongooseWalletRepository';
import { env } from '../../../../config/env';

export interface VerifyOtpInput {
  email: string;
  code: string;
  referralCode?: string;
}

export interface VerifyOtpOutput {
  user: User;
  tokens: AuthTokens;
  isNewUser: boolean;
}

export class VerifyOtpUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly otpService: RedisOtpService = new RedisOtpService(),
    private readonly tokenService: JwtTokenService = new JwtTokenService(),
    private readonly walletRepo: IWalletRepository = new MongooseWalletRepository()
  ) {}

  public async execute(input: VerifyOtpInput): Promise<VerifyOtpOutput> {
    const validatedEmail = emailSchema.parse(input.email);
    const validatedCode = otpCodeSchema.parse(input.code);

    // 1. Verify OTP in Redis
    await this.otpService.verifyOtp(validatedEmail, validatedCode);

    // 2. Find or Auto-Register User
    let user = await this.userRepository.findByEmail(validatedEmail);
    let isNewUser = false;

    if (user) {
      if (user.isBanned) {
        throw new AccountBannedError(user.bannedUntil);
      }
      user.recordLogin();
      user = await this.userRepository.save(user);
    } else {
      isNewUser = true;
      user = User.create({
        email: validatedEmail,
        age: 18,
      });
      user = await this.userRepository.save(user);

      // Provision default preferences and wallet in MongoDB if connection is ready
      if (mongoose.connection.readyState === 1) {
        try {
          await Promise.all([
            UserPreferencesModel.findOneAndUpdate(
              { userId: user.id },
              { $setOnInsert: { userId: user.id, preferredGender: 'ANY', allowIncomingCalls: true, soundEnabled: true } },
              { upsert: true }
            ).exec(),
            WalletModel.findOneAndUpdate(
              { userId: user.id },
              { $setOnInsert: { userId: user.id, purchasedCoinsBalance: 0, withdrawableEarningsPaise: 0 } },
              { upsert: true }
            ).exec(),
          ]);
        } catch {
          // Tolerates test/in-memory mocks
        }
      }

      // Referral Reward Logic:
      // If a referral code was passed, reward only the referrer who sent the link with 10 free coins
      if (input.referralCode) {
        try {
          const rawCode = input.referralCode.trim();
          const cleanCode = rawCode.includes('ref=')
            ? rawCode.split('ref=')[1].split('&')[0]
            : rawCode.replace(/^@/, '');

          let referrer = await this.userRepository.findByUsername(cleanCode);
          if (!referrer) {
            referrer = await this.userRepository.findById(cleanCode);
          }

          if (referrer && referrer.id !== user.id) {
            // Reward referrer: dynamic bonus coins from env (added to purchased coins balance)
            await this.walletRepo.creditCoins(
              referrer.id,
              env.REFERRAL_REWARD_COINS,
              `ref_reward_${referrer.id}_${user.id}`,
              'SYSTEM',
              user.id,
              { reason: 'REFERRAL_REWARD', referredUserId: user.id }
            );
          }
        } catch (refErr) {
          console.warn('Referral reward processing error in VerifyOtpUseCase:', refErr);
        }
      }
    }

    // 3. Issue Tokens
    const tokens = this.tokenService.generateTokens(user);

    return {
      user,
      tokens,
      isNewUser,
    };
  }
}
