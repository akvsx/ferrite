import { NotificationsModule } from '@modules/notifications';
import { Module } from '@nestjs/common';
import { GetSessionUseCase } from './application/use-cases/get-session.usecase';
import { GetSessionsUseCase } from './application/use-cases/get-sessions.usecase';
import { LoginUseCase } from './application/use-cases/login.usecase';
import { LogoutUseCase } from './application/use-cases/logout.usecase';
import { LogoutAllUseCase } from './application/use-cases/logout-all.usecase';
import { RegisterUserUseCase } from './application/use-cases/register-user.usecase';
import { ResendVerificationEmailUseCase } from './application/use-cases/resend-verification-email.usecase';
import { SendVerificationEmailUseCase } from './application/use-cases/send-verification-email.usecase';
import { ValidateSessionUseCase } from './application/use-cases/validate-session.usecase';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.usecase';
import { STOREFRONT_EMAIL_VERIFICATION_REPOSITORY } from './domain/ports/email-verification-repository.port';
import {
	STOREFRONT_RESEND_VERIFICATION_EMAIL_UC,
	STOREFRONT_SEND_VERIFICATION_EMAIL_UC,
	STOREFRONT_VERIFY_EMAIL_UC,
} from './domain/ports/email-verification-usecase.port';
import { STOREFRONT_GET_SESSION_UC } from './domain/ports/get-session-usecase.port';
import { STOREFRONT_GET_SESSIONS_UC } from './domain/ports/get-sessions-usecase.port';
import { STOREFRONT_LOGIN_UC } from './domain/ports/login-usecase.port';
import { STOREFRONT_LOGOUT_ALL_UC } from './domain/ports/logout-all-usecase.port';
import { STOREFRONT_LOGOUT_UC } from './domain/ports/logout-usecase.port';
import { STOREFRONT_PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { RATE_LIMITER } from './domain/ports/rate-limiter.port';
import { STOREFRONT_REGISTER_UC } from './domain/ports/register-usecase.port';
import { STOREFRONT_SESSION_REPOSITORY } from './domain/ports/storefront-session-repository.port';
import { STOREFRONT_USER_REPOSITORY } from './domain/ports/storefront-user-repository.port';
import { STOREFRONT_VALIDATE_SESSION_UC } from './domain/ports/validate-session-usecase.port';
import {
	Argon2OptionsProvider,
	Argon2Provider,
} from './infrastructure/crypto/argon2.provider';
import { Argon2PasswordHasher } from './infrastructure/crypto/password-hasher';
import { StorefrontAuthController } from './infrastructure/http/controllers/storefront-auth.controller';
import { StorefrontCsrfGuard } from './infrastructure/http/guards/storefront-csrf.guard';
import { EmailVerificationMapper } from './infrastructure/persistance/mappers/email-verification.mapper';
import { DrizzleEmailVerificationRepository } from './infrastructure/persistance/repositories/drizzle-email-verification.repository';
import { DrizzleStorefrontUserRepository } from './infrastructure/persistance/repositories/drizzle-storefront-user.repository';
import { RedisStorefrontSessionRepository } from './infrastructure/persistance/repositories/redis-storefront-session.repository';
import { RedisRateLimiterAdapter } from './infrastructure/rate-limiting/redis-rate-limiter.adapter';
import { StorefrontRedisProvider } from './infrastructure/redis/redis.provider';

@Module({
	imports: [NotificationsModule],
	controllers: [StorefrontAuthController],
	providers: [
		Argon2Provider,
		Argon2OptionsProvider,
		StorefrontRedisProvider,
		EmailVerificationMapper,
		StorefrontCsrfGuard,
		{
			provide: RATE_LIMITER,
			useClass: RedisRateLimiterAdapter,
		},
		{
			provide: STOREFRONT_USER_REPOSITORY,
			useClass: DrizzleStorefrontUserRepository,
		},
		{
			provide: STOREFRONT_EMAIL_VERIFICATION_REPOSITORY,
			useClass: DrizzleEmailVerificationRepository,
		},
		{
			provide: STOREFRONT_PASSWORD_HASHER,
			useClass: Argon2PasswordHasher,
		},
		{
			provide: STOREFRONT_REGISTER_UC,
			useClass: RegisterUserUseCase,
		},
		{
			provide: STOREFRONT_LOGIN_UC,
			useClass: LoginUseCase,
		},
		{
			provide: STOREFRONT_SEND_VERIFICATION_EMAIL_UC,
			useClass: SendVerificationEmailUseCase,
		},
		{
			provide: STOREFRONT_VERIFY_EMAIL_UC,
			useClass: VerifyEmailUseCase,
		},
		{
			provide: STOREFRONT_RESEND_VERIFICATION_EMAIL_UC,
			useClass: ResendVerificationEmailUseCase,
		},
		{
			provide: STOREFRONT_SESSION_REPOSITORY,
			useClass: RedisStorefrontSessionRepository,
		},
		{
			provide: STOREFRONT_LOGOUT_UC,
			useClass: LogoutUseCase,
		},
		{
			provide: STOREFRONT_LOGOUT_ALL_UC,
			useClass: LogoutAllUseCase,
		},
		{
			provide: STOREFRONT_GET_SESSION_UC,
			useClass: GetSessionUseCase,
		},
		{
			provide: STOREFRONT_GET_SESSIONS_UC,
			useClass: GetSessionsUseCase,
		},
		{
			provide: STOREFRONT_VALIDATE_SESSION_UC,
			useClass: ValidateSessionUseCase,
		},
	],
	exports: [STOREFRONT_VALIDATE_SESSION_UC, StorefrontCsrfGuard],
})
export class StorefrontAuthModule {}
