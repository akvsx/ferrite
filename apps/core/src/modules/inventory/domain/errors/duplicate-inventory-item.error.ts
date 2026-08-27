export class DuplicateInventoryItemError extends Error {
	readonly _tag = 'DuplicateInventoryItemError';

	constructor(variantId: string, warehouseId: string) {
		super(
			`Inventory item for variant ${variantId} in warehouse ${warehouseId} already exists`
		);
	}
}
