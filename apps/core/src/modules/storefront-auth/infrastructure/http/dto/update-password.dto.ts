import { updatePasswordSchema } from '@ferrite/schema/storefront-auth/update-password.zodschema';
import { createZodDto } from 'nestjs-zod';

export class UpdatePasswordDTO extends createZodDto(updatePasswordSchema) {}
