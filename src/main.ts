import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express';

import express from 'express';

import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';

async function bootstrap() {
  const logger = new Logger('bootstrap');
  const expressApp = express();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(expressApp));

  app.use(express.json({ limit: '4mb' }));
  app.set('trust proxy', true);
  app.enableShutdownHooks();

  // CORS is enabled so browser-based MCP tooling (e.g. MCP Inspector on
  // http://localhost:6274) can reach this gateway during local development.
  // The `mcp-*` headers are part of MCP's Streamable HTTP transport spec.
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'x-api-key',
      'mcp-session-id',
      'mcp-protocol-version',
    ],
    exposedHeaders: ['mcp-session-id', 'mcp-protocol-version'],
  });

  const config = app.get(AppConfigService);
  const port = config.get('PORT');

  await app.listen(port);
  logger.log(
    `nestjs-mastra-mcp-gateway listening on :${port} ` +
      `(env=${config.get('NODE_ENV')}, auth=${config.get('AUTH_MODE')})`
  );
}

bootstrap().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Fatal error during bootstrap:', err);
  process.exit(1);
});
