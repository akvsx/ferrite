import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { Warehouse } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import {
	UnknownWarehouseError,
	WarehouseNotFoundError,
} from '../../domain/errors';
import {
	type IWarehouseRepository,
	WAREHOUSE_REPOSITORY,
} from '../../domain/ports';
import type { IGetWarehouseUseCase } from '../../domain/ports/warehouse-use-cases.port';

@Injectable()
export class GetWarehouseUseCase implements IGetWarehouseUseCase {
	constructor(
		@Inject(WAREHOUSE_REPOSITORY)
		private readonly warehouseRepo: IWarehouseRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		id: string;
		storeId: string;
	}): Promise<
		Result<Warehouse, WarehouseNotFoundError | UnknownWarehouseError>
	> {
		return this.tracer.withSpan('use-case.warehouses.get', async () => {
			this.logger.debug(
				`Getting warehouse ${input.id} for store ${input.storeId}`
			);

			try {
				const warehouse = await this.warehouseRepo.findByIdAndStore(
					input.id,
					input.storeId
				);
				if (!warehouse) {
					return err(new WarehouseNotFoundError(input.id));
				}
				return ok(warehouse);
			} catch (error) {
				return err(new UnknownWarehouseError(error));
			}
		});
	}
}
