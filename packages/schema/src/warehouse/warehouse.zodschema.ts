import { z } from 'zod/v4';
import { PaginationInputSchema } from '../common/pagination.zodschema';

export const WarehouseSchema = z.object({
	id: z.uuid(),
	storeId: z.uuid(),
	name: z.string().max(255),
	address: z.string().nullable().optional(),
	isActive: z.boolean(),
	createdAt: z.iso.datetime(),
	updatedAt: z.iso.datetime(),
});

export type Warehouse = z.infer<typeof WarehouseSchema>;

export const CreateWarehouseInputSchema = z.object({
	name: z.string().max(255).min(1),
	address: z.string().optional(),
	isActive: z.boolean().default(true),
});

export type CreateWarehouseInput = z.infer<typeof CreateWarehouseInputSchema>;

export const UpdateWarehouseInputSchema = z.object({
	name: z.string().max(255).min(1).optional(),
	address: z.string().optional(),
	isActive: z.boolean().optional(),
});

export type UpdateWarehouseInput = z.infer<typeof UpdateWarehouseInputSchema>;

export const ListWarehousesQuerySchema = PaginationInputSchema.extend({
	isActive: z
		.string()
		.transform((val) => val === 'true')
		.optional(),
	search: z.string().optional(),
});

export type ListWarehousesQuery = z.infer<typeof ListWarehousesQuerySchema>;
