import { ApiPagination } from '@common/decorators/pagination.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function CreateWarehouseDocs() {
	return applyDecorators(
		ApiOperation({ summary: 'Create a new warehouse for the store' }),
		ApiResponse({ status: 201, description: 'Warehouse created' }),
		ApiResponse({
			status: 400,
			description: 'Bad request (e.g. name already in use)',
		}),
		ApiResponse({ status: 409, description: 'Warehouse name conflict' }),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function UpdateWarehouseDocs() {
	return applyDecorators(
		ApiOperation({ summary: 'Update an existing warehouse' }),
		ApiResponse({ status: 200, description: 'Warehouse updated' }),
		ApiResponse({
			status: 400,
			description: 'Bad request (e.g. name already in use)',
		}),
		ApiResponse({ status: 404, description: 'Warehouse not found' }),
		ApiResponse({ status: 409, description: 'Warehouse name conflict' }),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function DeleteWarehouseDocs() {
	return applyDecorators(
		ApiOperation({ summary: 'Soft-delete a warehouse' }),
		ApiResponse({ status: 204, description: 'Warehouse deleted' }),
		ApiResponse({ status: 404, description: 'Warehouse not found' }),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function GetWarehouseDocs() {
	return applyDecorators(
		ApiOperation({ summary: 'Get a warehouse by ID' }),
		ApiResponse({ status: 200, description: 'Warehouse details' }),
		ApiResponse({ status: 404, description: 'Warehouse not found' }),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function ListWarehousesDocs() {
	return applyDecorators(
		ApiPagination(),
		ApiOperation({ summary: 'List warehouses for the store' }),
		ApiResponse({
			status: 200,
			description: 'Paginated list of warehouses',
		}),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}
