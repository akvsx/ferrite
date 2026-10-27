export class SupplierNotFoundError extends Error {
	readonly _tag = 'SupplierNotFoundError';

	constructor(id: string) {
		super(`Supplier ${id} not found`);
	}
}
