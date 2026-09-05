export class UnknownWarehouseError extends Error {
	readonly _tag = 'UnknownWarehouseError';

	constructor(cause?: unknown) {
		super('An unknown error occurred in the warehouse module', { cause });
	}
}
