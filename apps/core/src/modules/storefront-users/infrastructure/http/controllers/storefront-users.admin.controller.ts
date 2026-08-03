import { type PlatformAuthenticatedRequest } from '@common/types/request';
import { AppLogger } from '@core/logger/logger.service';
import { type ITracer, OTEL_TRACER } from '@core/tracer';
import { UseRealm } from '@modules/auth';
import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Inject,
	NotFoundException,
	Param,
	Patch,
	Post,
	Query,
	Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminSetBanStatusStorefrontUserUseCase } from '../../../application/use-cases/admin-set-ban-status-storefront-user.use-case';
import { DeleteStorefrontUserUseCase } from '../../../application/use-cases/delete-storefront-user.use-case';
import { GetStorefrontUserUseCase } from '../../../application/use-cases/get-storefront-user.use-case';
import { GetStorefrontUsersUseCase } from '../../../application/use-cases/get-storefront-users.use-case';
import { UpdateStorefrontUserUseCase } from '../../../application/use-cases/update-storefront-user.use-case';
import { GetStorefrontUsersDto } from '../dto/get-storefront-users.dto';
import { UpdateStorefrontUserDto } from '../dto/update-storefront-user.dto';

@ApiTags('Storefront Users')
@UseRealm('platform')
@Controller('stores/:storeId/users/admin')
export class StorefrontUserAdminController {
	constructor(
		@Inject(OTEL_TRACER) private readonly tracer: ITracer,
		private readonly logger: AppLogger,
		private readonly getUserUseCase: GetStorefrontUserUseCase,
		private readonly getUsersUseCase: GetStorefrontUsersUseCase,
		private readonly updateUserUseCase: UpdateStorefrontUserUseCase,
		private readonly deleteUserUseCase: DeleteStorefrontUserUseCase,
		private readonly setBanStatusUseCase: AdminSetBanStatusStorefrontUserUseCase
	) {
		this.logger.setContext(StorefrontUserAdminController.name);
	}

	@Get()
	async getUsers(
		@Req() req: PlatformAuthenticatedRequest,
		@Query() query: GetStorefrontUsersDto
	) {
		return this.tracer.withSpan(
			'http.storefront-users-admin.getUsers',
			async () => {
				const result = await this.getUsersUseCase.execute({
					storeId: req.params.storeId ?? '',
					cursor: query.cursor,
					limit: query.limit,
				});
				if (!result.ok) throw new BadRequestException(result.error.message);
				return result.value;
			},
			{ storeId: req.params.storeId ?? '' }
		);
	}

	@Get(':id')
	async getUser(
		@Req() req: PlatformAuthenticatedRequest,
		@Param('id') id: string
	) {
		return this.tracer.withSpan(
			'http.storefront-users-admin.getUser',
			async () => {
				const result = await this.getUserUseCase.execute({ userId: id });
				if (!result.ok) throw new NotFoundException(result.error.message);
				return result.value;
			},
			{ storeId: req.params.storeId ?? '' }
		);
	}

	@Patch(':id')
	async updateUser(
		@Req() req: PlatformAuthenticatedRequest,
		@Param('id') id: string,
		@Body() payload: UpdateStorefrontUserDto
	) {
		return this.tracer.withSpan(
			'http.storefront-users-admin.updateUser',
			async () => {
				const result = await this.updateUserUseCase.execute({
					userId: id,
					payload,
				});
				if (!result.ok) throw new NotFoundException(result.error.message);
				return result.value;
			},
			{ storeId: req.params.storeId ?? '' }
		);
	}

	@Delete(':id')
	async deleteUser(
		@Req() req: PlatformAuthenticatedRequest,
		@Param('id') id: string
	) {
		return this.tracer.withSpan(
			'http.storefront-users-admin.deleteUser',
			async () => {
				const result = await this.deleteUserUseCase.execute({ userId: id });
				if (!result.ok) throw new NotFoundException(result.error.message);
				return { success: true };
			},
			{ storeId: req.params.storeId ?? '' }
		);
	}

	@Post(':id/ban')
	async banUser(
		@Req() req: PlatformAuthenticatedRequest,
		@Param('id') id: string
	) {
		return this.tracer.withSpan(
			'http.storefront-users-admin.banUser',
			async () => {
				const result = await this.setBanStatusUseCase.execute({
					userId: id,
					isBanned: true,
				});
				if (!result.ok) throw new NotFoundException(result.error.message);
				return result.value;
			},
			{ storeId: req.params.storeId ?? '' }
		);
	}

	@Post(':id/unban')
	async unbanUser(
		@Req() req: PlatformAuthenticatedRequest,
		@Param('id') id: string
	) {
		return this.tracer.withSpan(
			'http.storefront-users-admin.unbanUser',
			async () => {
				const result = await this.setBanStatusUseCase.execute({
					userId: id,
					isBanned: false,
				});
				if (!result.ok) throw new NotFoundException(result.error.message);
				return result.value;
			},
			{ storeId: req.params.storeId ?? '' }
		);
	}
}
