import { UserRepository } from '../../../users/domain/repositories/UserRepository';
import { JwtTokenService, AuthTokens } from '../../infrastructure/services/JwtTokenService';
import { InvalidTokenError, AccountBannedError } from '../../domain/errors/AuthErrors';
import { User } from '../../../users/domain/entities/User';

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenOutput {
  user: User;
  tokens: AuthTokens;
}

export class RefreshTokenUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: JwtTokenService = new JwtTokenService()
  ) {}

  public async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    if (!input.refreshToken) {
      throw new InvalidTokenError('Refresh token required');
    }

    const payload = this.tokenService.verifyRefreshToken(input.refreshToken);

    const user = await this.userRepository.findById(payload.sub);
    if (!user) {
      throw new InvalidTokenError('User not found');
    }

    if (user.tokenVersion !== payload.tokenVersion) {
      throw new InvalidTokenError('Refresh token has been revoked');
    }

    if (user.isBanned) {
      throw new AccountBannedError(user.bannedUntil);
    }

    const tokens = this.tokenService.generateTokens(user);

    return {
      user,
      tokens,
    };
  }
}
