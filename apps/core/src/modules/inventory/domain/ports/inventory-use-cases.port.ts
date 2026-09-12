import { Result } from '@common/interfaces/result.interface';
import {
	AdjustStockInput,
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
	TransferStockInput,
	VariantInventorySyncPayload,
} from '@ferrite/schema';
import { WarehouseNotFoundError } from '@modules/warehouse/domain/errors';
import {
	DuplicateInventoryItemError,
	InsufficientStockError,
	InvalidAdjustmentError,
	InvalidTransferError,
	InventoryItemNotFoundError,
	VariantNotFoundError,
} from '../errors';

// Inventory Item & Stock Use Cases

export const CREATE_INVENTORY_ITEM_UC = Symbol('ICreateInventoryItemUseCase');
export interface ICreateInventoryItemUseCase {
	execute(input: {
		storeId: string;
		data: CreateInventoryItemInput;
	}): Promise<
		Result<
			InventoryItemDetail,
			| WarehouseNotFoundError
			| VariantNotFoundError
			| DuplicateInventoryItemError
		>
	>;
}

export const GET_INVENTORY_ITEM_UC = Symbol('IGetInventoryItemUseCase');
export interface IGetInventoryItemUseCase {
	execute(input: {
		id: string;
		storeId: string;
	}): Promise<Result<InventoryItemDetail, InventoryItemNotFoundError>>;
}

export const GET_VARIANTS_INVENTORY_UC = Symbol('IGetVariantsInventoryUseCase');
export interface IGetVariantsInventoryUseCase {
	execute(input: {
		variantIds: string[];
		storeId: string;
	}): Promise<Result<Record<string, InventoryItemDetail[]>, Error>>;
}

export const LIST_INVENTORY_ITEMS_UC = Symbol('IListInventoryItemsUseCase');
export interface IListInventoryItemsUseCase {
	execute(input: {
		storeId: string;
		query: ListInventoryQuery;
		warehouseId?: string;
	}): Promise<Result<PaginatedResponse<InventoryItemDetail>, Error>>;
}

export const ADJUST_STOCK_UC = Symbol('IAdjustStockUseCase');
export interface IAdjustStockUseCase {
	execute(input: {
		storeId: string;
		data: AdjustStockInput;
	}): Promise<
		Result<
			InventoryLevel,
			| InventoryItemNotFoundError
			| InsufficientStockError
			| InvalidAdjustmentError
		>
	>;
}

export const LIST_INVENTORY_ADJUSTMENTS_UC = Symbol(
	'IListInventoryAdjustmentsUseCase'
);
export interface IListInventoryAdjustmentsUseCase {
	execute(input: {
		storeId: string;
		inventoryItemId: string;
		query: ListInventoryAdjustmentsQuery;
	}): Promise<
		Result<PaginatedResponse<InventoryAdjustment>, InventoryItemNotFoundError>
	>;
}

export const TRANSFER_STOCK_UC = Symbol('ITransferStockUseCase');
export interface ITransferStockUseCase {
	execute(input: {
		storeId: string;
		data: TransferStockInput;
	}): Promise<
		Result<
			{ source: InventoryLevel; destination: InventoryLevel },
			InventoryItemNotFoundError | InsufficientStockError | InvalidTransferError
		>
	>;
}

export const LIST_LOW_STOCK_UC = Symbol('IListLowStockUseCase');
export interface IListLowStockUseCase {
	execute(input: {
		storeId: string;
		query: LowStockQuery;
	}): Promise<Result<PaginatedResponse<LowStockItem>, Error>>;
}

export const SYNC_VARIANT_INVENTORY_UC = Symbol('ISyncVariantInventoryUseCase');
export interface ISyncVariantInventoryUseCase {
	execute(input: VariantInventorySyncPayload): Promise<Result<void, Error>>;
}

export const CHECK_AVAILABILITY_UC = Symbol('ICheckAvailabilityUseCase');
export interface ICheckAvailabilityUseCase {
	execute(input: {
		storeId: string;
		variantIds: string[];
	}): Promise<Result<AvailabilityResult[], Error>>;
}
