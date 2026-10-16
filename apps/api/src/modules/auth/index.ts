import { Router } from 'express';
import { UserRepository } from '../users/domain/repositories/UserRepository';
import { MongooseUserRepository } from '../users/infrastructure/persistence/repositories/MongooseUserRepository';
import { RedisOtpService } from './infrastructure/services/RedisOtpService';
import { BrevoEmailService } from './infrastructure/services/BrevoEmailService';
import { GoogleAuthVerifier } from './infrastructure/services/GoogleAuthVerifier';
import { JwtTokenService } from './infrastructure/services/JwtTokenService';
import { SendOtpUseCase } from './application/use-cases/SendOtpUseCase';
import { VerifyOtpUseCase } from './application/use-cases/VerifyOtpUseCase';
import { GoogleAuthUseCase } from './application/use-cases/GoogleAuthUseCase';
import { RefreshTokenUseCase } from './application/use-cases/RefreshTokenUseCase';
import { GetCurrentUserUseCase } from './application/use-cases/GetCurrentUserUseCase';
import { AuthController } from './presentation/http/controllers/AuthController';
import { createAuthRouter } from './presentation/http/routes/AuthRoutes';
import { authMiddleware, requireRole } from './presentation/http/middleware/authMiddleware';

import { IWalletRepository } from '../wallet/domain/repositories/WalletRepository';
import { MongooseWalletRepository } from '../wallet/infrastructure/persistence/repositories/MongooseWalletRepository';

export interface AuthModuleOptions {
  userRepository?: UserRepository;
  otpService?: RedisOtpService;
  tokenService?: JwtTokenService;
  walletRepository?: IWalletRepository;
}

export interface AuthModule {
  router: Router;
  controller: AuthController;
  authMiddleware: typeof authMiddleware;
}

export const createAuthModule = (options: AuthModuleOptions = {}): AuthModule => {
  const userRepository = options.userRepository ?? new MongooseUserRepository();
  const otpService = options.otpService ?? new RedisOtpService();
  const tokenService = options.tokenService ?? new JwtTokenService();
  const walletRepository = options.walletRepository ?? new MongooseWalletRepository();
  const emailService = new BrevoEmailService();
  const googleVerifier = new GoogleAuthVerifier();

  const sendOtpUseCase = new SendOtpUseCase(otpService, emailService);
  const verifyOtpUseCase = new VerifyOtpUseCase(userRepository, otpService, tokenService, walletRepository);
  const googleAuthUseCase = new GoogleAuthUseCase(userRepository, googleVerifier, tokenService, walletRepository);
  const refreshTokenUseCase = new RefreshTokenUseCase(userRepository, tokenService);
  const getCurrentUserUseCase = new GetCurrentUserUseCase(userRepository);

  const controller = new AuthController(
    sendOtpUseCase,
    verifyOtpUseCase,
    googleAuthUseCase,
    refreshTokenUseCase,
    getCurrentUserUseCase
  );

  const router = createAuthRouter(controller);

  return {
    router,
    controller,
    authMiddleware,
  };
};

export { authMiddleware, requireRole, JwtTokenService, RedisOtpService };
