export class InsufficientStockError extends Error {
	readonly _tag = 'InsufficientStockError';

	constructor(id: string, current: number, change: number) {
		super(
			`Insufficient stock for item ${id}. Current: ${current}, Change: ${change}`
		);
	}
}
