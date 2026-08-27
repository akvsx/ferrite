export class WarehouseNotFoundError extends Error {
	readonly _tag = 'WarehouseNotFoundError';

	constructor(id: string) {
		super(`Warehouse ${id} not found`);
	}
}
