import { Result } from '@common/interfaces/result.interface';
import { InventoryItemDetail } from '@ferrite/schema';

export const INVENTORY_SERVICE = Symbol('IInventoryService');

export interface IInventoryService {
	getInventoryForVariants(
		storeId: string,
		variantIds: string[]
	): Promise<Result<Record<string, InventoryItemDetail[]>, Error>>;
}
