import type {
	ITransactionContext,
	IUnitOfWork,
} from '@common/interfaces/unit-of-work.interface';
import { UNIT_OF_WORK } from '@common/interfaces/unit-of-work.interface';
import { DB } from '@core/database/db.provider';
import type { TDatabase } from '@core/database/db.type';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
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
import { Inject, Injectable } from '@nestjs/common';
import type { IInventoryItemRepository } from '../../../domain/ports/inventory-item.repository.port';
import {
	executeCheckAvailability,
	executeFindLowStock,
} from './queries/inventory-availability.queries';
import {
	executeFindInventoryItemByIdAndStore,
	executeListInventoryByVariant,
	executeListInventoryByVariants,
	executeListInventoryByWarehouse,
	executeVariantExistsForStore,
} from './queries/inventory-item-read.queries';
import {
	executeBulkCreateIfNotExists,
	executeCreateInventoryItem,
} from './queries/inventory-item-write.queries';
import {
	executeAdjustStock,
	executeListAdjustments,
} from './queries/inventory-stock.queries';

@Injectable()
export class DrizzleInventoryItemRepository
	implements IInventoryItemRepository
{
	constructor(
		@Inject(DB) private readonly db: TDatabase,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	async variantExistsForStore(
		variantId: string,
		storeId: string
	): Promise<boolean> {
		return executeVariantExistsForStore(
			this.tracer,
			this.db,
			variantId,
			storeId
		);
	}

	async create(
		input: CreateInventoryItemInput,
		tx?: ITransactionContext
	): Promise<InventoryItemDetail> {
		const run = (ctx: ITransactionContext) =>
			executeCreateInventoryItem(this.tracer, ctx, input);

		if (tx) return run(tx);
		return this.uow.execute(run);
	}

	async bulkCreateIfNotExists(
		inputs: CreateInventoryItemInput[],
		tx?: ITransactionContext
	): Promise<void> {
		const run = (ctx: ITransactionContext) =>
			executeBulkCreateIfNotExists(this.tracer, ctx, inputs);

		if (tx) return run(tx);
		return this.uow.execute(run);
	}

	async findByIdAndStore(
		id: string,
		storeId: string
	): Promise<InventoryItemDetail | null> {
		return executeFindInventoryItemByIdAndStore(
			this.tracer,
			this.db,
			id,
			storeId
		);
	}

	async listByWarehouse(
		warehouseId: string,
		storeId: string,
		query: ListInventoryQuery
	): Promise<PaginatedResponse<InventoryItemDetail>> {
		return executeListInventoryByWarehouse(
			this.tracer,
			this.db,
			warehouseId,
			storeId,
			query
		);
	}

	async listByVariant(
		variantId: string,
		storeId: string,
		query: ListInventoryQuery
	): Promise<PaginatedResponse<InventoryItemDetail>> {
		return executeListInventoryByVariant(
			this.tracer,
			this.db,
			variantId,
			storeId,
			query
		);
	}

	async listByVariants(
		variantIds: string[],
		storeId: string
	): Promise<Record<string, InventoryItemDetail[]>> {
		return executeListInventoryByVariants(
			this.tracer,
			this.db,
			variantIds,
			storeId
		);
	}

	async adjustStock(
		inventoryItemId: string,
		adjustment: {
			type: AdjustmentType;
			quantityChange: number;
			reason?: string;
			adjustedBy?: string;
		},
		tx: ITransactionContext
	): Promise<InventoryLevel | null> {
		return executeAdjustStock(this.tracer, tx, inventoryItemId, adjustment);
	}

	async listAdjustments(
		inventoryItemId: string,
		_storeId: string, // Not directly used in the query, but guaranteed by the Use Case to be the owner
		query: ListInventoryAdjustmentsQuery
	): Promise<PaginatedResponse<InventoryAdjustment>> {
		return this.tracer.withSpan('db.inventory_adjustments.list', async () => {
			return executeListAdjustments(this.db, inventoryItemId, query);
		});
	}

	async reserveStock(
		_inventoryItemId: string,
		_quantity: number,
		_tx: ITransactionContext
	): Promise<InventoryLevel | null> {
		throw new Error('Not implemented, awaiting Orders module');
	}

	async releaseReservation(
		_inventoryItemId: string,
		_quantity: number,
		_tx: ITransactionContext
	): Promise<InventoryLevel> {
		throw new Error('Not implemented, awaiting Orders module');
	}

	async consumeReservation(
		_inventoryItemId: string,
		_quantity: number,
		_tx: ITransactionContext
	): Promise<InventoryLevel> {
		throw new Error('Not implemented, awaiting Orders module');
	}

	async findLowStock(
		storeId: string,
		query: LowStockQuery
	): Promise<PaginatedResponse<LowStockItem>> {
		return executeFindLowStock(this.tracer, this.db, storeId, query);
	}

	async checkAvailability(
		variantIds: string[],
		storeId: string
	): Promise<AvailabilityResult[]> {
		return executeCheckAvailability(this.tracer, this.db, variantIds, storeId);
	}
}
