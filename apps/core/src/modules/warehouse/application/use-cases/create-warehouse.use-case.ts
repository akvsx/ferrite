import { isUniqueViolation } from '@common/errors/handlers/pg-errors';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { CreateWarehouseInput, Warehouse } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import {
	UnknownWarehouseError,
	WarehouseNameConflictError,
} from '../../domain/errors';
import {
	type IWarehouseRepository,
	WAREHOUSE_REPOSITORY,
} from '../../domain/ports';
import type { ICreateWarehouseUseCase } from '../../domain/ports/warehouse-use-cases.port';

@Injectable()
export class CreateWarehouseUseCase implements ICreateWarehouseUseCase {
	constructor(
		@Inject(WAREHOUSE_REPOSITORY)
		private readonly warehouseRepo: IWarehouseRepository,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(this.constructor.name);
	}

	async execute(input: {
		storeId: string;
		data: CreateWarehouseInput;
	}): Promise<
		Result<Warehouse, WarehouseNameConflictError | UnknownWarehouseError>
	> {
		return this.tracer.withSpan('use-case.warehouses.create', async () => {
			this.logger.debug(
				`Creating warehouse for store ${input.storeId} with name ${input.data.name}`
			);

			const existing = await this.warehouseRepo.findByNameAndStore(
				input.data.name,
				input.storeId
			);
			if (existing) {
				return err(new WarehouseNameConflictError(input.data.name));
			}

			try {
				const warehouse = await this.warehouseRepo.create(
					input.storeId,
					input.data
				);
				return ok(warehouse);
			} catch (error: any) {
				if (isUniqueViolation(error)) {
					return err(new WarehouseNameConflictError(input.data.name));
				}
				return err(new UnknownWarehouseError(error));
			}
		});
	}
}
