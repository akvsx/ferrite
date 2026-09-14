import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import { DrizzleUnitOfWork } from '@core/database/drizzle-unit-of-work';
import {
	inventoryItems,
	inventoryLevels,
} from '@core/database/schema/inventory.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import type { CreateInventoryItemInput } from '@ferrite/schema';
import { InventoryItemMapper } from '../../mappers/inventory-item.mapper';

export async function executeCreateInventoryItem(
	tracer: ITracer,
	ctx: ITransactionContext,
	input: CreateInventoryItemInput
) {
	const executor = DrizzleUnitOfWork.unwrap(ctx);
	const [itemRow] = await traceDbOp(
		tracer,
		'db.inventory_items.insert',
		{ 'db.table': 'inventory_items', 'db.operation': 'insert' },
		() =>
			executor
				.insert(inventoryItems)
				.values({
					variantId: input.variantId,
					warehouseId: input.warehouseId,
					batchNumber: input.batchNumber,
					restockDate: input.restockDate ? new Date(input.restockDate) : null,
					expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
					lowStockThreshold: input.lowStockThreshold,
				})
				.returning()
	);
	const [levelRow] = await traceDbOp(
		tracer,
		'db.inventory_levels.insert',
		{ 'db.table': 'inventory_levels', 'db.operation': 'insert' },
		() =>
			executor
				.insert(inventoryLevels)
				.values({
					inventoryItemId: itemRow.id,
					quantityOnHand: 0,
					quantityReserved: 0,
				})
				.returning()
	);
	return InventoryItemMapper.toDomainDetail(itemRow, levelRow);
}

export async function executeBulkCreateIfNotExists(
	tracer: ITracer,
	ctx: ITransactionContext,
	inputs: CreateInventoryItemInput[]
) {
	if (inputs.length === 0) return;
	const executor = DrizzleUnitOfWork.unwrap(ctx);
	const itemRows = await traceDbOp(
		tracer,
		'db.inventory_items.bulk_insert',
		{ 'db.table': 'inventory_items', 'db.operation': 'insert' },
		() =>
			executor
				.insert(inventoryItems)
				.values(
					inputs.map((input) => ({
						variantId: input.variantId,
						warehouseId: input.warehouseId,
						batchNumber: input.batchNumber,
						restockDate: input.restockDate ? new Date(input.restockDate) : null,
						expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
						lowStockThreshold: input.lowStockThreshold,
					}))
				)
				.onConflictDoNothing({
					target: [
						inventoryItems.variantId,
						inventoryItems.warehouseId,
						inventoryItems.batchNumber,
					],
				})
				.returning({ id: inventoryItems.id })
	);
	if (itemRows.length > 0) {
		await traceDbOp(
			tracer,
			'db.inventory_levels.bulk_insert',
			{ 'db.table': 'inventory_levels', 'db.operation': 'insert' },
			() =>
				executor
					.insert(inventoryLevels)
					.values(
						itemRows.map((row) => ({
							inventoryItemId: row.id,
							quantityOnHand: 0,
							quantityReserved: 0,
						}))
					)
					.onConflictDoNothing()
		);
	}
}
