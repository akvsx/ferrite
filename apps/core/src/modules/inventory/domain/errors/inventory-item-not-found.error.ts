export class InventoryItemNotFoundError extends Error {
	readonly _tag = 'InventoryItemNotFoundError';

	constructor(id: string) {
		super(`Inventory item ${id} not found`);
	}
}
