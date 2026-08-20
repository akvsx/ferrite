import { forgotPasswordSchema } from '@ferrite/schema/storefront-auth/forgot-password.zodschema';
import { createZodDto } from 'nestjs-zod';

export class ForgotPasswordDTO extends createZodDto(forgotPasswordSchema) {}
