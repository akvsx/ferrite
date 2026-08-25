import { CreateProductInputSchema } from '@ferrite/schema';
import { createZodDto } from 'nestjs-zod';

export class CreateProductDto extends createZodDto(CreateProductInputSchema) {}
