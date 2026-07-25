import { IncomingMessage, ServerResponse } from 'node:http';
import { AppLogger } from '@core/logger/logger.service';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { registerShutdownHook } from '@libs/hooks/register-shutdown';
import { logIncomingRequest } from '@libs/misc/log-incoming-req.lib';
import { Logger as NestLogger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
	FastifyAdapter,
	NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ferriteConfig } from './core/config/ferrite.config';
import type { FerriteConfig } from './core/config/ferrite.schema';
import { otelSDK } from './instrumentation';
import { setupSwagger } from './swagger';

const logger = new NestLogger('Main');

/**
 * Create, configure, and start the NestJS application.
 *
 * Configures shutdown hooks, application logger, security middleware, CORS, global route prefix,
 * and a global OpenTelemetry interceptor; registers a request-logging middleware; conditionally
 * sets up Swagger; starts the HTTP server on the configured port and logs the active port.
 */
async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter(),
		{
			bufferLogs: true,
			rawBody: true,
		}
	);

	const ferriteVars = app.get<FerriteConfig>(ferriteConfig.KEY);
	const VERSION = ferriteVars.version;
	const PORT = ferriteVars.port;
	const ORIGIN = ferriteVars.origin;

	NestLogger.debug(
		`Using Env Vars: ${JSON.stringify({ port: PORT, version: VERSION, origin: ORIGIN }, null, 2)}`,
		'GLOBAL'
	);

	registerShutdownHook(app);

	app.useLogger(await app.resolve(AppLogger));

	await app.register(helmet);
	await app.register(cookie);

	app.enableCors({
		methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
		origin: ORIGIN,
		credentials: true,
	});

	app.setGlobalPrefix(VERSION);

	app.use((req: IncomingMessage, _res: ServerResponse, next: () => void) => {
		logIncomingRequest(req, logger);
		next();
	});

	if (process.env.ENABLE_SWAGGER || process.env.NODE_ENV !== 'production') {
		setupSwagger(app);
	}

	await app.listen(PORT);
	NestLogger.log(`Application Port: ${PORT}`, '');
}

void (async (): Promise<void> => {
	try {
		otelSDK.start();
		await bootstrap();
		logger.log(
			`Server Started in ${process.env.NODE_ENV ?? 'production'} mode`
		);
	} catch (error) {
		logger.error(error);
		try {
			await otelSDK.shutdown();
		} catch (shutdownError) {
			logger.error(shutdownError);
		} finally {
			process.exit(1);
		}
	}
})();
