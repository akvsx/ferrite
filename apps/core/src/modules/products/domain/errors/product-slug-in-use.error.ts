export class ProductSlugInUseError extends Error {
	readonly _tag = 'ProductSlugInUseError';

	constructor(slug: string) {
		super(`Product slug "${slug}" is already in use`);
	}
}
