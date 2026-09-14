import { PublicRoute } from '@common/decorators/public-route.decorator';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import type { AvailabilityResult } from '@ferrite/schema';
import {
	BadRequestException,
	Controller,
	Get,
	Inject,
	InternalServerErrorException,
	Param,
	ParseUUIDPipe,
	Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
	CHECK_AVAILABILITY_UC,
	type ICheckAvailabilityUseCase,
} from '../../../domain/ports/inventory-use-cases.port';
import { CheckAvailabilityDocs } from '../docs/inventory.storefront.docs';

@ApiTags('Inventory')
@Controller('stores/:storeId/inventory')
export class InventoryStorefrontController {
	constructor(
		@Inject(CHECK_AVAILABILITY_UC)
		private readonly checkAvailabilityUc: ICheckAvailabilityUseCase,
		@Inject(OTEL_TRACER) private readonly tracer: ITracer
	) {}

	@Get('availability')
	@CheckAvailabilityDocs()
	@PublicRoute()
	async checkAvailability(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Query('variantIds') variantIdsParam: string
	): Promise<AvailabilityResult[]> {
		return this.tracer.withSpan(
			'http.storefront.inventory.availability',
			async () => {
				const variantIds = variantIdsParam
					? variantIdsParam.split(',').map((id) => id.trim())
					: [];

				if (variantIds.length === 0) {
					throw new BadRequestException(
						'variantIds query parameter is required'
					);
				}

				const result = await this.checkAvailabilityUc.execute({
					storeId,
					variantIds,
				});

				if (result.isErr()) {
					throw new InternalServerErrorException(
						'Failed to check availability'
					);
				}
				return result.value;
			}
		);
	}
}
