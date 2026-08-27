import { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import {
	AdjustmentType,
	AvailabilityResult,
	CreateInventoryItemInput,
	InventoryItemDetail,
	InventoryLevel,
	ListInventoryQuery,
	LowStockItem,
	LowStockQuery,
	PaginatedResponse,
} from '@ferrite/schema';

export const INVENTORY_ITEM_REPOSITORY = Symbol('IInventoryItemRepository');

export interface IInventoryItemRepository {
	create(
		input: CreateInventoryItemInput,
		tx?: ITransactionContext
	): Promise<InventoryItemDetail>;
	bulkCreateIfNotExists(
		inputs: CreateInventoryItemInput[],
		tx?: ITransactionContext
	): Promise<void>;
	findByIdAndStore(
		id: string,
		storeId: string
	): Promise<InventoryItemDetail | null>;
	listByWarehouse(
		warehouseId: string,
		storeId: string,
		query: ListInventoryQuery
	): Promise<PaginatedResponse<InventoryItemDetail>>;
	listByVariant(
		variantId: string,
		storeId: string
	): Promise<InventoryItemDetail[]>;

	adjustStock(
		inventoryItemId: string,
		adjustment: {
			type: AdjustmentType;
			quantityChange: number;
			reason?: string;
			adjustedBy?: string;
		},
		tx: ITransactionContext
	): Promise<InventoryLevel | null>;

	findLowStock(
		storeId: string,
		query: LowStockQuery
	): Promise<PaginatedResponse<LowStockItem>>;
	checkAvailability(
		variantIds: string[],
		storeId: string
	): Promise<AvailabilityResult[]>;
}
