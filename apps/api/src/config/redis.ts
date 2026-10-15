import Redis, { Redis as RedisClient } from 'ioredis';
import { env } from './env';
import { logger } from '../common/logger';

export interface RedisHealth {
  status: 'UP' | 'DOWN';
  latencyMs?: number;
  message?: string;
}

let redisClient: RedisClient | null = null;

export const createRedisClient = (): RedisClient => {
  if (redisClient) {
    return redisClient;
  }

  if (env.NODE_ENV === 'test') {
    // In test environment, dynamically require ioredis-mock
    // Bridge ioredis v6 reply transformers with ioredis-mock (which calls transformers without context)
    const sortedSetReplyCommands = [
      'zrange',
      'zrangebyscore',
      'zrevrange',
      'zrevrangebyscore',
      'zdiff',
      'zinter',
      'zpopmax',
      'zpopmin',
    ];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformers = (Redis as any).Command?._transformer?.reply;
    if (transformers) {
      for (const cmd of sortedSetReplyCommands) {
        const orig = transformers[cmd];
        if (orig) {
          transformers[cmd] = (res: unknown, ctx: unknown) => (ctx ? orig(res, ctx) : res);
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const RedisMock = require('ioredis-mock');
    redisClient = new RedisMock() as RedisClient;
    logger.info('[Redis] Initialized in-memory test Redis mock');
    return redisClient;
  }

  redisClient = new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    db: env.REDIS_DB,
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) {
        logger.warn('[Redis] Exceeded maximum retry attempts (5). Halting auto-retry.');
        return null;
      }
      const delay = Math.min(times * 200, 2000);
      return delay;
    },
  });

  redisClient.on('connect', () => {
    logger.info(`[Redis] Connected successfully to ${env.REDIS_HOST}:${env.REDIS_PORT}`);
  });

  redisClient.on('error', (err) => {
    logger.error('[Redis] Connection error:', err);
  });

  redisClient.on('close', () => {
    logger.warn('[Redis] Connection closed');
  });

  return redisClient;
};

export const getRedisClient = (): RedisClient => {
  if (!redisClient) {
    return createRedisClient();
  }
  return redisClient;
};

export const connectRedis = async (): Promise<RedisClient> => {
  const client = getRedisClient();
  if (client.status === 'ready' || client.status === 'connect') {
    return client;
  }

  if (env.NODE_ENV === 'test') {
    return client;
  }

  try {
    await client.connect();
    return client;
  } catch (error) {
    logger.error('[Redis] Failed to connect to Redis server:', error);
    // In development mode, we don't necessarily crash the process on start, but report
    if (env.NODE_ENV === 'production') {
      throw error;
    }
    return client;
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      logger.info('[Redis] Redis client disconnected');
    } catch {
      redisClient.disconnect();
    } finally {
      redisClient = null;
    }
  }
};

export const checkRedisHealth = async (): Promise<RedisHealth> => {
  try {
    const client = getRedisClient();
    const start = Date.now();
    const result = await client.ping();
    const latencyMs = Date.now() - start;

    if (result === 'PONG') {
      return {
        status: 'UP',
        latencyMs,
      };
    }

    return {
      status: 'DOWN',
      message: `Unexpected ping response: ${result}`,
    };
  } catch (error) {
    return {
      status: 'DOWN',
      message: error instanceof Error ? error.message : 'Redis ping failed',
    };
  }
};
