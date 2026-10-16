import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { logger } from './common/logger';
import { errorHandler } from './common/middleware/errorHandler';
import { NotFoundError } from './common/errors/AppError';
import { setupSwagger } from './config/swagger';
import { createHealthRouter } from './common/routes/healthRoutes';
import { createUsersModule, UserRepository } from './modules/users';
import { createAuthModule, RedisOtpService, JwtTokenService } from './modules/auth';
import { createMatchingModule, PresenceService, MatchmakingService } from './modules/matching';
import { createConversationsModule, ConversationRepository } from './modules/conversations';
import { walletRouter, walletRepository, IWalletRepository } from './modules/wallet';
import { giftRouter } from './modules/gifts';
import { createModerationModule, IModerationRepository } from './modules/moderation';

export interface AppOptions {
  userRepository?: UserRepository;
  otpService?: RedisOtpService;
  tokenService?: JwtTokenService;
  presenceService?: PresenceService;
  matchmakingService?: MatchmakingService;
  conversationRepository?: ConversationRepository;
  walletRepository?: IWalletRepository;
  moderationRepository?: IModerationRepository;
}

export const createApp = (options: AppOptions = {}): Application => {
  const app = express();

  // Security headers with Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false, // Disabled to allow Swagger UI and WebRTC local development
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS Configuration
  const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (such as mobile apps, curl, or server-to-server)
        if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV === 'test') {
          callback(null, true);
        } else {
          callback(new Error(`CORS origin not allowed: ${origin}`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Idempotency-Key'],
    })
  );

  // Body and cookie parsing
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  // HTTP Request Logging Middleware
  if (env.NODE_ENV !== 'test') {
    app.use((req: Request, res: Response, next: NextFunction) => {
      const start = Date.now();
      res.on('finish', () => {
        const durationMs = Date.now() - start;
        logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`);
      });
      next();
    });
  }

  // Swagger Documentation
  setupSwagger(app);

  // Health and Liveness Routes
  app.use(createHealthRouter());

  // API Modules
  const authModule = createAuthModule({
    userRepository: options.userRepository,
    otpService: options.otpService,
    tokenService: options.tokenService,
    walletRepository: options.walletRepository || walletRepository,
  });
  app.use(`${env.API_PREFIX}/auth`, authModule.router);

  const usersModule = createUsersModule({ repository: options.userRepository });
  app.use(`${env.API_PREFIX}/users`, usersModule.router);

  const matchingModule = createMatchingModule({
    userRepository: options.userRepository,
    presenceService: options.presenceService,
    matchmakingService: options.matchmakingService,
    walletRepository: options.walletRepository || walletRepository,
  });
  app.use(`${env.API_PREFIX}/matching`, matchingModule.matchingRouter);
  app.use(`${env.API_PREFIX}/calls`, matchingModule.callsRouter);

  const conversationsModule = createConversationsModule({
    conversationRepository: options.conversationRepository,
    userRepository: options.userRepository,
    matchmakingService: options.matchmakingService,
  });
  app.use(`${env.API_PREFIX}/conversations`, conversationsModule.router);

  app.use(`${env.API_PREFIX}/wallet`, walletRouter);
  app.use(`${env.API_PREFIX}/gifts`, giftRouter);

  const moderationModule = createModerationModule({
    userRepository: options.userRepository,
    moderationRepository: options.moderationRepository,
  });
  app.use(`${env.API_PREFIX}/moderation`, moderationModule.router);

  // Catch-all 404 handler
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
