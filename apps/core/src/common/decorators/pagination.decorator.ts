import type { PaginationInput } from '@ferrite/schema';
import {
	applyDecorators,
	BadRequestException,
	createParamDecorator,
	ExecutionContext,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

const uuidRegex =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const Pagination = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): PaginationInput => {
		const request = ctx.switchToHttp().getRequest();
		const { cursor, limit } = request.query;

		if (cursor !== undefined) {
			if (typeof cursor !== 'string' || !uuidRegex.test(cursor)) {
				throw new BadRequestException('Validation failed (uuid is expected)');
			}
		}

		let parsedLimit = 20;
		if (limit !== undefined) {
			if (typeof limit !== 'string' || !/^\d+$/.test(limit)) {
				throw new BadRequestException(
					'Validation failed (numeric limit is expected)'
				);
			}
			parsedLimit = parseInt(limit, 10);
		}

		return {
			cursor,
			limit: parsedLimit,
		};
	}
);

export function ApiPagination() {
	return applyDecorators(
		ApiQuery({
			name: 'cursor',
			required: false,
			type: String,
			format: 'uuid',
			description: 'Cursor for pagination (UUID of the last item)',
		}),
		ApiQuery({
			name: 'limit',
			required: false,
			type: Number,
			description: 'Number of items to return (default: 20)',
		})
	);
}
