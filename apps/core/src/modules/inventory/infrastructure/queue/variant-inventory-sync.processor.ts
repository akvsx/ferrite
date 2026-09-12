import { err, ok, type Result } from '@common/interfaces/result.interface';
import { AppLogger } from '@core/logger/logger.service';
import { BaseProcessor } from '@core/processor';
import { GraphileProcessor } from '@core/processor/decorators/graphile-processor.decorator';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { VariantInventorySyncPayloadSchema } from '@ferrite/schema';
import {
	type EventPayload,
	eventPayloadSchema,
} from '@ferrite/schema/common/event-payload.zodschema';
import { Inject } from '@nestjs/common';
import type { JobHelpers } from 'graphile-worker';
import { UnknownInventoryError } from '../../domain/errors';
import {
	type ISyncVariantInventoryUseCase,
	SYNC_VARIANT_INVENTORY_UC,
} from '../../domain/ports/inventory-use-cases.port';
import { VARIANT_INVENTORY_SYNC_QUEUE } from './queue.constraints';

@GraphileProcessor(VARIANT_INVENTORY_SYNC_QUEUE)
export class VariantInventorySyncProcessor extends BaseProcessor<EventPayload> {
	constructor(
		protected readonly logger: AppLogger,
		@Inject(SYNC_VARIANT_INVENTORY_UC)
		private readonly syncUc: ISyncVariantInventoryUseCase,
		@Inject(OTEL_TRACER) private readonly otelTracer: ITracer
	) {
		super(logger);
		this.logger.setContext(this.constructor.name);
	}

	protected async handle(
		payload: EventPayload,
		_helpers?: JobHelpers
	): Promise<Result<void, UnknownInventoryError>> {
		return this.otelTracer.withSpan(
			'VariantInventorySyncProcessor.handle',
			async () => {
				// Validate graphile envelope
				const validatedEnvelope = eventPayloadSchema.safeParse(payload);
				if (!validatedEnvelope.success) {
					this.logger.error(
						`Poison Pill Envelope: ${validatedEnvelope.error.message}`
					);
					return ok(); // ack poison pill
				}

				// Validate inner payload
				const validatedPayload = VariantInventorySyncPayloadSchema.safeParse(
					validatedEnvelope.data.payload
				);
				if (!validatedPayload.success) {
					this.logger.error(
						`Poison Pill Payload: ${validatedPayload.error.message}`
					);
					return ok(); // ack poison pill
				}

				// Delegate to use case
				const result = await this.syncUc.execute(validatedPayload.data);

				if (result.isErr()) {
					this.logger.error(
						`Failed to sync variant inventory for store ${validatedPayload.data.storeId}: ${result.error}`
					);
					return err(new UnknownInventoryError(result.error));
				}

				this.logger.debug(
					`Successfully synced inventory for ${validatedPayload.data.variantIds.length} variants (storeId=${validatedPayload.data.storeId})`
				);
				return ok();
			}
		);
	}
}
