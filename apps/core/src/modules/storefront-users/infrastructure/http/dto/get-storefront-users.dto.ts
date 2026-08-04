import { PaginationInputSchema } from '@ferrite/schema';
import { createZodDto } from 'nestjs-zod';

export class GetStorefrontUsersDto extends createZodDto(
	PaginationInputSchema
) {}
