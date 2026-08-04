import { eventPayloadSchema } from '@ferrite/schema/common/event-payload.zodschema';
import { z } from 'zod';

export const QueueParamsSchema = z
	.object({
		identifier: z.string(),
		maxAttempts: z.number(),
		jobKey: z.string().optional(),
	})
	.extend(eventPayloadSchema.shape)
	.catchall(z.unknown());

export type QueueParams<
	T extends Record<string, unknown> = Record<string, unknown>,
> = Omit<z.infer<typeof QueueParamsSchema>, 'payload'> & {
	payload: T;
};
