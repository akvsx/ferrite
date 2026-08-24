import z from 'zod/v4';

export const decimalString = z
	.string()
	.min(1)
	.regex(/^\d+(\.\d{1,4})?$/, 'Must be a valid decimal number');

export type DecimalString = z.infer<typeof decimalString>;
