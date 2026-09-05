export class WarehouseNameConflictError extends Error {
	readonly _tag = 'WarehouseNameConflictError';

	constructor(name: string) {
		super(`Warehouse with name '${name}' already exists in this store`);
	}
}
