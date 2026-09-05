import { UseRealm } from '@auth/index';
import { Pagination } from '@common/decorators/pagination.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	PaginatedResponse,
	PaginationInput,
	Warehouse,
} from '@ferrite/schema';
import { ListWarehousesQuerySchema } from '@ferrite/schema';
import { StorePermissionGuard } from '@modules/store/infrastructure/http/guards/store-permission.guard';
import {
	Body,
	ConflictException,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Inject,
	InternalServerErrorException,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
	WarehouseNameConflictError,
	WarehouseNotFoundError,
} from '../../../domain/errors';
import {
	CREATE_WAREHOUSE_UC,
	DELETE_WAREHOUSE_UC,
	GET_WAREHOUSE_UC,
	type ICreateWarehouseUseCase,
	type IDeleteWarehouseUseCase,
	type IGetWarehouseUseCase,
	type IListWarehousesUseCase,
	type IUpdateWarehouseUseCase,
	LIST_WAREHOUSES_UC,
	UPDATE_WAREHOUSE_UC,
} from '../../../domain/ports/warehouse-use-cases.port';
import {
	CreateWarehouseDocs,
	DeleteWarehouseDocs,
	GetWarehouseDocs,
	ListWarehousesDocs,
	UpdateWarehouseDocs,
} from '../docs/warehouse.admin.docs';
import { CreateWarehouseDto } from '../dto/create-warehouse.dto';
import { UpdateWarehouseDto } from '../dto/update-warehouse.dto';

@ApiTags('Warehouses')
@ApiBearerAuth('swagger-access-token')
@UseGuards(StorePermissionGuard)
@Controller('stores/:storeId/warehouses/admin')
@UseRealm('platform')
export class WarehouseAdminController {
	constructor(
		@Inject(CREATE_WAREHOUSE_UC)
		private readonly createWarehouseUc: ICreateWarehouseUseCase,
		@Inject(UPDATE_WAREHOUSE_UC)
		private readonly updateWarehouseUc: IUpdateWarehouseUseCase,
		@Inject(DELETE_WAREHOUSE_UC)
		private readonly deleteWarehouseUc: IDeleteWarehouseUseCase,
		@Inject(GET_WAREHOUSE_UC)
		private readonly getWarehouseUc: IGetWarehouseUseCase,
		@Inject(LIST_WAREHOUSES_UC)
		private readonly listWarehousesUc: IListWarehousesUseCase,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	@Post()
	@CreateWarehouseDocs()
	@RequirePermission('warehouses.create')
	async createWarehouse(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Body() payload: CreateWarehouseDto
	): Promise<Warehouse> {
		return this.tracer.withSpan('http.admin.warehouses.create', async () => {
			const result = await this.createWarehouseUc.execute({
				storeId,
				data: payload,
			});

			if (result.isErr()) {
				if (result.error instanceof WarehouseNameConflictError) {
					throw new ConflictException(result.error.message);
				}
				throw new InternalServerErrorException('Failed to create warehouse');
			}
			return result.value;
		});
	}

	@Get()
	@ListWarehousesDocs()
	@RequirePermission('warehouses.read')
	async listWarehouses(
		@Pagination() pagination: PaginationInput,
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Query() query: Record<string, string>
	): Promise<PaginatedResponse<Warehouse>> {
		return this.tracer.withSpan('http.admin.warehouses.list', async () => {
			const parsed = ListWarehousesQuerySchema.parse(query);
			const result = await this.listWarehousesUc.execute({
				storeId,
				query: parsed,
				...pagination,
			});

			if (result.isErr()) {
				throw new InternalServerErrorException('Failed to list warehouses');
			}
			return result.value;
		});
	}

	@Get(':warehouseId')
	@GetWarehouseDocs()
	@RequirePermission('warehouses.read')
	async getWarehouse(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('warehouseId', ParseUUIDPipe) warehouseId: string
	): Promise<Warehouse> {
		return this.tracer.withSpan('http.admin.warehouses.get', async () => {
			const result = await this.getWarehouseUc.execute({
				id: warehouseId,
				storeId,
			});

			if (result.isErr()) {
				if (result.error instanceof WarehouseNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				throw new InternalServerErrorException('Failed to get warehouse');
			}
			return result.value;
		});
	}

	@Patch(':warehouseId')
	@UpdateWarehouseDocs()
	@RequirePermission('warehouses.update')
	async updateWarehouse(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('warehouseId', ParseUUIDPipe) warehouseId: string,
		@Body() payload: UpdateWarehouseDto
	): Promise<Warehouse> {
		return this.tracer.withSpan('http.admin.warehouses.update', async () => {
			const result = await this.updateWarehouseUc.execute({
				id: warehouseId,
				storeId,
				data: payload,
			});

			if (result.isErr()) {
				if (result.error instanceof WarehouseNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				if (result.error instanceof WarehouseNameConflictError) {
					throw new ConflictException(result.error.message);
				}
				throw new InternalServerErrorException('Failed to update warehouse');
			}
			return result.value;
		});
	}

	@Delete(':warehouseId')
	@HttpCode(HttpStatus.NO_CONTENT)
	@DeleteWarehouseDocs()
	@RequirePermission('warehouses.delete')
	async deleteWarehouse(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('warehouseId', ParseUUIDPipe) warehouseId: string
	): Promise<void> {
		return this.tracer.withSpan('http.admin.warehouses.delete', async () => {
			const result = await this.deleteWarehouseUc.execute({
				id: warehouseId,
				storeId,
			});

			if (result.isErr()) {
				if (result.error instanceof WarehouseNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				throw new InternalServerErrorException('Failed to delete warehouse');
			}
		});
	}
}
