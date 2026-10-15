import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../common/logger';

export interface DatabaseHealth {
  status: 'UP' | 'DOWN';
  readyState: number;
  latencyMs?: number;
  message?: string;
}

export const connectDatabase = async (uri: string = env.MONGODB_URI): Promise<typeof mongoose> => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose;
    }

    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: env.NODE_ENV !== 'production',
    });

    logger.info(`[Database] MongoDB connected successfully to ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);
    return connection;
  } catch (error) {
    logger.error('[Database] Failed to connect to MongoDB:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info('[Database] MongoDB disconnected');
  }
};

export const checkMongoHealth = async (): Promise<DatabaseHealth> => {
  const readyState = mongoose.connection.readyState;
  if (readyState !== 1 || !mongoose.connection.db) {
    return {
      status: 'DOWN',
      readyState,
      message: readyState === 2 ? 'Connecting' : 'Disconnected',
    };
  }

  const start = Date.now();
  try {
    await mongoose.connection.db.admin().ping();
    const latencyMs = Date.now() - start;
    return {
      status: 'UP',
      readyState,
      latencyMs,
    };
  } catch (error) {
    return {
      status: 'DOWN',
      readyState,
      message: error instanceof Error ? error.message : 'Ping failed',
    };
  }
};
