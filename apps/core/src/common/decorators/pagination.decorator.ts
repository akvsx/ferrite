import type { PaginationInput } from '@ferrite/schema';
import {
	applyDecorators,
	BadRequestException,
	createParamDecorator,
	ExecutionContext,
} from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

export const Pagination = createParamDecorator(
	(_data: unknown, ctx: ExecutionContext): PaginationInput => {
		const request = ctx.switchToHttp().getRequest();
		const { cursor, limit } = request.query;

		if (cursor !== undefined) {
			if (typeof cursor !== 'string') {
				throw new BadRequestException(
					'Validation failed (cursor must be string)'
				);
			}
		}

		let parsedLimit = 20;
		if (limit !== undefined) {
			const parsed = parseInt(limit as string, 10);
			if (
				typeof limit !== 'string' ||
				!Number.isSafeInteger(parsed) ||
				parsed <= 0
			) {
				throw new BadRequestException(
					'Validation failed (numeric limit is expected)'
				);
			}
			if (parsed > 100) {
				throw new BadRequestException(
					'Validation failed (limit must not exceed 100)'
				);
			}
			parsedLimit = parsed;
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
			description: 'Opaque cursor for pagination',
		}),
		ApiQuery({
			name: 'limit',
			required: false,
			type: Number,
			description: 'Number of items to return (default: 20)',
		})
	);
}
