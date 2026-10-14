import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (uri: string = env.MONGODB_URI): Promise<typeof mongoose> => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose;
    }

    const connection = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`[Database] MongoDB connected successfully to ${uri.replace(/\/\/.*@/, '//<credentials>@')}`);
    return connection;
  } catch (error) {
    console.error('[Database] Failed to connect to MongoDB:', error);
    throw error;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB disconnected');
  }
};
