import { applyDecorators } from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiOperation,
	ApiParam,
	ApiResponse,
} from '@nestjs/swagger';

export const GetMeDocs = () =>
	applyDecorators(
		ApiBearerAuth(),
		ApiOperation({ summary: 'Get current storefront user profile' }),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiResponse({
			status: 200,
			description: 'Successfully retrieved user profile.',
		}),
		ApiResponse({
			status: 401,
			description: 'Unauthorized.',
		}),
		ApiResponse({
			status: 404,
			description: 'User not found.',
		})
	);

export const UpdateMeDocs = () =>
	applyDecorators(
		ApiBearerAuth(),
		ApiOperation({ summary: 'Update current storefront user profile' }),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiResponse({
			status: 200,
			description: 'Successfully updated user profile.',
		}),
		ApiResponse({
			status: 400,
			description: 'Validation failed or bad request.',
		}),
		ApiResponse({
			status: 401,
			description: 'Unauthorized.',
		}),
		ApiResponse({
			status: 404,
			description: 'User not found.',
		})
	);

export const DeleteMeDocs = () =>
	applyDecorators(
		ApiBearerAuth(),
		ApiOperation({ summary: 'Delete current storefront user profile' }),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiResponse({
			status: 200,
			description: 'Successfully deleted user account.',
		}),
		ApiResponse({
			status: 401,
			description: 'Unauthorized.',
		}),
		ApiResponse({
			status: 404,
			description: 'User not found.',
		})
	);
