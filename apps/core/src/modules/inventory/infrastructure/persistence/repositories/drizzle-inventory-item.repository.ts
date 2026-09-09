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
	InventoryItemDetail,
	InventoryLevel,
	ListInventoryQuery,
	LowStockItem,
	LowStockQuery,
} from '@ferrite/schema';
import { PaginatedResponse } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import type { IInventoryItemRepository } from '../../../domain/ports/inventory-item.repository.port';
import {
	executeCheckAvailability,
	executeFindLowStock,
} from './queries/inventory-availability.queries';
import {
	executeFindInventoryItemByIdAndStore,
	executeListInventoryByVariant,
	executeListInventoryByWarehouse,
} from './queries/inventory-item-read.queries';
import {
	executeBulkCreateIfNotExists,
	executeCreateInventoryItem,
} from './queries/inventory-item-write.queries';
import { executeAdjustStock } from './queries/inventory-stock.queries';

@Injectable()
export class DrizzleInventoryItemRepository
	implements IInventoryItemRepository
{
	constructor(
		@Inject(DB) private readonly db: TDatabase,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

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
		storeId: string
	): Promise<InventoryItemDetail[]> {
		return executeListInventoryByVariant(
			this.tracer,
			this.db,
			variantId,
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
