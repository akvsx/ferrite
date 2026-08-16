import { IUseCase } from '@common/interfaces/use-case.interface';
import type { StorefrontUserRegister } from '@ferrite/schema/storefront-auth/register.zodschema';
import { IncompleteConfigurationError } from '@store/domain/errors/incomplete-configuration.error';
import { EmailAlreadyRegisteredError } from '../errors/email-already-registered.error';

export const STOREFRONT_REGISTER_UC = Symbol('STOREFRONT_REGISTER_UC');

import type { LoginResult } from './login-usecase.port';

export type IStorefrontRegisterUser = IUseCase<
	StorefrontUserRegister & {
		storeId: string;
		ipAddress: string;
		userAgent: string;
	},
	LoginResult,
	EmailAlreadyRegisteredError | IncompleteConfigurationError | Error
>;
