import type { IUseCase } from '@common/interfaces/use-case.interface';
import type { StorefrontSession } from '@ferrite/schema/storefront-auth/session.zodschema';
import type { SessionLimitExceededError } from '../errors/session-limit-exceeded.error';

export const STOREFRONT_CREATE_SESSION_UC = Symbol(
	'STOREFRONT_CREATE_SESSION_UC'
);

export interface CreateSessionInput {
	storeId: string;
	userId: string;
	ipAddress: string;
	userAgent: string;
}

export type ICreateSession = IUseCase<
	CreateSessionInput,
	StorefrontSession,
	SessionLimitExceededError
>;
