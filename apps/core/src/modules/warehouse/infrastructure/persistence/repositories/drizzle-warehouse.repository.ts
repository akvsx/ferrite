import type {
	ITransactionContext,
	IUnitOfWork,
} from '@common/interfaces/unit-of-work.interface';
import { UNIT_OF_WORK } from '@common/interfaces/unit-of-work.interface';
import { DB } from '@core/database/db.provider';
import type { TDatabase } from '@core/database/db.type';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	CreateWarehouseInput,
	ListWarehousesQuery,
	UpdateWarehouseInput,
	Warehouse,
} from '@ferrite/schema';
import { Inject, Injectable } from '@nestjs/common';
import type { IWarehouseRepository } from '../../../domain/ports/warehouse.repository.port';
import { executeCreateWarehouse } from './queries/create-warehouse.query';
import { executeSoftDeleteWarehouse } from './queries/delete-warehouse.query';
import {
	executeFindWarehouseById,
	executeFindWarehouseByIdOrName,
	executeFindWarehouseByName,
} from './queries/find-warehouse.query';
import {
	executeFindActiveWarehouses,
	executeFindWarehouses,
} from './queries/list-warehouses.query';
import { executeUpdateWarehouse } from './queries/update-warehouse.query';

@Injectable()
export class DrizzleWarehouseRepository implements IWarehouseRepository {
	constructor(
		@Inject(DB) private readonly db: TDatabase,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	async create(
		storeId: string,
		input: CreateWarehouseInput,
		tx?: ITransactionContext
	): Promise<Warehouse> {
		const run = (ctx: ITransactionContext) =>
			executeCreateWarehouse(this.tracer, ctx, storeId, input);
		if (tx) return run(tx);
		return this.uow.execute(run);
	}

	async update(
		id: string,
		storeId: string,
		input: UpdateWarehouseInput
	): Promise<Warehouse | null> {
		return executeUpdateWarehouse(this.tracer, this.db, id, storeId, input);
	}

	async softDelete(id: string, storeId: string): Promise<boolean> {
		return executeSoftDeleteWarehouse(this.tracer, this.db, id, storeId);
	}

	async findByIdAndStore(
		id: string,
		storeId: string
	): Promise<Warehouse | null> {
		return executeFindWarehouseById(this.tracer, this.db, id, storeId);
	}

	async findByStoreId(storeId: string, query: ListWarehousesQuery) {
		return executeFindWarehouses(this.tracer, this.db, storeId, query);
	}

	async findByNameAndStore(
		name: string,
		storeId: string
	): Promise<Warehouse | null> {
		return executeFindWarehouseByName(this.tracer, this.db, name, storeId);
	}

	async findByIdOrNameAndStore(
		id: string,
		name: string,
		storeId: string
	): Promise<Warehouse[]> {
		return executeFindWarehouseByIdOrName(
			this.tracer,
			this.db,
			id,
			name,
			storeId
		);
	}

	async findActiveByStoreId(storeId: string): Promise<Warehouse[]> {
		return executeFindActiveWarehouses(this.tracer, this.db, storeId);
	}
}
