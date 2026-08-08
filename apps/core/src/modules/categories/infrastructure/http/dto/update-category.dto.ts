import { UpdateCategorySchema } from '@ferrite/schema';
import { createZodDto } from 'nestjs-zod';

export class UpdateCategoryDto extends createZodDto(UpdateCategorySchema) {}
