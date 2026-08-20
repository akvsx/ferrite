import { ApiPagination } from '@common/decorators/pagination.decorator';
import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaginatedCategoryResponseDto } from '../dto/paginated-category-response.dto';

export function GetCategoriesDocs() {
	return applyDecorators(
		ApiOperation({ summary: 'List categories for a store' }),
		ApiPagination(),
		ApiResponse({
			status: 200,
			description: 'Categories retrieved',
			type: PaginatedCategoryResponseDto,
		})
	);
}

export function GetCategoryByIdDocs() {
	return applyDecorators(
		ApiOperation({ summary: 'Get a specific category by ID' }),
		ApiResponse({ status: 200, description: 'Category retrieved' }),
		ApiResponse({ status: 404, description: 'Category not found' })
	);
}
