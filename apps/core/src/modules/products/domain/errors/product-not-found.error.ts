export class ProductNotFoundError extends Error {
	readonly _tag = 'ProductNotFoundError';

	constructor(id: string) {
		super(`Product ${id} not found`);
	}
}
