import { CreateWarehouseInputSchema } from '@ferrite/schema';
import { createZodDto } from 'nestjs-zod';

export class CreateWarehouseDto extends createZodDto(
	CreateWarehouseInputSchema
) {}
