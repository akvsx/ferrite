import { UpdateProductInputSchema } from '@ferrite/schema';
import { createZodDto } from 'nestjs-zod';

export class UpdateProductDto extends createZodDto(UpdateProductInputSchema) {}
