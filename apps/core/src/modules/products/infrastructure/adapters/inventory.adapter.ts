import { Result } from '@common/interfaces/result.interface';
import { InventoryItemDetail } from '@ferrite/schema';
import {
	GET_VARIANTS_INVENTORY_UC,
	type IGetVariantsInventoryUseCase,
} from '@modules/inventory/domain/ports/inventory-use-cases.port';
import { Inject, Injectable } from '@nestjs/common';
import { IInventoryService } from '../../domain/ports/inventory-service.port';

@Injectable()
export class InventoryAdapter implements IInventoryService {
	constructor(
		@Inject(GET_VARIANTS_INVENTORY_UC)
		private readonly getVariantsInventoryUc: IGetVariantsInventoryUseCase
	) {}

	async getInventoryForVariants(
		storeId: string,
		variantIds: string[]
	): Promise<Result<Record<string, InventoryItemDetail[]>, Error>> {
		return this.getVariantsInventoryUc.execute({ storeId, variantIds });
	}
}
