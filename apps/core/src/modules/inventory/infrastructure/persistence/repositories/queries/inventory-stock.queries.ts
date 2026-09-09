import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import { DrizzleUnitOfWork } from '@core/database/drizzle-unit-of-work';
import {
	inventoryAdjustments,
	inventoryLevels,
} from '@core/database/schema/inventory.schema';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import type { AdjustmentType } from '@ferrite/schema';
import { and, eq, sql } from 'drizzle-orm';

export async function executeAdjustStock(
	tracer: ITracer,
	ctx: ITransactionContext,
	inventoryItemId: string,
	adjustment: {
		type: AdjustmentType;
		quantityChange: number;
		reason?: string;
		adjustedBy?: string;
	}
) {
	const executor = DrizzleUnitOfWork.unwrap(ctx);
	const [levelRow] = await traceDbOp(
		tracer,
		'db.inventory_levels.update_stock',
		{ 'db.table': 'inventory_levels', 'db.operation': 'update' },
		() =>
			executor
				.update(inventoryLevels)
				.set({
					quantityOnHand: sql`${inventoryLevels.quantityOnHand} + ${adjustment.quantityChange}`,
					updatedAt: sql`now()`,
				})
				.where(
					and(
						eq(inventoryLevels.inventoryItemId, inventoryItemId),
						sql`${inventoryLevels.quantityOnHand} + ${adjustment.quantityChange} >= 0`
					)
				)
				.returning()
	);
	if (!levelRow) return null;
	await traceDbOp(
		tracer,
		'db.inventory_adjustments.insert',
		{ 'db.table': 'inventory_adjustments', 'db.operation': 'insert' },
		() =>
			executor.insert(inventoryAdjustments).values({
				inventoryItemId,
				adjustmentType: adjustment.type,
				quantityChange: adjustment.quantityChange,
				reason: adjustment.reason,
				adjustedBy: adjustment.adjustedBy,
			})
	);
	return { ...levelRow, quantityAvailable: levelRow.quantityAvailable ?? 0 };
}
