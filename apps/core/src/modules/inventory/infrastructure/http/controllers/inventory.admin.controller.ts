import { UseRealm } from '@auth/index';
import { PlatformUserParam } from '@common/decorators/auth-user.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type {
	InventoryAdjustment,
	InventoryItemDetail,
	InventoryLevel,
	LowStockItem,
	PaginatedResponse,
} from '@ferrite/schema';
import {
	ListInventoryAdjustmentsQuerySchema,
	ListInventoryQuerySchema,
	LowStockQuerySchema,
} from '@ferrite/schema';
import { type PlatformUser } from '@ferrite/schema/auth/auth-user.zodschema';
import { StorePermissionGuard } from '@modules/store/infrastructure/http/guards/store-permission.guard';
import { WarehouseNotFoundError } from '@modules/warehouse/domain/errors';
import {
	BadRequestException,
	Body,
	ConflictException,
	Controller,
	Get,
	Inject,
	InternalServerErrorException,
	NotFoundException,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
	UnprocessableEntityException,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
	DuplicateInventoryItemError,
	InsufficientStockError,
	InvalidAdjustmentError,
	InvalidTransferError,
	InventoryItemNotFoundError,
	VariantNotFoundError,
} from '../../../domain/errors';
import {
	ADJUST_STOCK_UC,
	CREATE_INVENTORY_ITEM_UC,
	GET_INVENTORY_ITEM_UC,
	type IAdjustStockUseCase,
	type ICreateInventoryItemUseCase,
	type IGetInventoryItemUseCase,
	type IListInventoryAdjustmentsUseCase,
	type IListInventoryItemsUseCase,
	type IListLowStockUseCase,
	type ITransferStockUseCase,
	LIST_INVENTORY_ADJUSTMENTS_UC,
	LIST_INVENTORY_ITEMS_UC,
	LIST_LOW_STOCK_UC,
	TRANSFER_STOCK_UC,
} from '../../../domain/ports/inventory-use-cases.port';
import {
	AdjustStockDocs,
	CreateInventoryItemDocs,
	GetInventoryItemDocs,
	ListInventoryAdjustmentsDocs,
	ListInventoryItemsDocs,
	ListLowStockDocs,
	TransferStockDocs,
} from '../docs/inventory.admin.docs';
import { AdjustStockDto } from '../dto/adjust-stock.dto';
import { CreateInventoryItemDto } from '../dto/create-inventory-item.dto';
import { TransferStockDto } from '../dto/transfer-stock.dto';

