import { type StorefrontAuthenticatedRequest } from '@common/types/request';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { UseRealm } from '@modules/auth';
import {
	Body,
	Controller,
	Delete,
	Get,
	Inject,
	NotFoundException,
	Patch,
	Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { DeleteStorefrontUserUseCase } from '../../../application/use-cases/delete-storefront-user.use-case';
import { GetStorefrontUserUseCase } from '../../../application/use-cases/get-storefront-user.use-case';
import { UpdateStorefrontUserUseCase } from '../../../application/use-cases/update-storefront-user.use-case';
import {
	DeleteMeDocs,
	GetMeDocs,
	UpdateMeDocs,
} from '../docs/storefront-users.docs';
import { UpdateStorefrontUserDto } from '../dto/update-storefront-user.dto';

@ApiTags('Storefront Users')
@UseRealm('storefront')
@Controller('stores/:storeId/users')
@ApiBearerAuth('swagger-access-token')
export class StorefrontUserController {
	constructor(
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger,
		private readonly getUserUseCase: GetStorefrontUserUseCase,
		private readonly updateUserUseCase: UpdateStorefrontUserUseCase,
		private readonly deleteUserUseCase: DeleteStorefrontUserUseCase
	) {
		this.logger.setContext(StorefrontUserController.name);
	}

	@Get('me')
	@GetMeDocs()
	async getMe(@Req() req: StorefrontAuthenticatedRequest) {
		return this.tracer.withSpan(
			'http.storefront-users.getMe',
			async () => {
				const result = await this.getUserUseCase.execute({
					userId: req.storefrontUser.id,
					storeId: req.params.storeId ?? '',
				});
				if (!result.ok) throw new NotFoundException(result.error.message);
				return result.value;
			},
			{ storeId: req.params.storeId ?? '' }
		);
	}

	@Patch('me')
	@UpdateMeDocs()
	async updateMe(
		@Req() req: StorefrontAuthenticatedRequest,
		@Body() payload: UpdateStorefrontUserDto
	) {
		return this.tracer.withSpan(
			'http.storefront-users.updateMe',
			async () => {
				const result = await this.updateUserUseCase.execute({
					userId: req.storefrontUser.id,
					storeId: req.params.storeId ?? '',
					payload,
				});
				if (!result.ok) throw new NotFoundException(result.error.message);
				return result.value;
			},
			{ storeId: req.params.storeId ?? '' }
		);
	}

	@Delete('me')
	@DeleteMeDocs()
	async deleteMe(@Req() req: StorefrontAuthenticatedRequest) {
		return this.tracer.withSpan(
			'http.storefront-users.deleteMe',
			async () => {
				const result = await this.deleteUserUseCase.execute({
					userId: req.storefrontUser.id,
					storeId: req.params.storeId ?? '',
				});
				if (!result.ok) throw new NotFoundException(result.error.message);
				return { success: true };
			},
			{ storeId: req.params.storeId ?? '' }
		);
	}
}
