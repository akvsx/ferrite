import type { IUseCase } from '@common/interfaces/use-case.interface';
import type { StorefrontSession } from '@ferrite/schema/storefront-auth/session.zodschema';
import type { StorefrontUserResponse } from '@ferrite/schema/storefront-auth/storefront-user.zodschema';
import type { AccountLockedError } from '../errors/account-locked.error';
import type { InvalidCredentialsError } from '../errors/invalid-credentials.error';
import { InvalidLoginMethodError } from '../errors/invalid-login-method.error';
import type { MfaRequiredError } from '../errors/mfa-required.error';
import type { RateLimitedError } from '../errors/rate-limited.error';

export const STOREFRONT_LOGIN_UC = Symbol('STOREFRONT_LOGIN_UC');

export interface LoginInput {
	storeId: string;
	email: string;
	password: string;
	ipAddress: string;
	userAgent: string;
}

export interface LoginResult {
	session: StorefrontSession;
	user: StorefrontUserResponse;
}

export type LoginError =
	| InvalidCredentialsError
	| InvalidLoginMethodError
	| AccountLockedError
	| RateLimitedError
	| MfaRequiredError
	| Error;

export type IStorefrontLoginUser = IUseCase<
	LoginInput,
	LoginResult,
	LoginError
>;
