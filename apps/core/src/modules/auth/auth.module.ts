import {
	type IRealmAuthAdapter,
	REALM_ADAPTER_MAP,
} from '@modules/auth/domain/ports/realm-auth-adapter.port';
import { StorefrontAuthModule } from '@modules/storefront-auth/storefront-auth.module';
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, DiscoveryModule } from '@nestjs/core';
import { JwtTokenUseCase } from './application/use-cases/jwt-token.usecase';
import { VerifyWebhookUseCase } from './application/use-cases/verify-webhook.usecase';
import {
	AUTH_PROVIDER,
	TOKEN_AUTH,
	WEBHOOK_AUTH,
} from './domain/ports/auth-provider.tokens';
import { JWT_TOKEN_UC } from './domain/ports/use-case.port';
import { AuthProviderFactory } from './infrastructure/adapters/auth-provider.factory';
import { ClerkAdapter } from './infrastructure/adapters/providers/clerk.adapter';
import { PlatformRealmAdapter } from './infrastructure/adapters/realms/platform-realm.adapter';
import { StorefrontRealmAdapter } from './infrastructure/adapters/realms/storefront-realm.adapter';
import { RealmDiscoveryService } from './infrastructure/discovery/realm-discovery.service';
import type { AuthRealm } from './infrastructure/http/decorators/use-realm.decorator';
import { AuthGuard } from './infrastructure/http/guards/auth.guard';
import { WebhookGuard } from './infrastructure/http/guards/webhook.guard';

@Global()
@Module({
	imports: [ConfigModule, StorefrontAuthModule, DiscoveryModule],
	providers: [
		// Auth provider adapters (Clerk, Kinde, ...)
		ClerkAdapter,
		// ClerkAdapter,
		AuthProviderFactory,

		{
			provide: TOKEN_AUTH,
			useFactory: (f: AuthProviderFactory) => f.getAdapter(),
			inject: [AuthProviderFactory],
		},
		{
			provide: WEBHOOK_AUTH,
			useExisting: TOKEN_AUTH,
		},
		{
			provide: JWT_TOKEN_UC,
			useClass: JwtTokenUseCase,
		},

		// Realm adapters
		PlatformRealmAdapter,
		StorefrontRealmAdapter,
		{
			provide: REALM_ADAPTER_MAP,
			useFactory: (
				platform: PlatformRealmAdapter,
				storefront: StorefrontRealmAdapter
			): Map<AuthRealm, IRealmAuthAdapter> =>
				new Map<AuthRealm, IRealmAuthAdapter>([
					['platform', platform],
					['storefront', storefront],
				]),
			inject: [PlatformRealmAdapter, StorefrontRealmAdapter],
		},

		// Boot-time realm ↔ path validator
		RealmDiscoveryService,

		// Global guards
		{
			provide: APP_GUARD,
			useClass: AuthGuard,
		},
		{
			provide: AUTH_PROVIDER,
			useFactory: (f: AuthProviderFactory) => f.getAdapter(),
			inject: [AuthProviderFactory],
		},

		JwtTokenUseCase,
		VerifyWebhookUseCase,

		AuthGuard,
		WebhookGuard,
	],

	// export guards
	exports: [
		AuthGuard,
		WebhookGuard,
		AUTH_PROVIDER,

		//? Resolved from AuthModule
		JwtTokenUseCase,
		VerifyWebhookUseCase,
	],
})
export class AuthModule {}
