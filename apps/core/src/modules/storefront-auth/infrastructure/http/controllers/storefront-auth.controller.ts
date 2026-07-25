import { PublicRoute } from '@common/decorators/public-route.decorator';
import type { Request } from '@common/types/request';
import type { FerriteConfig } from '@core/config/ferrite.schema';
import { AuthStep } from '@ferrite/schema/storefront-auth/auth-step';
import { IncompleteConfigurationError } from '@modules/store';
import { AccountLockedError } from '@modules/storefront-auth/domain/errors/account-locked.error';
import { EmailAlreadyRegisteredError } from '@modules/storefront-auth/domain/errors/email-already-registered.error';
import { InvalidCredentialsError } from '@modules/storefront-auth/domain/errors/invalid-credentials.error';
import { MfaRequiredError } from '@modules/storefront-auth/domain/errors/mfa-required.error';
import { RateLimitedError } from '@modules/storefront-auth/domain/errors/rate-limited.error';
import {
	type IResendVerificationEmail,
	type IVerifyEmail,
	STOREFRONT_RESEND_VERIFICATION_EMAIL_UC,
	STOREFRONT_VERIFY_EMAIL_UC,
} from '@modules/storefront-auth/domain/ports/email-verification-usecase.port';
import {
	type IStorefrontGetSession,
	STOREFRONT_GET_SESSION_UC,
} from '@modules/storefront-auth/domain/ports/get-session-usecase.port';
import {
	type IStorefrontGetSessions,
	STOREFRONT_GET_SESSIONS_UC,
} from '@modules/storefront-auth/domain/ports/get-sessions-usecase.port';
import {
	type IStorefrontLoginUser,
	STOREFRONT_LOGIN_UC,
} from '@modules/storefront-auth/domain/ports/login-usecase.port';
import {
	type IStorefrontLogoutAll,
	STOREFRONT_LOGOUT_ALL_UC,
} from '@modules/storefront-auth/domain/ports/logout-all-usecase.port';
import {
	type IStorefrontLogout,
	STOREFRONT_LOGOUT_UC,
} from '@modules/storefront-auth/domain/ports/logout-usecase.port';
import type { IStorefrontRegisterUser } from '@modules/storefront-auth/domain/ports/register-usecase.port';
import { STOREFRONT_REGISTER_UC } from '@modules/storefront-auth/domain/ports/register-usecase.port';
import {
	Body,
	ConflictException,
	Controller,
	ForbiddenException,
	Get,
	HttpCode,
	HttpStatus,
	Inject,
	InternalServerErrorException,
	Param,
	ParseUUIDPipe,
	Post,
	Req,
	Res,
	UnauthorizedException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import {
	GetSessionDocs,
	GetSessionsDocs,
	LoginUserDocs,
	LogoutAllDocs,
	LogoutDocs,
	RegisterUserDocs,
	ResendVerificationEmailDocs,
	VerifyEmailDocs,
} from '../docs/storefront-auth.docs';
import { LoginInputDTO } from '../dto/login.dto';
import { RegisterInputDTO } from '../dto/register.dto';
import { ResendVerificationEmailDTO } from '../dto/resend-verification-email.dto';
import { VerifyEmailDTO } from '../dto/verify-email.dto';

@ApiTags('Storefront Auth')
@Controller('/auth')
@PublicRoute()
export class StorefrontAuthController {
	private readonly cookieName: string;
	private readonly sessionMaxAgeS: number;

	constructor(
		@Inject(STOREFRONT_LOGIN_UC)
		private readonly loginUseCase: IStorefrontLoginUser,
		@Inject(STOREFRONT_REGISTER_UC)
		private readonly registerUseCase: IStorefrontRegisterUser,
		@Inject(STOREFRONT_VERIFY_EMAIL_UC)
		private readonly verifyEmailUseCase: IVerifyEmail,
		@Inject(STOREFRONT_RESEND_VERIFICATION_EMAIL_UC)
		private readonly resendVerificationEmailUC: IResendVerificationEmail,
		@Inject(STOREFRONT_LOGOUT_UC)
		private readonly logoutUseCase: IStorefrontLogout,
		@Inject(STOREFRONT_LOGOUT_ALL_UC)
		private readonly logoutAllUseCase: IStorefrontLogoutAll,
		@Inject(STOREFRONT_GET_SESSION_UC)
		private readonly getSessionUseCase: IStorefrontGetSession,
		@Inject(STOREFRONT_GET_SESSIONS_UC)
		private readonly getSessionsUseCase: IStorefrontGetSessions,
		config: ConfigService
	) {
		const ferriteConfig = config.getOrThrow<FerriteConfig>('ferrite');
		this.cookieName = ferriteConfig.storefrontAuth.session.cookieName;
		this.sessionMaxAgeS = Math.floor(
			ferriteConfig.storefrontAuth.session.absoluteLifetimeMs / 1000
		);
	}

	@Post('login')
	@HttpCode(HttpStatus.OK)
	@LoginUserDocs()
	async login(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Body() payload: LoginInputDTO,
		@Req() request: Request,
		@Res({ passthrough: true }) reply: FastifyReply
	) {
		const result = await this.loginUseCase.execute({
			...payload,
			storeId,
			ipAddress: request.ip,
			userAgent: request.headers['user-agent'] ?? '',
		});

		if (result.isErr()) {
			const error = result.error;

			if (error instanceof InvalidCredentialsError) {
				throw new UnauthorizedException(error.message);
			}
			if (error instanceof AccountLockedError) {
				throw new ForbiddenException(error.message);
			}
			if (error instanceof RateLimitedError) {
				throw error; // Already an HttpException (429)
			}
			if (error instanceof MfaRequiredError) {
				return {
					step: AuthStep.MFA_REQUIRED,
					challengeToken: error.challengeToken,
				};
			}
			throw new InternalServerErrorException('Login failed');
		}

		// Set HttpOnly session cookie
		reply.setCookie(this.cookieName, result.value.session.id, {
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			path: '/',
			maxAge: this.sessionMaxAgeS,
		});

		return {
			step: AuthStep.AUTHENTICATED,
			user: result.value.user,
		};
	}

	private extractSessionId(request: Request): string | undefined {
		if (request.cookies?.[this.cookieName]) {
			return request.cookies[this.cookieName];
		}
		const cookieHeader = request.headers.cookie;
		if (cookieHeader) {
			const match = cookieHeader.match(
				new RegExp(`(?:^|; )${this.cookieName}=([^;]*)`)
			);
			if (match) {
				return decodeURIComponent(match[1]);
			}
		}
		return undefined;
	}

	@Get('session')
	@HttpCode(HttpStatus.OK)
	@GetSessionDocs()
	async getSession(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Req() request: Request
	) {
		const sessionId = this.extractSessionId(request);

		if (!sessionId) {
			throw new UnauthorizedException('Session missing');
		}

		const result = await this.getSessionUseCase.execute({
			sessionId,
			storeId,
		});

		if (result.isErr()) {
			throw new UnauthorizedException(result.error.message);
		}

		return {
			session: result.value.session,
			user: result.value.user,
		};
	}

	@Get('sessions')
	@HttpCode(HttpStatus.OK)
	@GetSessionsDocs()
	async getSessions(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Req() request: Request
	) {
		const sessionId = this.extractSessionId(request);

		if (!sessionId) {
			throw new UnauthorizedException('Session missing');
		}

		const result = await this.getSessionsUseCase.execute({
			sessionId,
			storeId,
		});

		if (result.isErr()) {
			throw new UnauthorizedException(result.error.message);
		}

		return { sessions: result.value };
	}

	@Post('register')
	@RegisterUserDocs()
	async register(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Body() payload: RegisterInputDTO
	) {
		const result = await this.registerUseCase.execute({
			...payload,
			storeId,
		});

		if (result.isErr()) {
			if (result.error instanceof IncompleteConfigurationError) {
				throw new InternalServerErrorException({
					message: result.error.message,
					error: 'Internal Server Error',
					isPublic: true,
				});
			}
			if (result.error instanceof EmailAlreadyRegisteredError) {
				throw new ConflictException(result.error.message);
			}
			throw new UnprocessableEntityException(result.error.message);
		}

		return {
			step: AuthStep.EMAIL_VERIFICATION_REQUIRED,
			user: result.value,
		};
	}

	@Post('verify-email')
	@HttpCode(HttpStatus.OK)
	@VerifyEmailDocs()
	async verifyEmail(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Body() payload: VerifyEmailDTO
	) {
		const result = await this.verifyEmailUseCase.execute({
			storeId,
			userId: payload.userId,
			token: payload.token,
		});

		if (result.isErr()) {
			if (result.error instanceof RateLimitedError) {
				throw result.error;
			}
			if (result.error instanceof IncompleteConfigurationError) {
				throw new InternalServerErrorException({
					message: result.error.message,
					error: 'Internal Server Error',
					isPublic: true,
				});
			}
			throw new UnprocessableEntityException(result.error.message);
		}

		return { step: AuthStep.EMAIL_VERIFIED };
	}

	@Post('resend-verification-email')
	@HttpCode(HttpStatus.OK)
	@ResendVerificationEmailDocs()
	async resendVerificationEmail(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Body() payload: ResendVerificationEmailDTO
	) {
		const result = await this.resendVerificationEmailUC.execute({
			storeId,
			userId: payload.userId,
			email: payload.email,
		});

		if (result.isErr()) {
			if (result.error instanceof RateLimitedError) {
				throw result.error;
			}
			if (result.error instanceof IncompleteConfigurationError) {
				throw new InternalServerErrorException({
					message: result.error.message,
					error: 'Internal Server Error',
					isPublic: true,
				});
			}
			throw new UnprocessableEntityException(result.error.message);
		}

		return { step: AuthStep.EMAIL_VERIFICATION_REQUIRED };
	}

	@Post('logout')
	@HttpCode(HttpStatus.OK)
	@LogoutDocs()
	async logout(
		@Req() request: Request,
		@Res({ passthrough: true }) reply: FastifyReply
	) {
		const sessionId = this.extractSessionId(request);

		if (sessionId) {
			await this.logoutUseCase.execute({ sessionId });
		}

		// Clear the session cookie regardless
		reply.clearCookie(this.cookieName, {
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			path: '/',
		});

		return { step: 'logged_out' };
	}

	@Post('logout/all')
	@HttpCode(HttpStatus.OK)
	@LogoutAllDocs()
	async logoutAll(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Req() request: Request,
		@Res({ passthrough: true }) reply: FastifyReply
	) {
		const sessionId = this.extractSessionId(request);

		if (!sessionId) {
			throw new UnauthorizedException('Session missing');
		}

		const result = await this.logoutAllUseCase.execute({
			sessionId,
			storeId,
		});

		if (result.isErr()) {
			throw new UnauthorizedException(result.error.message);
		}

		// Clear the session cookie on this device as well
		reply.clearCookie(this.cookieName, {
			httpOnly: true,
			secure: true,
			sameSite: 'lax',
			path: '/',
		});

		return { step: 'logged_out_all' };
	}
}
