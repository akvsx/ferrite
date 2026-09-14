import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

export function CheckAvailabilityDocs() {
	return applyDecorators(
		ApiOperation({
			summary:
				'Check stock availability for one or more product variants (public)',
		}),
		ApiResponse({
			status: 200,
			description:
				'Array of availability results per variant (variantId + available boolean)',
		}),
		ApiQuery({
			name: 'variantIds',
			required: true,
			type: String,
			description: 'Comma-separated list of variant UUIDs',
		}),
		ApiResponse({
			status: 400,
			description: 'variantIds query parameter is required',
		}),
		ApiResponse({ status: 500, description: 'Internal server error' })
	);
}
