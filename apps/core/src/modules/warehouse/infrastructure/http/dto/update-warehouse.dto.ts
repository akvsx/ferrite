import { UpdateWarehouseInputSchema } from '@ferrite/schema';
import { createZodDto } from 'nestjs-zod';

export class UpdateWarehouseDto extends createZodDto(
	UpdateWarehouseInputSchema
) {}
