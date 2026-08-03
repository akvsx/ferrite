export class StorefrontUserNotFoundError extends Error {
	readonly _tag = 'StorefrontUserNotFoundError';
	constructor(userId: string) {
		super(`Storefront user with ID ${userId} not found`);
	}
}
