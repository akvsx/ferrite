import { StoreModule } from '@modules/store';
import { Module } from '@nestjs/common';
import { CreateWarehouseUseCase } from './application/use-cases/create-warehouse.use-case';
import { DeleteWarehouseUseCase } from './application/use-cases/delete-warehouse.use-case';
import { GetWarehouseUseCase } from './application/use-cases/get-warehouse.use-case';
import { ListWarehousesUseCase } from './application/use-cases/list-warehouses.use-case';
import { UpdateWarehouseUseCase } from './application/use-cases/update-warehouse.use-case';
import { WAREHOUSE_REPOSITORY } from './domain/ports/warehouse.repository.port';
import {
	CREATE_WAREHOUSE_UC,
	DELETE_WAREHOUSE_UC,
	GET_WAREHOUSE_UC,
	LIST_WAREHOUSES_UC,
	UPDATE_WAREHOUSE_UC,
} from './domain/ports/warehouse-use-cases.port';
import { WarehouseAdminController } from './infrastructure/http/controllers/warehouse.admin.controller';
import { DrizzleWarehouseRepository } from './infrastructure/persistence/repositories/drizzle-warehouse.repository';

@Module({
	imports: [StoreModule],
	controllers: [WarehouseAdminController],
	providers: [
		{
			provide: WAREHOUSE_REPOSITORY,
			useClass: DrizzleWarehouseRepository,
		},
		{
			provide: CREATE_WAREHOUSE_UC,
			useClass: CreateWarehouseUseCase,
		},
		{
			provide: UPDATE_WAREHOUSE_UC,
			useClass: UpdateWarehouseUseCase,
		},
		{
			provide: GET_WAREHOUSE_UC,
			useClass: GetWarehouseUseCase,
		},
		{
			provide: LIST_WAREHOUSES_UC,
			useClass: ListWarehousesUseCase,
		},
		{
			provide: DELETE_WAREHOUSE_UC,
			useClass: DeleteWarehouseUseCase,
		},
	],
	exports: [WAREHOUSE_REPOSITORY],
})
export class WarehouseModule {}
