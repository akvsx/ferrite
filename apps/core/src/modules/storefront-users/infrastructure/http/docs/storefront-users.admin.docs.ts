import { ApiPagination } from '@common/decorators/pagination.decorator';
import { applyDecorators } from '@nestjs/common';
import {
	ApiBearerAuth,
	ApiOperation,
	ApiParam,
	ApiResponse,
} from '@nestjs/swagger';

export const AdminGetUsersDocs = () =>
	applyDecorators(
		ApiBearerAuth(),
		ApiOperation({ summary: 'Get paginated list of storefront users (Admin)' }),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiPagination(),
		ApiResponse({
			status: 200,
			description: 'Successfully retrieved list of storefront users.',
		}),
		ApiResponse({
			status: 400,
			description: 'Bad request.',
		}),
		ApiResponse({
			status: 401,
			description: 'Unauthorized.',
		})
	);

export const AdminGetUserDocs = () =>
	applyDecorators(
		ApiBearerAuth(),
		ApiOperation({ summary: 'Get storefront user by ID (Admin)' }),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiParam({
			name: 'id',
			description: 'User ID',
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

export const AdminUpdateUserDocs = () =>
	applyDecorators(
		ApiBearerAuth(),
		ApiOperation({ summary: 'Update storefront user profile by ID (Admin)' }),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiParam({
			name: 'id',
			description: 'User ID',
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

export const AdminDeleteUserDocs = () =>
	applyDecorators(
		ApiBearerAuth(),
		ApiOperation({ summary: 'Delete storefront user profile by ID (Admin)' }),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiParam({
			name: 'id',
			description: 'User ID',
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

export const AdminBanUserDocs = () =>
	applyDecorators(
		ApiBearerAuth(),
		ApiOperation({ summary: 'Ban a storefront user by ID (Admin)' }),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiParam({
			name: 'id',
			description: 'User ID',
			type: 'string',
		}),
		ApiResponse({
			status: 200,
			description: 'Successfully banned user.',
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

export const AdminUnbanUserDocs = () =>
	applyDecorators(
		ApiBearerAuth(),
		ApiOperation({ summary: 'Unban a storefront user by ID (Admin)' }),
		ApiParam({
			name: 'storeId',
			description: 'Store ID',
			type: 'string',
		}),
		ApiParam({
			name: 'id',
			description: 'User ID',
			type: 'string',
		}),
		ApiResponse({
			status: 200,
			description: 'Successfully unbanned user.',
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
