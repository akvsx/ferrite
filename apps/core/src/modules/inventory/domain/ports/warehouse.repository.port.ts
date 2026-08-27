import { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import {
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
	findActiveByStoreId(storeId: string): Promise<Warehouse[]>;
}
