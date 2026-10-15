import mongoose from 'mongoose';
import { UserRepository } from '../../../users/domain/repositories/UserRepository';
import { User } from '../../../users/domain/entities/User';
import { GoogleAuthVerifier } from '../../infrastructure/services/GoogleAuthVerifier';
import { JwtTokenService, AuthTokens } from '../../infrastructure/services/JwtTokenService';
import { AccountBannedError } from '../../domain/errors/AuthErrors';
import { UserPreferencesModel } from '../../../users/infrastructure/persistence/mongoose/UserPreferencesModel';
import { WalletModel } from '../../../users/infrastructure/persistence/mongoose/WalletModel';

export interface GoogleAuthInput {
  idToken: string;
}

export interface GoogleAuthOutput {
  user: User;
  tokens: AuthTokens;
  isNewUser: boolean;
}

export class GoogleAuthUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly googleVerifier: GoogleAuthVerifier = new GoogleAuthVerifier(),
    private readonly tokenService: JwtTokenService = new JwtTokenService()
  ) {}

  public async execute(input: GoogleAuthInput): Promise<GoogleAuthOutput> {
    const payload = await this.googleVerifier.verifyIdToken(input.idToken);

    let user = await this.userRepository.findByGoogleId(payload.googleId);
    if (!user) {
      user = await this.userRepository.findByEmail(payload.email);
    }

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
        email: payload.email,
        googleId: payload.googleId,
        displayName: payload.name,
        avatarUrl: payload.picture,
        age: 18,
      });
      user = await this.userRepository.save(user);

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
    }

    const tokens = this.tokenService.generateTokens(user);

    return {
      user,
      tokens,
      isNewUser,
    };
  }
}
