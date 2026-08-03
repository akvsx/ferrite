import { UpdateStorefrontUserSchema } from '@ferrite/schema';
import { createZodDto } from 'nestjs-zod';

export class UpdateStorefrontUserDto extends createZodDto(
	UpdateStorefrontUserSchema
) {}
