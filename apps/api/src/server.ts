import http from 'http';
import { app } from './app';
import { env } from './config/env';
import { logger } from './common/logger';
import { connectDatabase, disconnectDatabase } from './config/database';
import { connectRedis, disconnectRedis } from './config/redis';
import { SocketServer } from './modules/matching/presentation/socket/SocketServer';

const startServer = async () => {
  try {
    if (env.NODE_ENV !== 'test') {
      await connectDatabase();
      await connectRedis();
    }

    const httpServer = http.createServer(app);
    const socketServer = new SocketServer(httpServer);

    const server = httpServer.listen(env.PORT, () => {
      logger.info(`[Donkey Play API] Server listening on http://localhost:${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`[Donkey Play API] Interactive documentation available at http://localhost:${env.PORT}/api/docs`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`[Donkey Play API] Received ${signal}. Shutting down gracefully...`);
      socketServer.close();
      server.close(async () => {
        try {
          await disconnectRedis();
          await disconnectDatabase();
          logger.info('[Donkey Play API] All infrastructure disconnected cleanly. Exiting.');
          process.exit(0);
        } catch (err) {
          logger.error('[Donkey Play API] Error during graceful shutdown:', err);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    return server;
  } catch (error) {
    logger.error('[Donkey Play API] Fatal error starting server:', error);
    process.exit(1);
  }
};

const serverPromise = startServer();

export default serverPromise;
