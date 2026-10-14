import express, { Application, Request, Response } from 'express';
import cors from 'cors';

export const createApp = (): Application => {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/api/v1/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    });
  });

  return app;
};

export const app = createApp();
