export class VariantNotFoundError extends Error {
	readonly _tag = 'VariantNotFoundError';

	constructor(variantId: string) {
		super(`Product variant ${variantId} not found`);
	}
}
