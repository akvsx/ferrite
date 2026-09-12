import { CreateInventoryItemInputSchema } from '@ferrite/schema';
import { createZodDto } from 'nestjs-zod';

export class CreateInventoryItemDto extends createZodDto(
	CreateInventoryItemInputSchema
) {}
