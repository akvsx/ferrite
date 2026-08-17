import { resetPasswordSchema } from '@ferrite/schema/storefront-auth/reset-password.zodschema';
import { createZodDto } from 'nestjs-zod';

export class ResetPasswordDTO extends createZodDto(resetPasswordSchema) {}
