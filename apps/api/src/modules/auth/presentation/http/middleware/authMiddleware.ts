import { Request, Response, NextFunction } from 'express';
import { JwtTokenService } from '../../../infrastructure/services/JwtTokenService';
import { UnauthorizedError, ForbiddenError } from '../../../../../common/errors/AppError';
import { AccountBannedError } from '../../../domain/errors/AuthErrors';

export interface AuthenticatedUser {
  id: string;
  role: string;
  isBanned: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const createAuthMiddleware = (tokenService: JwtTokenService = new JwtTokenService()) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    let token: string | undefined;

    // 1. Try reading from HttpOnly cookie
    if (req.cookies && req.cookies.dp_access_token) {
      token = req.cookies.dp_access_token;
    }

    // 2. Fall back to Authorization Bearer header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    // 3. Fall back to refresh token in cookie if access token is missing
    if (!token && req.cookies && req.cookies.dp_refresh_token) {
      try {
        const refreshPayload = tokenService.verifyRefreshToken(req.cookies.dp_refresh_token);
        req.user = {
          id: refreshPayload.sub,
          role: 'USER',
          isBanned: false,
        };
        next();
        return;
      } catch {
        // Fall through to error
      }
    }

    if (!token) {
      next(new UnauthorizedError('Authentication token required'));
      return;
    }

    try {
      const payload = tokenService.verifyAccessToken(token);

      if (payload.isBanned) {
        next(new AccountBannedError());
        return;
      }

      req.user = {
        id: payload.sub,
        role: payload.role,
        isBanned: payload.isBanned,
      };

      next();
    } catch (error) {
      // If access token expired, check if valid refresh token exists in cookies
      if (req.cookies && req.cookies.dp_refresh_token) {
        try {
          const refreshPayload = tokenService.verifyRefreshToken(req.cookies.dp_refresh_token);
          req.user = {
            id: refreshPayload.sub,
            role: 'USER',
            isBanned: false,
          };
          next();
          return;
        } catch {
          // Fall through
        }
      }
      next(error);
    }
  };
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permissions to access this resource'));
      return;
    }

    next();
  };
};

export const authMiddleware = createAuthMiddleware();
