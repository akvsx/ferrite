import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import {
	AdjustmentType,
	AvailabilityResult,
	CreateInventoryItemInput,
	InventoryAdjustment,
	InventoryItemDetail,
	InventoryLevel,
	ListInventoryAdjustmentsQuery,
	ListInventoryQuery,
	LowStockItem,
	LowStockQuery,
	PaginatedResponse,
} from '@ferrite/schema';

export const INVENTORY_ITEM_REPOSITORY = Symbol('IInventoryItemRepository');

export interface IInventoryItemRepository {
	variantExistsForStore(variantId: string, storeId: string): Promise<boolean>;
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
	listByVariants(
		variantIds: string[],
		storeId: string
	): Promise<Record<string, InventoryItemDetail[]>>;

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

	// Reservation lifecycle (consumed by Orders module)
	reserveStock(
		inventoryItemId: string,
		quantity: number,
		tx: ITransactionContext
	): Promise<InventoryLevel | null>;

	releaseReservation(
		inventoryItemId: string,
		quantity: number,
		tx: ITransactionContext
	): Promise<InventoryLevel>;

	consumeReservation(
		inventoryItemId: string,
		quantity: number,
		tx: ITransactionContext
	): Promise<InventoryLevel>;

	listAdjustments(
		inventoryItemId: string,
		storeId: string,
		query: ListInventoryAdjustmentsQuery
	): Promise<PaginatedResponse<InventoryAdjustment>>;

	findLowStock(
		storeId: string,
		query: LowStockQuery
	): Promise<PaginatedResponse<LowStockItem>>;
	checkAvailability(
		variantIds: string[],
		storeId: string
	): Promise<AvailabilityResult[]>;
}
