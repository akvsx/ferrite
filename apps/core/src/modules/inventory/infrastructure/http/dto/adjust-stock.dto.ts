import { AdjustStockRequestSchema } from '@ferrite/schema';
import { createZodDto } from 'nestjs-zod';

export class AdjustStockDto extends createZodDto(AdjustStockRequestSchema) {}
