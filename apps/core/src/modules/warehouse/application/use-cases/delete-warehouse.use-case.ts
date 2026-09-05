import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { Inject, Injectable } from '@nestjs/common';
import {
	UnknownWarehouseError,
	WarehouseNotFoundError,
} from '../../domain/errors';
import {
	type IWarehouseRepository,
	WAREHOUSE_REPOSITORY,
} from '../../domain/ports';
import type { IDeleteWarehouseUseCase } from '../../domain/ports/warehouse-use-cases.port';

@Injectable()
export class DeleteWarehouseUseCase implements IDeleteWarehouseUseCase {
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
	}): Promise<Result<void, WarehouseNotFoundError | UnknownWarehouseError>> {
		return this.tracer.withSpan('use-case.warehouses.delete', async () => {
			this.logger.debug(
				`Deleting warehouse ${input.id} for store ${input.storeId}`
			);

			try {
				const warehouse = await this.warehouseRepo.findByIdAndStore(
					input.id,
					input.storeId
				);
				if (!warehouse) {
					return err(new WarehouseNotFoundError(input.id));
				}

				const deleted = await this.warehouseRepo.softDelete(
					input.id,
					input.storeId
				);
				if (!deleted) {
					return err(new WarehouseNotFoundError(input.id));
				}

				return ok(undefined);
			} catch (error) {
				return err(new UnknownWarehouseError(error));
			}
		});
	}
}
