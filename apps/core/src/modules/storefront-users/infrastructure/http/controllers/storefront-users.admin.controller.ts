import { type PlatformAuthenticatedRequest } from '@common/types/request';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { UseRealm } from '@modules/auth';
import { Controller, Get, Inject, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Storefront Users')
@UseRealm('platform')
@Controller('stores/:storeId/users/admin')
export class StorefrontUserAdminController {
	constructor(
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger
	) {
		this.logger.setContext(StorefrontUserAdminController.name);
	}

	@Get()
	getUsers(@Req() req: PlatformAuthenticatedRequest) {
		return this.tracer.withSpan(
			'http.storefront-users-admin.getUsers',
			async () => ({
				hello: 'admin from platform realm',
				admin: req.authUser,
			}),
			{ storeId: req.params.storeId ?? '' }
		);
	}
}
