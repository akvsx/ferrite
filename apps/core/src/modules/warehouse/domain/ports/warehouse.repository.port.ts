import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import type {
	CreateWarehouseInput,
	ListWarehousesQuery,
	PaginatedResponse,
	UpdateWarehouseInput,
	Warehouse,
} from '@ferrite/schema';

export const WAREHOUSE_REPOSITORY = Symbol('IWarehouseRepository');

export interface IWarehouseRepository {
	create(
		storeId: string,
		input: CreateWarehouseInput,
		tx?: ITransactionContext
	): Promise<Warehouse>;
	update(
		id: string,
		storeId: string,
		input: UpdateWarehouseInput
	): Promise<Warehouse | null>;
	softDelete(id: string, storeId: string): Promise<boolean>;
	findByIdAndStore(id: string, storeId: string): Promise<Warehouse | null>;
	findByStoreId(
		storeId: string,
		query: ListWarehousesQuery
	): Promise<PaginatedResponse<Warehouse>>;
	findByNameAndStore(name: string, storeId: string): Promise<Warehouse | null>;
	findByIdOrNameAndStore(
		id: string,
		name: string,
		storeId: string
	): Promise<Warehouse[]>;
	findActiveByStoreId(storeId: string): Promise<Warehouse[]>;
}
