import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import swaggerUi from 'swagger-ui-express';
import { Application } from 'express';
import { logger } from '../common/logger';

export const setupSwagger = (app: Application): void => {
  try {
    // Search possible locations for openapi/donkey-play.openapi.yaml
    const candidatePaths = [
      path.resolve(__dirname, '../../../../openapi/donkey-play.openapi.yaml'),
      path.resolve(process.cwd(), 'openapi/donkey-play.openapi.yaml'),
      path.resolve(process.cwd(), '../../openapi/donkey-play.openapi.yaml'),
      path.resolve(__dirname, '../docs/donkey-play.openapi.yaml'),
    ];

    let openApiPath = '';
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        openApiPath = p;
        break;
      }
    }

    if (!openApiPath) {
      logger.warn('[Swagger] openapi/donkey-play.openapi.yaml not found. Swagger docs route disabled.');
      return;
    }

    const fileContent = fs.readFileSync(openApiPath, 'utf8');
    const swaggerDocument = YAML.parse(fileContent);

    // Serve interactive Swagger UI
    app.use(
      '/api/docs',
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument, {
        customSiteTitle: 'Donkey Play API Documentation',
        customCss: '.swagger-ui .topbar { display: none }',
      })
    );

    // Serve raw JSON spec
    app.get('/api/docs-json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocument);
    });

    logger.info('[Swagger] Swagger UI mounted successfully at /api/docs');
  } catch (error) {
    logger.error('[Swagger] Failed to initialize Swagger UI:', error);
  }
};
