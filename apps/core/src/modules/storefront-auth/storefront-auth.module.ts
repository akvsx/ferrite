import { NotificationsModule } from '@modules/notifications';
import { StoreModule } from '@modules/store/store.module';
import { Module } from '@nestjs/common';
import { CreateSessionUseCase } from './application/use-cases/create-session.usecase';
import { ForgotPasswordUseCase } from './application/use-cases/forgot-password.usecase';
import { GetSessionUseCase } from './application/use-cases/get-session.usecase';
import { GetSessionsUseCase } from './application/use-cases/get-sessions.usecase';
import { LoginUseCase } from './application/use-cases/login.usecase';
import { LogoutUseCase } from './application/use-cases/logout.usecase';
import { LogoutAllUseCase } from './application/use-cases/logout-all.usecase';
import { RegisterUserUseCase } from './application/use-cases/register-user.usecase';
import { ResendVerificationEmailUseCase } from './application/use-cases/resend-verification-email.usecase';
import { ResetPasswordUseCase } from './application/use-cases/reset-password.usecase';
import { SendVerificationEmailUseCase } from './application/use-cases/send-verification-email.usecase';
import { UpdatePasswordUseCase } from './application/use-cases/update-password.usecase';
import { ValidateAccountStatusUseCase } from './application/use-cases/validate-account-status.usecase';
import { ValidateSessionUseCase } from './application/use-cases/validate-session.usecase';
import { VerifyEmailUseCase } from './application/use-cases/verify-email.usecase';
import { STOREFRONT_CREATE_SESSION_UC } from './domain/ports/create-session-usecase.port';
import { STOREFRONT_EMAIL_VERIFICATION_REPOSITORY } from './domain/ports/email-verification-repository.port';
import {
	STOREFRONT_RESEND_VERIFICATION_EMAIL_UC,
	STOREFRONT_SEND_VERIFICATION_EMAIL_UC,
	STOREFRONT_VERIFY_EMAIL_UC,
} from './domain/ports/email-verification-usecase.port';
import { STOREFRONT_FORGOT_PASSWORD_UC } from './domain/ports/forgot-password-usecase.port';
import { STOREFRONT_GET_SESSION_UC } from './domain/ports/get-session-usecase.port';
import { STOREFRONT_GET_SESSIONS_UC } from './domain/ports/get-sessions-usecase.port';
import { STOREFRONT_LOGIN_UC } from './domain/ports/login-usecase.port';
import { STOREFRONT_LOGOUT_ALL_UC } from './domain/ports/logout-all-usecase.port';
import { STOREFRONT_LOGOUT_UC } from './domain/ports/logout-usecase.port';
import { STOREFRONT_PASSWORD_HASHER } from './domain/ports/password-hasher.port';
import { STOREFRONT_PASSWORD_RESET_REPOSITORY } from './domain/ports/password-reset-repository.port';
import { RATE_LIMITER } from './domain/ports/rate-limiter.port';
import { STOREFRONT_REGISTER_UC } from './domain/ports/register-usecase.port';
import { STOREFRONT_RESET_PASSWORD_UC } from './domain/ports/reset-password-usecase.port';
import { STOREFRONT_SESSION_REPOSITORY } from './domain/ports/storefront-session-repository.port';
import { STOREFRONT_USER_REPOSITORY } from './domain/ports/storefront-user-repository.port';
import { STOREFRONT_UPDATE_PASSWORD_UC } from './domain/ports/update-password-usecase.port';
import { STOREFRONT_VALIDATE_ACCOUNT_STATUS_UC } from './domain/ports/validate-account-status-usecase.port';
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
import { DrizzlePasswordResetRepository } from './infrastructure/persistance/repositories/drizzle-password-reset.repository';
import { DrizzleStorefrontUserRepository } from './infrastructure/persistance/repositories/drizzle-storefront-user.repository';
import { RedisStorefrontSessionRepository } from './infrastructure/persistance/repositories/redis-storefront-session.repository';
import { RedisRateLimiterAdapter } from './infrastructure/rate-limiting/redis-rate-limiter.adapter';
import { StorefrontRedisProvider } from './infrastructure/redis/redis.provider';

@Module({
	imports: [NotificationsModule, StoreModule],
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
			provide: STOREFRONT_CREATE_SESSION_UC,
			useClass: CreateSessionUseCase,
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
		{
			provide: STOREFRONT_VALIDATE_ACCOUNT_STATUS_UC,
			useClass: ValidateAccountStatusUseCase,
		},
		{
			provide: STOREFRONT_PASSWORD_RESET_REPOSITORY,
			useClass: DrizzlePasswordResetRepository,
		},
		{
			provide: STOREFRONT_UPDATE_PASSWORD_UC,
			useClass: UpdatePasswordUseCase,
		},
		{
			provide: STOREFRONT_FORGOT_PASSWORD_UC,
			useClass: ForgotPasswordUseCase,
		},
		{
			provide: STOREFRONT_RESET_PASSWORD_UC,
			useClass: ResetPasswordUseCase,
		},
	],
	exports: [
		STOREFRONT_VALIDATE_SESSION_UC,
		STOREFRONT_VALIDATE_ACCOUNT_STATUS_UC,
		StorefrontCsrfGuard,
	],
})
export class StorefrontAuthModule {}