@ApiTags('Inventory')
@ApiBearerAuth('swagger-access-token')
@UseGuards(StorePermissionGuard)
@Controller('stores/:storeId/inventory/admin')
@UseRealm('platform')
export class InventoryAdminController {
	constructor(
		@Inject(CREATE_INVENTORY_ITEM_UC)
		private readonly createItemUc: ICreateInventoryItemUseCase,
		@Inject(GET_INVENTORY_ITEM_UC)
		private readonly getItemUc: IGetInventoryItemUseCase,
		@Inject(LIST_INVENTORY_ITEMS_UC)
		private readonly listItemsUc: IListInventoryItemsUseCase,
		@Inject(ADJUST_STOCK_UC)
		private readonly adjustStockUc: IAdjustStockUseCase,
		@Inject(TRANSFER_STOCK_UC)
		private readonly transferStockUc: ITransferStockUseCase,
		@Inject(LIST_LOW_STOCK_UC)
		private readonly listLowStockUc: IListLowStockUseCase,
		@Inject(LIST_INVENTORY_ADJUSTMENTS_UC)
		private readonly listAdjustmentsUc: IListInventoryAdjustmentsUseCase,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	@Post()
	@CreateInventoryItemDocs()
	@RequirePermission('inventory.create')
	async createInventoryItem(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Body() payload: CreateInventoryItemDto
	): Promise<InventoryItemDetail> {
		return this.tracer.withSpan('http.admin.inventory.create', async () => {
			const result = await this.createItemUc.execute({
				storeId,
				data: payload,
			});

			if (result.isErr()) {
				if (result.error instanceof WarehouseNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				if (result.error instanceof VariantNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				if (result.error instanceof DuplicateInventoryItemError) {
					throw new ConflictException(result.error.message);
				}
				throw new InternalServerErrorException(
					'Failed to create inventory item'
				);
			}
			return result.value;
		});
	}

	@Get()
	@ListInventoryItemsDocs()
	@RequirePermission('inventory.read')
	async listInventoryItems(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Query() query: Record<string, string>
	): Promise<PaginatedResponse<InventoryItemDetail>> {
		return this.tracer.withSpan('http.admin.inventory.list', async () => {
			const parsed = ListInventoryQuerySchema.parse(query);
			const warehouseId = query.warehouseId;

			const result = await this.listItemsUc.execute({
				storeId,
				query: parsed,
				warehouseId,
			});

			if (result.isErr()) {
				throw new InternalServerErrorException(
					'Failed to list inventory items'
				);
			}
			return result.value;
		});
	}

	@Get('low-stock')
	@ListLowStockDocs()
	@RequirePermission('inventory.read')
	async listLowStock(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Query() query: Record<string, string>
	): Promise<PaginatedResponse<LowStockItem>> {
		return this.tracer.withSpan('http.admin.inventory.low-stock', async () => {
			const parsed = LowStockQuerySchema.parse(query);
			const result = await this.listLowStockUc.execute({
				storeId,
				query: parsed,
			});

			if (result.isErr()) {
				throw new InternalServerErrorException(
					'Failed to list low stock items'
				);
			}
			return result.value;
		});
	}

	@Get(':itemId')
	@GetInventoryItemDocs()
	@RequirePermission('inventory.read')
	async getInventoryItem(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('itemId', ParseUUIDPipe) itemId: string
	): Promise<InventoryItemDetail> {
		return this.tracer.withSpan('http.admin.inventory.get', async () => {
			const result = await this.getItemUc.execute({
				id: itemId,
				storeId,
			});

			if (result.isErr()) {
				if (result.error instanceof InventoryItemNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				throw new InternalServerErrorException('Failed to get inventory item');
			}
			return result.value;
		});
	}

	@Get(':itemId/audit')
	@ListInventoryAdjustmentsDocs()
	@RequirePermission('inventory.read')
	async listAdjustments(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('itemId', ParseUUIDPipe) itemId: string,
		@Query() query: Record<string, string>
	): Promise<PaginatedResponse<InventoryAdjustment>> {
		return this.tracer.withSpan(
			'http.admin.inventory.list-adjustments',
			async () => {
				const parsed = ListInventoryAdjustmentsQuerySchema.parse(query);

				const result = await this.listAdjustmentsUc.execute({
					storeId,
					inventoryItemId: itemId,
					query: parsed,
				});

				if (result.isErr()) {
					if (result.error instanceof InventoryItemNotFoundError) {
						throw new NotFoundException(result.error.message);
					}
					throw new InternalServerErrorException(
						'Failed to list inventory adjustments'
					);
				}
				return result.value;
			}
		);
	}

	@Post(':itemId/adjust')
	@AdjustStockDocs()
	@RequirePermission('inventory.adjust')
	async adjustStock(
		@PlatformUserParam() platformUser: PlatformUser,
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Param('itemId', ParseUUIDPipe) itemId: string,
		@Body() payload: AdjustStockDto
	): Promise<InventoryLevel> {
		return this.tracer.withSpan('http.admin.inventory.adjust', async () => {
			const result = await this.adjustStockUc.execute({
				storeId,
				data: {
					adjustmentType: payload.adjustmentType,
					quantity: payload.quantity,
					reason: payload.reason,
					adjustedBy: platformUser.id,
					inventoryItemId: itemId,
				},
			});

			if (result.isErr()) {
				if (result.error instanceof InventoryItemNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				if (result.error instanceof InsufficientStockError) {
					throw new UnprocessableEntityException(result.error.message);
				}
				if (result.error instanceof InvalidAdjustmentError) {
					throw new BadRequestException(result.error.message);
				}
				throw new InternalServerErrorException('Failed to adjust stock');
			}
			return result.value;
		});
	}

	@Post('transfer')
	@TransferStockDocs()
	@RequirePermission('inventory.transfer')
	async transferStock(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Body() payload: TransferStockDto
	): Promise<{ source: InventoryLevel; destination: InventoryLevel }> {
		return this.tracer.withSpan('http.admin.inventory.transfer', async () => {
			const result = await this.transferStockUc.execute({
				storeId,
				data: payload,
			});

			if (result.isErr()) {
				if (result.error instanceof InvalidTransferError) {
					throw new BadRequestException(result.error.message);
				}
				if (result.error instanceof InventoryItemNotFoundError) {
					throw new NotFoundException(result.error.message);
				}
				if (result.error instanceof InsufficientStockError) {
					throw new UnprocessableEntityException(result.error.message);
				}
				throw new InternalServerErrorException('Failed to transfer stock');
			}
			return result.value;
		});
	}
}
