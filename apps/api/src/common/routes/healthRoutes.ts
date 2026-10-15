import { Router, Request, Response } from 'express';
import { checkMongoHealth } from '../../config/database';
import { checkRedisHealth } from '../../config/redis';

export const createHealthRouter = (): Router => {
  const router = Router();

  // Basic Health Ping
  const handleHealth = (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'donkey-play-api',
      version: '0.1.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };

  router.get('/health', handleHealth);
  router.get('/api/v1/health', handleHealth);

  // Liveness Probe (Is the Node.js process alive?)
  const handleLiveness = (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'UP',
      message: 'Process is alive',
      timestamp: new Date().toISOString(),
    });
  };

  router.get('/health/liveness', handleLiveness);
  router.get('/api/v1/health/liveness', handleLiveness);

  // Readiness Probe (Are dependencies MongoDB and Redis ready to receive traffic?)
  const handleReadiness = async (_req: Request, res: Response) => {
    const [mongoHealth, redisHealth] = await Promise.all([
      checkMongoHealth(),
      checkRedisHealth(),
    ]);

    const isHealthy = mongoHealth.status === 'UP' && redisHealth.status === 'UP';
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'UP' : 'DOWN',
      services: {
        mongo: mongoHealth,
        redis: redisHealth,
      },
      timestamp: new Date().toISOString(),
    });
  };

  router.get('/health/readiness', handleReadiness);
  router.get('/api/v1/health/readiness', handleReadiness);

  return router;
};
