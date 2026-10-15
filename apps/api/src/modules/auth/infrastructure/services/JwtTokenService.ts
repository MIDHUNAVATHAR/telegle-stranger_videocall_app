import jwt from 'jsonwebtoken';
import { env } from '../../../../config/env';
import { User } from '../../../users/domain/entities/User';
import { InvalidTokenError } from '../../domain/errors/AuthErrors';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  isBanned: boolean;
}

export interface RefreshTokenPayload {
  sub: string;
  tokenVersion: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class JwtTokenService {
  constructor(
    private readonly accessSecret: string = env.JWT_ACCESS_SECRET,
    private readonly refreshSecret: string = env.JWT_REFRESH_SECRET,
    private readonly accessExpiresIn: string = env.JWT_ACCESS_EXPIRES_IN,
    private readonly refreshExpiresIn: string = env.JWT_REFRESH_EXPIRES_IN
  ) {}

  public generateTokens(user: User): AuthTokens {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      isBanned: user.isBanned,
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tokenVersion: user.tokenVersion,
    };

    // Cast expiresIn to jwt.SignOptions['expiresIn']
    const accessToken = jwt.sign(accessPayload, this.accessSecret, {
      expiresIn: this.accessExpiresIn as unknown as number,
    });

    const refreshToken = jwt.sign(refreshPayload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn as unknown as number,
    });

    return { accessToken, refreshToken };
  }

  public verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, this.accessSecret) as AccessTokenPayload;
      return decoded;
    } catch (error) {
      throw new InvalidTokenError(
        error instanceof jwt.TokenExpiredError ? 'Access token expired' : 'Invalid access token'
      );
    }
  }

  public verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const decoded = jwt.verify(token, this.refreshSecret) as RefreshTokenPayload;
      return decoded;
    } catch (error) {
      throw new InvalidTokenError(
        error instanceof jwt.TokenExpiredError ? 'Refresh token expired' : 'Invalid refresh token'
      );
    }
  }
}
