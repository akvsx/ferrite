import { type ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import { DrizzleUnitOfWork } from '@core/database/drizzle-unit-of-work';
import { IQueueRepository } from '@modules/queue/domain/ports/queue.reposotory.port';
import { QueueParams } from '@modules/queue/domain/schemas/queue-event.zodschema';
import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

@Injectable()
export class QueueRepository implements IQueueRepository {
	async enqueue(
		tx: ITransactionContext,
		queueParams: QueueParams
	): Promise<void> {
		{
			const drizzleTx = DrizzleUnitOfWork.unwrap(tx);
			const { jobKey, identifier, maxAttempts, ...jobPayloadData } =
				queueParams;
			const jobPayload = JSON.stringify(jobPayloadData);
			const jobKeySql = jobKey
				? sql`, job_key := ${jobKey}, job_key_mode := 'preserve_run_at'`
				: sql``;

			await drizzleTx.execute(sql`
    SELECT graphile_worker.add_job(
      identifier := ${identifier},
      payload := ${jobPayload}::json,
      queue_name := coalesce(${queueParams.queueName || null}::text, null),
      max_attempts := ${maxAttempts}
      ${jobKeySql}
    )
`);
		}
	}
}
