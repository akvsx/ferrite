import { type PlatformAuthenticatedRequest } from '@common/types/request';
import { UseRealm } from '@modules/auth';
import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Storefront Users')
@UseRealm('platform')
@Controller('stores/:storeId/users/admin')
export class StorefrontUserAdminController {
	@Get()
	getUsers(@Req() req: PlatformAuthenticatedRequest) {
		return {
			hello: 'admin from platform realm',
			admin: req.authUser,
		};
	}
}
