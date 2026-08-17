import { verifyEmailSchema } from '@ferrite/schema/storefront-auth/verify-email.zodschema';
import { createZodDto } from 'nestjs-zod';

export class VerifyEmailDTO extends createZodDto(verifyEmailSchema) {}
