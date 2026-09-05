import type { Warehouse as DbWarehouse } from '@core/database/schema/inventory.schema';
import type { Warehouse as DomainWarehouse } from '@ferrite/schema';

export class WarehouseMapper {
	static toDomain(dbWarehouse: DbWarehouse): DomainWarehouse {
		return {
			...dbWarehouse,
			createdAt: dbWarehouse.createdAt.toISOString(),
			updatedAt: dbWarehouse.updatedAt.toISOString(),
		};
	}
}
