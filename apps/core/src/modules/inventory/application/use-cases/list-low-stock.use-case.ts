import { ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	LowStockItem,
	LowStockQuery,
	PaginatedResponse,
} from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import {
	type IInventoryItemRepository,
	INVENTORY_ITEM_REPOSITORY,
} from '../../domain/ports/inventory-item.repository.port';
import type { IListLowStockUseCase } from '../../domain/ports/inventory-use-cases.port';

@Injectable()
export class ListLowStockUseCase implements IListLowStockUseCase {
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
		query: LowStockQuery;
	}): Promise<Result<PaginatedResponse<LowStockItem>, Error>> {
		return this.tracer.withSpan(
			'use-case.inventory.list-low-stock',
			async () => {
				const result = await this.inventoryItemRepo.findLowStock(
					input.storeId,
					input.query
				);
				return ok(result);
			}
		);
	}
}
