import { ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { BaseProcessor } from '@core/processor';
import { GraphileProcessor } from '@core/processor/decorators/graphile-processor.decorator';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import {
	type EventPayload,
	eventPayloadSchema,
} from '@ferrite/schema/common/event-payload.zodschema';
import { Inject } from '@nestjs/common';
import type { JobHelpers } from 'graphile-worker';
import { LOW_STOCK_ALERT_QUEUE } from './queue.constraints';

/**
 * Processes low-stock alert events emitted after inventory adjustments
 * that cause stock to drop below a variant's configured threshold.
 *
 * Currently logs a warning. Will be wired to a Notifications module
 * (email/push/webhook) in a future iteration.
 */
@GraphileProcessor(LOW_STOCK_ALERT_QUEUE)
export class LowStockAlertProcessor extends BaseProcessor<EventPayload> {
	constructor(
		protected readonly logger: AppLogger,
		@Inject(OTEL_TRACER) private readonly otelTracer: ITracer
	) {
		super(logger);
		this.logger.setContext(this.constructor.name);
	}

	protected async handle(
		payload: EventPayload,
		_helpers?: JobHelpers
	): Promise<Result<void, Error>> {
		return this.otelTracer.withSpan(
			'LowStockAlertProcessor.handle',
			async () => {
				const validatedEnvelope = eventPayloadSchema.safeParse(payload);
				if (!validatedEnvelope.success) {
					this.logger.error(
						`Poison Pill Envelope: ${validatedEnvelope.error.message}`
					);
					return ok();
				}

				const inner = validatedEnvelope.data.payload as {
					inventoryItemId: string;
					storeId: string;
					quantityOnHand: number;
					threshold: number;
				};

				this.logger.warn(
					`Low stock alert: item=${inner.inventoryItemId} ` +
						`qty=${inner.quantityOnHand} threshold=${inner.threshold} ` +
						`storeId=${inner.storeId}`
				);

				return ok();
			}
		);
	}
}
