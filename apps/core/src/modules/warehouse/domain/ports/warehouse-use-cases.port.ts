import type { IUseCase } from '@common/interfaces/use-case.interface';
import type {
	CreateWarehouseInput,
	ListWarehousesQuery,
	PaginatedResponse,
	PaginationInput,
	UpdateWarehouseInput,
	Warehouse,
} from '@ferrite/schema';
import type {
	UnknownWarehouseError,
	WarehouseNameConflictError,
	WarehouseNotFoundError,
} from '../errors';

export const CREATE_WAREHOUSE_UC = Symbol('ICreateWarehouseUseCase');
export interface ICreateWarehouseUseCase
	extends IUseCase<
		{ storeId: string; data: CreateWarehouseInput },
		Warehouse,
		WarehouseNameConflictError | UnknownWarehouseError
	> {}

export const UPDATE_WAREHOUSE_UC = Symbol('IUpdateWarehouseUseCase');
export interface IUpdateWarehouseUseCase
	extends IUseCase<
		{ id: string; storeId: string; data: UpdateWarehouseInput },
		Warehouse,
		WarehouseNotFoundError | WarehouseNameConflictError | UnknownWarehouseError
	> {}

export const DELETE_WAREHOUSE_UC = Symbol('IDeleteWarehouseUseCase');
export interface IDeleteWarehouseUseCase
	extends IUseCase<
		{ id: string; storeId: string },
		void,
		WarehouseNotFoundError | UnknownWarehouseError
	> {}

export const GET_WAREHOUSE_UC = Symbol('IGetWarehouseUseCase');
export interface IGetWarehouseUseCase
	extends IUseCase<
		{ id: string; storeId: string },
		Warehouse,
		WarehouseNotFoundError | UnknownWarehouseError
	> {}

export const LIST_WAREHOUSES_UC = Symbol('IListWarehousesUseCase');
export interface IListWarehousesUseCase
	extends IUseCase<
		{ storeId: string; query: ListWarehousesQuery } & PaginationInput,
		PaginatedResponse<Warehouse>,
		UnknownWarehouseError
	> {}
