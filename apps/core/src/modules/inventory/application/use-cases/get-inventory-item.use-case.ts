import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { InventoryItemDetail } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import { InventoryItemNotFoundError } from '../../domain/errors';
import {
	type IInventoryItemRepository,
	INVENTORY_ITEM_REPOSITORY,
} from '../../domain/ports/inventory-item.repository.port';
import type { IGetInventoryItemUseCase } from '../../domain/ports/inventory-use-cases.port';

@Injectable()
export class GetInventoryItemUseCase implements IGetInventoryItemUseCase {
	constructor(
		@Inject(INVENTORY_ITEM_REPOSITORY)
		private readonly inventoryItemRepo: IInventoryItemRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		id: string;
		storeId: string;
	}): Promise<Result<InventoryItemDetail, InventoryItemNotFoundError>> {
		return this.tracer.withSpan('use-case.inventory.get-item', async () => {
			const item = await this.inventoryItemRepo.findByIdAndStore(
				input.id,
				input.storeId
			);

			if (!item) {
				return err(new InventoryItemNotFoundError(input.id));
			}

			return ok(item);
		});
	}
}
