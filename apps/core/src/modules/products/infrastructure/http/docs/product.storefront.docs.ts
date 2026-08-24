import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

export function ListProductsDocs() {
	return applyDecorators(
		ApiOperation({
			summary: 'List active products with pagination, search, and filtering',
		}),
		ApiResponse({ status: 200, description: 'Paginated list of products' }),
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
			summary: 'Get a product by ID with all variants, images, and categories',
		}),
		ApiResponse({ status: 200, description: 'Product detail' }),
		ApiResponse({ status: 404, description: 'Product not found' })
	);
}

export function GetProductBySlugDocs() {
	return applyDecorators(
		ApiOperation({ summary: 'Get a product by slug (SEO-friendly lookup)' }),
		ApiResponse({ status: 200, description: 'Product detail' }),
		ApiResponse({ status: 404, description: 'Product not found' })
	);
}
