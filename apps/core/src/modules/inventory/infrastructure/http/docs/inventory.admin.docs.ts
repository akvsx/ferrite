import { ApiPagination } from '@common/decorators/pagination.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

export function CreateInventoryItemDocs() {
	return applyDecorators(
		ApiOperation({
			summary: 'Create a new inventory item for a variant in a warehouse',
		}),
		ApiResponse({ status: 201, description: 'Inventory item created' }),
		ApiResponse({ status: 404, description: 'Warehouse or variant not found' }),
		ApiResponse({
			status: 409,
			description: 'Duplicate inventory item (variant+warehouse+batch)',
		}),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function GetInventoryItemDocs() {
	return applyDecorators(
		ApiOperation({ summary: 'Get an inventory item by ID' }),
		ApiResponse({
			status: 200,
			description: 'Inventory item detail with stock level',
		}),
		ApiResponse({ status: 404, description: 'Inventory item not found' }),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function ListInventoryItemsDocs() {
	return applyDecorators(
		ApiOperation({
			summary: 'List inventory items, filterable by warehouse or variant',
		}),
		ApiResponse({
			status: 200,
			description: 'Paginated list of inventory items',
		}),
		ApiPagination(),
		ApiQuery({
			name: 'warehouseId',
			required: false,
			type: String,
			format: 'uuid',
			description: 'Filter by warehouse',
		}),
		ApiQuery({
			name: 'variantId',
			required: false,
			type: String,
			format: 'uuid',
			description: 'Filter by product variant',
		}),
		ApiQuery({
			name: 'search',
			required: false,
			type: String,
			description: 'Search by batch number',
		})
	);
}

export function AdjustStockDocs() {
	return applyDecorators(
		ApiOperation({
			summary:
				'Adjust stock level for an inventory item (restock, sale, damage, etc.)',
		}),
		ApiResponse({ status: 200, description: 'Updated inventory level' }),
		ApiResponse({ status: 400, description: 'Invalid adjustment input' }),
		ApiResponse({ status: 404, description: 'Inventory item not found' }),
		ApiResponse({
			status: 422,
			description: 'Insufficient stock for adjustment',
		}),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function TransferStockDocs() {
	return applyDecorators(
		ApiOperation({
			summary: 'Transfer stock between two inventory items',
		}),
		ApiResponse({
			status: 200,
			description: 'Updated source and destination inventory levels',
		}),
		ApiResponse({ status: 400, description: 'Invalid transfer (same item)' }),
		ApiResponse({ status: 404, description: 'Inventory item not found' }),
		ApiResponse({
			status: 422,
			description: 'Insufficient stock for transfer',
		}),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function ListLowStockDocs() {
	return applyDecorators(
		ApiOperation({
			summary:
				'List inventory items where available stock is at or below the low-stock threshold',
		}),
		ApiResponse({
			status: 200,
			description: 'Paginated list of low-stock items',
		}),
		ApiPagination(),
		ApiQuery({
			name: 'warehouseId',
			required: false,
			type: String,
			format: 'uuid',
			description: 'Filter by warehouse',
		})
	);
}

export function ListInventoryAdjustmentsDocs() {
	return applyDecorators(
		ApiOperation({
			summary:
				'List inventory adjustments (ledger audit) for a specific inventory item',
		}),
		ApiResponse({
			status: 200,
			description: 'Paginated list of inventory adjustments',
		}),
		ApiResponse({ status: 404, description: 'Inventory item not found' }),
		ApiPagination()
	);
}
