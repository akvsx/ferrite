import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';

export const STOREFRONT_PASSWORD_RESET_REPOSITORY = Symbol(
	'IStorefrontPasswordResetRepository'
);

export interface StorefrontPasswordResetInsert {
	id?: string;
	storeId: string;
	userId: string;
	tokenHash: string;
	expiresAt: Date;
}

export interface StorefrontPasswordReset {
	id: string;
	storeId: string;
	userId: string;
	tokenHash: string;
	expiresAt: Date;
	usedAt: Date | null;
	createdAt: Date;
}

export interface IStorefrontPasswordResetRepository {
	upsert(
		data: StorefrontPasswordResetInsert,
		tx?: ITransactionContext
	): Promise<void>;

	/** Returns the reset token record if found, valid (not used, not expired). */
	findValidByTokenHash(
		tokenHash: string,
		tx?: ITransactionContext
	): Promise<StorefrontPasswordReset | null>;

	markAsUsed(id: string, tx?: ITransactionContext): Promise<boolean>;
}
