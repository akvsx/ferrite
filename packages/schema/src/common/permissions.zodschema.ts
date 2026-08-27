import { z } from 'zod/v4';

/**
 * 1. Atomic Action Definitions
 */
const CRUD = ['read', 'create', 'update', 'delete'] as const;
const READ_ONLY = ['read'] as const;

/**
 * The Permission Manifest
 */
const PERMISSION_MANIFEST = {
	products: CRUD,
	categories: CRUD,
	customers: CRUD,
	staff: CRUD,
	store: CRUD,
	orders: [...CRUD, 'refund', 'cancel', 'fulfill'],
	returns: ['read', 'update', 'approve', 'reject'],
	inventory: ['read', 'create', 'update', 'delete', 'adjust', 'transfer'],
	reports: READ_ONLY,
	logs: READ_ONLY,
	settings: ['read', 'update'],
} as const;

/**
 * Declarative Type Synthesis
 * Using Template Literal Types to create the union of action_resource.
 */
type Manifest = typeof PERMISSION_MANIFEST;
type Resource = keyof Manifest;

/**
 * This mapped type iterates over every resource and every action within its array,
 * synthesizing a union of string literals (e.g., "read_products" | "create_products").
 */
export type PermissionKey = {
	[K in Resource]: `${K & string}.${Manifest[K][number]}`;
}[Resource];

/**
 * Runtime Array Generation
 * Required for Zod's enum validation.
 */
export const STORE_PERMISSIONS = (
	Object.keys(PERMISSION_MANIFEST) as Resource[]
).flatMap((resource) =>
	PERMISSION_MANIFEST[resource].map(
		(action: unknown) => `${resource}.${action}`
	)
) as [PermissionKey, ...PermissionKey[]];

/**
 * 5. Zod Schema
 * Explicitly typed with the PermissionKey union to force IDE autocomplete.
 */
export const permissionSchema = z.enum(STORE_PERMISSIONS);

export const Permission = permissionSchema.enum;
