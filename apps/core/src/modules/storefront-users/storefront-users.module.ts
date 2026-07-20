import { Module } from '@nestjs/common';
import { StorefrontUserAdminController } from './infrastructure/http/controllers/storefront-users.admin.controller';
import { StorefrontUserController } from './infrastructure/http/controllers/storefront-users.controller';

@Module({
	controllers: [StorefrontUserController, StorefrontUserAdminController],
})
export class StorefrontUsersModule {}
