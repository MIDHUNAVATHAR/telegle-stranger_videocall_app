import { Request, Response, NextFunction } from 'express';
import { SendOtpUseCase } from '../../../application/use-cases/SendOtpUseCase';
import { VerifyOtpUseCase } from '../../../application/use-cases/VerifyOtpUseCase';
import { GoogleAuthUseCase } from '../../../application/use-cases/GoogleAuthUseCase';
import { RefreshTokenUseCase } from '../../../application/use-cases/RefreshTokenUseCase';
import { GetCurrentUserUseCase } from '../../../application/use-cases/GetCurrentUserUseCase';
import { AuthTokens } from '../../../infrastructure/services/JwtTokenService';
import { User } from '../../../../users/domain/entities/User';
import { env } from '../../../../../config/env';

export class AuthController {
  constructor(
    private readonly sendOtpUseCase: SendOtpUseCase,
    private readonly verifyOtpUseCase: VerifyOtpUseCase,
    private readonly googleAuthUseCase: GoogleAuthUseCase,
    private readonly refreshTokenUseCase: RefreshTokenUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase
  ) {}

  private setAuthCookies(res: Response, tokens: AuthTokens): void {
    const isProd = env.NODE_ENV === 'production';

    res.cookie('dp_access_token', tokens.accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 mins
    });

    res.cookie('dp_refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/api/v1/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie('dp_access_token', { path: '/' });
    res.clearCookie('dp_refresh_token', { path: '/api/v1/auth' });
  }

  private formatUser(user: User): Record<string, unknown> {
    return {
      _id: user.id,
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.displayName,
      age: user.age,
      gender: user.gender,
      avatar_url: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      is_banned: user.isBanned,
      banned_until: user.bannedUntil ? user.bannedUntil.toISOString() : null,
      created_at: user.createdAt.toISOString(),
    };
  }

  public sendOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
      const result = await this.sendOtpUseCase.execute({
        email: req.body.email,
        ip,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public verifyOtp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.verifyOtpUseCase.execute({
        email: req.body.email,
        code: req.body.code,
      });

      this.setAuthCookies(res, result.tokens);

      res.status(200).json({
        success: true,
        data: {
          user: this.formatUser(result.user),
          is_new_user: result.isNewUser,
          tokens: {
            access_token: result.tokens.accessToken,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public googleAuth = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.googleAuthUseCase.execute({
        idToken: req.body.id_token,
      });

      this.setAuthCookies(res, result.tokens);

      res.status(200).json({
        success: true,
        data: {
          user: this.formatUser(result.user),
          is_new_user: result.isNewUser,
          tokens: {
            access_token: result.tokens.accessToken,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.dp_refresh_token || req.body?.refresh_token;
      const result = await this.refreshTokenUseCase.execute({
        refreshToken: token,
      });

      this.setAuthCookies(res, result.tokens);

      res.status(200).json({
        success: true,
        data: {
          user: this.formatUser(result.user),
          tokens: {
            access_token: result.tokens.accessToken,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.clearAuthCookies(res);
      res.status(200).json({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      });
    } catch (error) {
      next(error);
    }
  };

  public getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await this.getCurrentUserUseCase.execute(req.user!.id);
      res.status(200).json({
        success: true,
        data: this.formatUser(user),
      });
    } catch (error) {
      next(error);
    }
  };
}
