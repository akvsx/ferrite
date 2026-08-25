export class SkuAlreadyExistsError extends Error {
	readonly _tag = 'SkuAlreadyExistsError';

	constructor(sku: string) {
		super(`SKU "${sku}" already exists`);
	}
}
