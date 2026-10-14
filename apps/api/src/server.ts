import { app } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';

const startServer = async () => {
  try {
    if (env.NODE_ENV !== 'test') {
      await connectDatabase();
    }

    const server = app.listen(env.PORT, () => {
      console.log(`[Donkey Play API] Server listening on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
    });

    const gracefulShutdown = async (signal: string) => {
      console.log(`[Donkey Play API] Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        await disconnectDatabase();
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    console.error('[Donkey Play API] Failed to start server:', error);
    process.exit(1);
  }
};

const serverPromise = startServer();

export default serverPromise;
