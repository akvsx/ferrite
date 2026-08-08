export class CategorySlugInUseError extends Error {
	readonly _tag = 'CategorySlugInUseError';

	constructor(slug: string) {
		super(`Category with slug '${slug}' already exists in this store`);
	}
}
