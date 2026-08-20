import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function CreateCategoryDocs() {
	return applyDecorators(
		ApiOperation({ summary: 'Create a new category in the store' }),
		ApiResponse({ status: 201, description: 'Category created' }),
		ApiResponse({
			status: 400,
			description: 'Bad request (e.g. slug already in use)',
		}),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function UpdateCategoryDocs() {
	return applyDecorators(
		ApiOperation({ summary: 'Update an existing category' }),
		ApiResponse({ status: 200, description: 'Category updated' }),
		ApiResponse({
			status: 400,
			description: 'Bad request (e.g. slug already in use)',
		}),
		ApiResponse({ status: 404, description: 'Category not found' }),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}

export function DeleteCategoryDocs() {
	return applyDecorators(
		ApiOperation({ summary: 'Delete a category' }),
		ApiResponse({ status: 204, description: 'Category deleted' }),
		ApiResponse({ status: 404, description: 'Category not found' }),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}
