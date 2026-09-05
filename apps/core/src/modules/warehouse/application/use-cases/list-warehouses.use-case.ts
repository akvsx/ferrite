import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	ListWarehousesQuery,
	PaginatedResponse,
	PaginationInput,
	Warehouse,
} from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import { UnknownWarehouseError } from '../../domain/errors';
import {
	type IWarehouseRepository,
	WAREHOUSE_REPOSITORY,
} from '../../domain/ports';
import type { IListWarehousesUseCase } from '../../domain/ports/warehouse-use-cases.port';

@Injectable()
export class ListWarehousesUseCase implements IListWarehousesUseCase {
	constructor(
		@Inject(WAREHOUSE_REPOSITORY)
		private readonly warehouseRepo: IWarehouseRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(
		input: {
			storeId: string;
			query: ListWarehousesQuery;
		} & PaginationInput
	): Promise<Result<PaginatedResponse<Warehouse>, UnknownWarehouseError>> {
		return this.tracer.withSpan('use-case.warehouses.list', async () => {
			this.logger.debug(`Listing warehouses for store ${input.storeId}`);

			try {
				const result = await this.warehouseRepo.findByStoreId(input.storeId, {
					...input.query,
					limit: input.limit ?? input.query.limit,
					cursor: input.cursor ?? input.query.cursor,
				});
				return ok(result);
			} catch (error) {
				return err(new UnknownWarehouseError(error));
			}
		});
	}
}
