import { ok, type Result } from '@common/interfaces/result.interface';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { InventoryItemDetail } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import {
	type IInventoryItemRepository,
	INVENTORY_ITEM_REPOSITORY,
} from '../../domain/ports/inventory-item.repository.port';
import type { IGetVariantsInventoryUseCase } from '../../domain/ports/inventory-use-cases.port';

@Injectable()
export class GetVariantsInventoryUseCase
	implements IGetVariantsInventoryUseCase
{
	constructor(
		@Inject(INVENTORY_ITEM_REPOSITORY)
		private readonly repo: IInventoryItemRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	async execute(input: {
		variantIds: string[];
		storeId: string;
	}): Promise<Result<Record<string, InventoryItemDetail[]>, Error>> {
		return this.tracer.withSpan(
			'use-case.inventory.get-variants-inventory',
			async () => {
				const result = await this.repo.listByVariants(
					input.variantIds,
					input.storeId
				);
				return ok(result);
			}
		);
	}
}
