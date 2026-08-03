import {
	type PaginatedResponse,
	type StorefrontUser,
	type UpdateStorefrontUser,
} from '@ferrite/schema';

export const STOREFRONT_USER_REPOSITORY = Symbol('IStorefrontUserRepository');

export interface IStorefrontUserRepository {
	findById(id: string): Promise<StorefrontUser | null>;
	findByStoreId(
		storeId: string,
		cursor?: string,
		limit?: number
	): Promise<PaginatedResponse<StorefrontUser>>;
	update(
		id: string,
		payload: UpdateStorefrontUser
	): Promise<StorefrontUser | null>;
	delete(id: string): Promise<void>;
	setBanStatus(id: string, isBanned: boolean): Promise<StorefrontUser | null>;
}
