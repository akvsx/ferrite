import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	InventoryAdjustment,
	ListInventoryAdjustmentsQuery,
} from '@ferrite/schema';
import type { PaginatedResponse } from '@ferrite/schema/common/pagination.zodschema';
import { Inject, Injectable } from '@nestjs/common';
import { InventoryItemNotFoundError } from '../../domain/errors';
import {
	type IInventoryItemRepository,
	INVENTORY_ITEM_REPOSITORY,
} from '../../domain/ports/inventory-item.repository.port';
import type { IListInventoryAdjustmentsUseCase } from '../../domain/ports/inventory-use-cases.port';

@Injectable()
export class ListInventoryAdjustmentsUseCase
	implements IListInventoryAdjustmentsUseCase
{
	constructor(
		@Inject(INVENTORY_ITEM_REPOSITORY)
		private readonly inventoryItemRepo: IInventoryItemRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		storeId: string;
		inventoryItemId: string;
		query: ListInventoryAdjustmentsQuery;
	}): Promise<
		Result<PaginatedResponse<InventoryAdjustment>, InventoryItemNotFoundError>
	> {
		return this.tracer.withSpan(
			'use-case.inventory.list-adjustments',
			async () => {
				// Verify the item belongs to the requested store first to enforce tenant boundaries
				const item = await this.inventoryItemRepo.findByIdAndStore(
					input.inventoryItemId,
					input.storeId
				);

				if (!item) {
					this.logger.debug(
						`List adjustments failed: Item ${input.inventoryItemId} not found in store ${input.storeId}`
					);
					return err(new InventoryItemNotFoundError(input.inventoryItemId));
				}

				const result = await this.inventoryItemRepo.listAdjustments(
					input.inventoryItemId,
					input.storeId,
					input.query
				);

				return ok(result);
			}
		);
	}
}
