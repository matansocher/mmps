import type { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiDocument } from './generator';

export function registerSwaggerRoutes(app: Express): void {
  const openApiDocument = generateOpenApiDocument();

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
  app.get('/api/docs.json', (_req, res) => {
    res.json(openApiDocument);
  });
}
