import {
	type PaginatedResponse,
	type StorefrontUser,
	type UpdateStorefrontUser,
} from '@ferrite/schema';

export const STOREFRONT_USER_REPOSITORY = Symbol('IStorefrontUserRepository');

export interface IStorefrontUserRepository {
	findById(id: string, storeId: string): Promise<StorefrontUser | null>;
	findByStoreId(
		storeId: string,
		cursor?: string,
		limit?: number
	): Promise<PaginatedResponse<StorefrontUser>>;
	update(
		id: string,
		storeId: string,
		payload: UpdateStorefrontUser
	): Promise<StorefrontUser | null>;
	delete(id: string, storeId: string): Promise<boolean>;
	setBanStatus(
		id: string,
		storeId: string,
		isBanned: boolean
	): Promise<StorefrontUser | null>;
}
