import { ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	InventoryItemDetail,
	ListInventoryQuery,
	PaginatedResponse,
} from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import {
	type IInventoryItemRepository,
	INVENTORY_ITEM_REPOSITORY,
} from '../../domain/ports/inventory-item.repository.port';
import type { IListInventoryItemsUseCase } from '../../domain/ports/inventory-use-cases.port';

@Injectable()
export class ListInventoryItemsUseCase implements IListInventoryItemsUseCase {
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
		query: ListInventoryQuery;
		warehouseId?: string;
	}): Promise<Result<PaginatedResponse<InventoryItemDetail>, Error>> {
		return this.tracer.withSpan('use-case.inventory.list-items', async () => {
			if (input.warehouseId) {
				const result = await this.inventoryItemRepo.listByWarehouse(
					input.warehouseId,
					input.storeId,
					input.query
				);
				return ok(result);
			}

			// If variantId is provided but no warehouseId, list by variant
			if (input.query.variantId) {
				const items = await this.inventoryItemRepo.listByVariant(
					input.query.variantId,
					input.storeId
				);
				return ok({ items });
			}

			// Default: requires warehouseId for scoping; return empty if no filter
			return ok({ items: [] });
		});
	}
}
