import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { SkipCsrf } from '@modules/storefront-auth/infrastructure/http/decorators/skip-csrf.decorator';
import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Inject,
	InternalServerErrorException,
	Param,
	ParseUUIDPipe,
	Patch,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
	GET_STORE_CONFIG_UC,
	type IGetStoreConfigUC,
	type IUpdateStoreConfigUC,
	UPDATE_STORE_CONFIG_UC,
} from '../../../domain/ports/store-config-usecase.port';
import { UpdateStoreConfigDto } from '../dto/store-config.dto';
import { StorePermissionGuard } from '../guards/store-permission.guard';
import {
	GetStoreConfigDocs,
	UpdateStoreConfigDocs,
} from './docs/config.swaggerdocs';

@ApiTags('Store Config')
@ApiBearerAuth('swagger-access-token')
@UseGuards(StorePermissionGuard)
@SkipCsrf()
@Controller('stores/:storeId/config')
export class ConfigController {
	constructor(
		@Inject(GET_STORE_CONFIG_UC)
		private readonly getConfigUC: IGetStoreConfigUC,
		@Inject(UPDATE_STORE_CONFIG_UC)
		private readonly updateConfigUC: IUpdateStoreConfigUC
	) {}

	@Get()
	@HttpCode(HttpStatus.OK)
	@RequirePermission('store.update')
	@GetStoreConfigDocs()
	async getConfig(@Param('storeId', ParseUUIDPipe) storeId: string) {
		const result = await this.getConfigUC.execute({ storeId });
		if (result.isErr()) {
			throw new InternalServerErrorException('Something Went Wrong');
		}
		return result.value;
	}

	@Patch()
	@HttpCode(HttpStatus.OK)
	@RequirePermission('store.update')
	@UpdateStoreConfigDocs()
	async updateConfig(
		@Param('storeId', ParseUUIDPipe) storeId: string,
		@Body() payload: UpdateStoreConfigDto
	) {
		const result = await this.updateConfigUC.execute({
			storeId,
			config: payload,
		});

		if (result.isErr()) {
			throw new InternalServerErrorException('Something Went Wrong');
		}
		return result.value;
	}
}
