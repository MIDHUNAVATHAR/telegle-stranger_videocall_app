import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './common/middleware/errorHandler';
import { createUsersModule, UserRepository } from './modules/users';

export interface AppOptions {
  userRepository?: UserRepository;
}

export const createApp = (options: AppOptions = {}): Application => {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(express.json());

  // Health endpoint
  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    });
  });

  // Modules
  const usersModule = createUsersModule({ repository: options.userRepository });
  app.use('/api/v1/users', usersModule.router);

  // Global Centralized Error Handler
  app.use(errorHandler);

  return app;
};

export const app = createApp();
