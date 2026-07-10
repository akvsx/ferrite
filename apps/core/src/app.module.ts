import { CommonModules } from '@common/common.module';
import { PostgresErrorFilter } from '@common/filters/postgres-error.filter';
import { UnhandledExceptionFilter } from '@common/filters/unhandled-exception-filter';
import { ZodSerializationExceptionFilter } from '@common/filters/zod-serialization-exception-filter';
import { CoreModules } from '@core/core.module';
import { AppLogger } from '@core/logger/logger.service';
import { AuthModule } from '@modules/auth/auth.module';
import { CurrencyModule } from '@modules/currency';
import { HealthModule } from '@modules/health/health.module';
import { OnboardingModule } from '@modules/onboarding/onboarding.module';
import { UsersModule } from '@modules/platform-users/users.module';
import { QueueModule } from '@modules/queue';
import { StoreModule } from '@modules/store';
import { StorefrontAuthModule } from '@modules/storefront-auth';
import { StorefrontCsrfGuard } from '@modules/storefront-auth/infrastructure/http/guards/storefront-csrf.guard';
import { WebhooksModule } from '@modules/webhooks/webhooks.module';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
	APP_FILTER,
	APP_GUARD,
	APP_INTERCEPTOR,
	APP_PIPE,
	HttpAdapterHost,
	RouterModule,
} from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { NotificationsModule } from '@notifications/index';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		CacheModule.register({ ttl: 60000, isGlobal: true }),
		ThrottlerModule.forRoot({
			throttlers: [{ ttl: 60000, limit: 100 }],
		}),

		CoreModules,
		CommonModules,

		QueueModule,
		HealthModule,
		WebhooksModule,

		AuthModule,
		StorefrontAuthModule,
		CurrencyModule,
		StoreModule,
		UsersModule,
		OnboardingModule,
		NotificationsModule,

		RouterModule.register([
			{
				path: '/stores/:storeId',
				module: StorefrontAuthModule,
			},
		]),
	],
	providers: [
		// Guards
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
		{
			provide: APP_GUARD,
			useClass: StorefrontCsrfGuard,
		},
		// Pipes
		{
			provide: APP_PIPE,
			useClass: ZodValidationPipe,
		},
		// Interceptors
		{
			provide: APP_INTERCEPTOR,
			useClass: ZodSerializerInterceptor,
		},

		// Filters
		{
			provide: APP_FILTER,
			useFactory: (logger: AppLogger) => new UnhandledExceptionFilter(logger),
			inject: [AppLogger],
		},
		{
			provide: APP_FILTER,
			useClass: PostgresErrorFilter,
		},
		{
			provide: APP_FILTER,
			useFactory: (adapterHost: HttpAdapterHost, logger: AppLogger) =>
				new ZodSerializationExceptionFilter(adapterHost, logger),
			inject: [HttpAdapterHost, AppLogger],
		},
	],
})
export class AppModule {}
