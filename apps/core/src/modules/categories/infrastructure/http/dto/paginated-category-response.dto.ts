import { PaginatedCategoryResponseSchema } from '@ferrite/schema';
import { createZodDto } from 'nestjs-zod';

export class PaginatedCategoryResponseDto extends createZodDto(
	PaginatedCategoryResponseSchema
) {}
