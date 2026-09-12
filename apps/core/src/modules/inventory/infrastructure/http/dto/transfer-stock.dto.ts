import { TransferStockRequestSchema } from '@ferrite/schema';
import { createZodDto } from 'nestjs-zod';

export class TransferStockDto extends createZodDto(
	TransferStockRequestSchema
) {}
