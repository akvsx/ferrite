import { ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { AvailabilityResult } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import {
	type IInventoryItemRepository,
	INVENTORY_ITEM_REPOSITORY,
} from '../../domain/ports/inventory-item.repository.port';
import type { ICheckAvailabilityUseCase } from '../../domain/ports/inventory-use-cases.port';

@Injectable()
export class CheckAvailabilityUseCase implements ICheckAvailabilityUseCase {
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
		variantIds: string[];
	}): Promise<Result<AvailabilityResult[], Error>> {
		return this.tracer.withSpan(
			'use-case.inventory.check-availability',
			async () => {
				const results = await this.inventoryItemRepo.checkAvailability(
					input.variantIds,
					input.storeId
				);
				return ok(results);
			}
		);
	}
}
