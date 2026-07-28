import { type StorefrontAuthenticatedRequest } from '@common/types/request';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { UseRealm } from '@modules/auth';
import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Storefront Users')
@UseRealm('storefront')
@Controller('stores/:storeId/users')
export class StorefrontUserController {
	constructor(
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(StorefrontUserController.name);
	}

	@Get('me')
	getMe(@Req() req: StorefrontAuthenticatedRequest) {
		return this.tracer.withSpan(
			'http.storefront-users.getMe',
			async () => ({
				hello: 'from storefront realm',
				user: req.storefrontUser,
			}),
			{ storeId: req.params.storeId ?? '' }
		);
	}
}
