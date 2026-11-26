import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import cookieParser from 'cookie-parser';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import { TelemetryRouteInterceptor } from './telemetry/route.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.enableShutdownHooks();
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.useGlobalInterceptors(
    new TelemetryRouteInterceptor(),
    new LoggerErrorInterceptor(),
  );

  app.use(cookieParser());
  app.use((req: any, _res: any, next: any) => {
    if (!req.headers.authorization && req.cookies?.access_token) {
      req.headers.authorization = `Bearer ${req.cookies.access_token}`;
    }
    next();
  });

  // CORS for KMP frontend (Android emulator + web)
  app.enableCors({
    origin: [
      'http://localhost:4321',
      'http://127.0.0.1:4321',
      'http://localhost:8081',
      'http://localhost:3000',
      'http://localhost:4321',
      'http://10.0.2.2:8080',
      'http://10.0.2.2:8081',
      '*',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Swagger/OpenAPI documentation
  const config = new DocumentBuilder()
    .setTitle('Surface Volume API')
    .setDescription('Surface Volume automation platform API - OpenAPI spec for Kotlin Multiplatform client generation')
    .setVersion('1.0')
    .addTag('surface-volume')
    .addTag('ping')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'Enter JWT token',
    }, 'bearer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  
  // Write OpenAPI JSON to file for client generation
  const openapiPath = path.join(__dirname, '..', 'openapi.json');
  fs.writeFileSync(openapiPath, JSON.stringify(document, null, 2));

  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}`);
  logger.log(`Ping endpoint: http://localhost:${port}/ping`);
  logger.log(`OpenAPI spec: http://localhost:${port}/api-json`);
  logger.log(`OpenAPI JSON written to ${openapiPath}`);
}
bootstrap();
