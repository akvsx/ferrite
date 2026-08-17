import { IUseCase } from '@common/interfaces/use-case.interface';

export const STOREFRONT_LOGOUT_UC = Symbol('STOREFRONT_LOGOUT_UC');

export interface LogoutInput {
	sessionId: string;
	//? StoreId is resolved internally
}

export type IStorefrontLogout = IUseCase<LogoutInput, void>;
