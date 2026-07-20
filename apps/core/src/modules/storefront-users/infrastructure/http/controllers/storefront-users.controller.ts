import { type StorefrontAuthenticatedRequest } from '@common/types/request';
import { UseRealm } from '@modules/auth';
import { Controller, Get, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Storefront Users')
@UseRealm('storefront')
@Controller('stores/:storeId/users')
export class StorefrontUserController {
	@Get('me')
	getMe(@Req() req: StorefrontAuthenticatedRequest) {
		return {
			hello: 'from storefront realm',
			user: req.storefrontUser,
		};
	}
}
