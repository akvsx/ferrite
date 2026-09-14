import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';
import type { TDatabase } from '@core/database/db.type';
import { DrizzleUnitOfWork } from '@core/database/drizzle-unit-of-work';
import {
	inventoryAdjustments,
	inventoryLevels,
} from '@core/database/schema/inventory.schema';
import {
	buildPaginatedResponse,
	cursorPaginationClauses,
} from '@core/database/utils/cursor-pagination.util';
import { traceDbOp } from '@core/database/utils/trace-db-op.util';
import type { ITracer } from '@core/tracer';
import type {
	AdjustmentType,
	ListInventoryAdjustmentsQuery,
} from '@ferrite/schema';
import { and, eq, sql } from 'drizzle-orm';
import { InventoryItemMapper } from '../../mappers/inventory-item.mapper';

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

export async function executeListAdjustments(
	db: TDatabase,
	inventoryItemId: string,
	query: ListInventoryAdjustmentsQuery
) {
	const limit = query.limit ?? 20;

	const { where, orderBy, queryLimit } = cursorPaginationClauses({
		idColumn: inventoryAdjustments.id,
		sortColumn: inventoryAdjustments.createdAt,
		cursor: query.cursor,
		limit,
		filters: [],
		tenantColumn: inventoryAdjustments.inventoryItemId,
		tenantId: inventoryItemId,
	});

	const rows = await db
		.select()
		.from(inventoryAdjustments)
		.where(where)
		.orderBy(...orderBy)
		.limit(queryLimit);

	return buildPaginatedResponse(
		rows,
		limit,
		InventoryItemMapper.toAdjustmentDomain,
		(row: typeof inventoryAdjustments.$inferSelect) => ({
			id: row.id,
			sortValue: row.createdAt,
		})
	);
}
