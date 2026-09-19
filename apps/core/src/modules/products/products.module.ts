import { InventoryModule } from '@modules/inventory/inventory.module';
import { QueueModule } from '@modules/queue';
import { StoreModule } from '@modules/store';
import { Module } from '@nestjs/common';
import { CreateProductUseCase } from './application/use-cases/create-product.use-case';
import { DeleteProductUseCase } from './application/use-cases/delete-product.use-case';
import { GetAdminProductUseCase } from './application/use-cases/get-admin-product.use-case';
import { GetProductUseCase } from './application/use-cases/get-product.use-case';
import { GetProductBySlugUseCase } from './application/use-cases/get-product-by-slug.use-case';
import { ListProductsUseCase } from './application/use-cases/list-products.use-case';
import { UpdateProductUseCase } from './application/use-cases/update-product.use-case';
import { INVENTORY_SERVICE } from './domain/ports/inventory-service.port';
import { PRODUCT_REPOSITORY } from './domain/ports/product.repository.port';
import {
	CREATE_PRODUCT_UC,
	DELETE_PRODUCT_UC,
	GET_ADMIN_PRODUCT_UC,
	GET_PRODUCT_BY_SLUG_UC,
	GET_PRODUCT_UC,
	LIST_PRODUCTS_UC,
	UPDATE_PRODUCT_UC,
} from './domain/ports/product-use-cases.port';
import { InventoryAdapter } from './infrastructure/adapters/inventory.adapter';
import { ProductAdminController } from './infrastructure/http/controllers/product.admin.controller';
import { ProductStorefrontController } from './infrastructure/http/controllers/product.storefront.controller';
import { DrizzleProductRepository } from './infrastructure/persistence/repositories/drizzle-product.repository';

@Module({
	imports: [StoreModule, QueueModule, InventoryModule],
	controllers: [ProductAdminController, ProductStorefrontController],
	providers: [
		{
			provide: PRODUCT_REPOSITORY,
			useClass: DrizzleProductRepository,
		},
		{
			provide: CREATE_PRODUCT_UC,
			useClass: CreateProductUseCase,
		},
		{
			provide: UPDATE_PRODUCT_UC,
			useClass: UpdateProductUseCase,
		},
		{
			provide: DELETE_PRODUCT_UC,
			useClass: DeleteProductUseCase,
		},
		{
			provide: GET_PRODUCT_UC,
			useClass: GetProductUseCase,
		},
		{
			provide: GET_ADMIN_PRODUCT_UC,
			useClass: GetAdminProductUseCase,
		},
		{
			provide: GET_PRODUCT_BY_SLUG_UC,
			useClass: GetProductBySlugUseCase,
		},
		{
			provide: LIST_PRODUCTS_UC,
			useClass: ListProductsUseCase,
		},
		{
			provide: INVENTORY_SERVICE,
			useClass: InventoryAdapter,
		},
	],
	exports: [PRODUCT_REPOSITORY, INVENTORY_SERVICE],
})
export class ProductsModule {}
