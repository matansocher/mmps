import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import { registry } from './registry';

export function generateOpenApiDocument() {
  const generator = new OpenApiGeneratorV3(registry.definitions);

  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'MMPS API',
      version: '1.0.0',
      description: 'Multi-purpose Messaging Platform Service API',
    },
    servers: [{ url: '/' }],
  });
}
