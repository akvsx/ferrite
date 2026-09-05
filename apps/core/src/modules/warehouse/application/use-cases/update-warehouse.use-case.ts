import { isUniqueViolation } from '@common/errors/handlers/pg-errors';
import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { UpdateWarehouseInput, Warehouse } from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import {
	UnknownWarehouseError,
	WarehouseNameConflictError,
	WarehouseNotFoundError,
} from '../../domain/errors';
import {
	type IWarehouseRepository,
	WAREHOUSE_REPOSITORY,
} from '../../domain/ports';
import type { IUpdateWarehouseUseCase } from '../../domain/ports/warehouse-use-cases.port';

@Injectable()
export class UpdateWarehouseUseCase implements IUpdateWarehouseUseCase {
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
		data: UpdateWarehouseInput;
	}): Promise<
		Result<
			Warehouse,
			| WarehouseNotFoundError
			| WarehouseNameConflictError
			| UnknownWarehouseError
		>
	> {
		return this.tracer.withSpan('use-case.warehouses.update', async () => {
			this.logger.debug(
				`Updating warehouse ${input.id} for store ${input.storeId}`
			);

			if (input.data.name) {
				const existingRecords = await this.warehouseRepo.findByIdOrNameAndStore(
					input.id,
					input.data.name,
					input.storeId
				);
				const existing = existingRecords.find((r) => r.id === input.id);
				if (!existing) {
					return err(new WarehouseNotFoundError(input.id));
				}
				const conflict = existingRecords.find(
					(r) => r.name === input.data.name && r.id !== input.id
				);
				if (conflict) {
					return err(new WarehouseNameConflictError(input.data.name));
				}
			} else {
				const existing = await this.warehouseRepo.findByIdAndStore(
					input.id,
					input.storeId
				);
				if (!existing) {
					return err(new WarehouseNotFoundError(input.id));
				}
			}

			try {
				const updated = await this.warehouseRepo.update(
					input.id,
					input.storeId,
					input.data
				);
				if (!updated) {
					return err(new WarehouseNotFoundError(input.id));
				}
				return ok(updated);
			} catch (error: any) {
				if (isUniqueViolation(error)) {
					return err(
						new WarehouseNameConflictError(input.data.name ?? 'Unknown')
					);
				}
				return err(new UnknownWarehouseError(error));
			}
		});
	}
}
