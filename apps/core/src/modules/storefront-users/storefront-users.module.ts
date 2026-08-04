import { Module } from '@nestjs/common';
import { AdminSetBanStatusStorefrontUserUseCase } from './application/use-cases/admin-set-ban-status-storefront-user.use-case';
import { DeleteStorefrontUserUseCase } from './application/use-cases/delete-storefront-user.use-case';
import { GetStorefrontUserUseCase } from './application/use-cases/get-storefront-user.use-case';
import { GetStorefrontUsersUseCase } from './application/use-cases/get-storefront-users.use-case';
import { UpdateStorefrontUserUseCase } from './application/use-cases/update-storefront-user.use-case';
import { STOREFRONT_USER_REPOSITORY } from './domain/ports/storefront-user-repository.port';
import { StorefrontUserAdminController } from './infrastructure/http/controllers/storefront-users.admin.controller';
import { StorefrontUserController } from './infrastructure/http/controllers/storefront-users.controller';
import { DrizzleStorefrontUserRepository } from './infrastructure/persistence/repositories/drizzle-storefront-user.repository';

@Module({
	controllers: [StorefrontUserController, StorefrontUserAdminController],
	providers: [
		{
			provide: STOREFRONT_USER_REPOSITORY,
			useClass: DrizzleStorefrontUserRepository,
		},
		GetStorefrontUserUseCase,
		GetStorefrontUsersUseCase,
		UpdateStorefrontUserUseCase,
		DeleteStorefrontUserUseCase,
		AdminSetBanStatusStorefrontUserUseCase,
	],
	exports: [
		GetStorefrontUserUseCase,
		GetStorefrontUsersUseCase,
		UpdateStorefrontUserUseCase,
		DeleteStorefrontUserUseCase,
		AdminSetBanStatusStorefrontUserUseCase,
	],
})
export class StorefrontUsersModule {}
