import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

export function CreateProductDocs() {
	return applyDecorators(
		ApiOperation({
			summary:
				'Create a new product with variants, images, and category associations',
		}),
		ApiResponse({ status: 201, description: 'Product created' }),
		ApiResponse({
			status: 400,
			description: 'Bad request (e.g. slug already in use)',
		}),
		ApiResponse({
			status: 409,
			description: 'Conflict (e.g. SKU already exists)',
		}),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function UpdateProductDocs() {
	return applyDecorators(
		ApiOperation({
			summary:
				'Update an existing product (partial update, full-replace for child entities)',
		}),
		ApiResponse({ status: 200, description: 'Product updated' }),
		ApiResponse({
			status: 400,
			description: 'Bad request (e.g. slug already in use)',
		}),
		ApiResponse({ status: 404, description: 'Product not found' }),
		ApiResponse({
			status: 409,
			description: 'Conflict (e.g. SKU already exists)',
		}),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function DeleteProductDocs() {
	return applyDecorators(
		ApiOperation({ summary: 'Soft-delete a product' }),
		ApiResponse({ status: 204, description: 'Product deleted' }),
		ApiResponse({ status: 404, description: 'Product not found' }),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function ListProductsDocs() {
	return applyDecorators(
		ApiOperation({
			summary:
				'List all products (including draft and archived) with cost price, pagination, search, and filtering',
		}),
		ApiResponse({
			status: 200,
			description: 'Paginated list of products with variant cost prices',
		}),
		ApiQuery({
			name: 'search',
			required: false,
			type: String,
			description: 'Search by product name',
		}),
		ApiQuery({
			name: 'categoryId',
			required: false,
			type: String,
			format: 'uuid',
			description: 'Filter by category',
		}),
		ApiQuery({
			name: 'supplierId',
			required: false,
			type: String,
			format: 'uuid',
			description: 'Filter by supplier',
		}),
		ApiQuery({
			name: 'status',
			required: false,
			enum: ['draft', 'active', 'archived'],
			description: 'Filter by status (draft, active, archived)',
		}),
		ApiQuery({
			name: 'cursor',
			required: false,
			type: String,
			format: 'uuid',
			description: 'Cursor for pagination',
		}),
		ApiQuery({
			name: 'limit',
			required: false,
			type: Number,
			description: 'Page size (default: 20, max: 100)',
		})
	);
}

export function GetProductByIdDocs() {
	return applyDecorators(
		ApiOperation({
			summary:
				'Get product by ID (any status) with variant cost prices, images, and categories',
		}),
		ApiResponse({
			status: 200,
			description: 'Product detail with variant cost prices',
		}),
		ApiResponse({ status: 404, description: 'Product not found' }),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}
