import { CreateCategorySchema } from '@ferrite/schema';
import { createZodDto } from 'nestjs-zod';

export class CreateCategoryDto extends createZodDto(CreateCategorySchema) {}
