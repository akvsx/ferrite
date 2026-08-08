export class CategoryNotFoundError extends Error {
	readonly _tag = 'CategoryNotFoundError';

	constructor(id: string) {
		super(`Category ${id} not found`);
	}
}
