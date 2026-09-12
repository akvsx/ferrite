import type { ManualAdjustmentType } from '@ferrite/schema';

/**
 * Resolves the signed delta from a manual adjustment type and magnitude.
 *
 * - `restock` / `return` → always adds stock (+qty)
 * - `damage` → always removes stock (-qty)
 * - `correction` (stocktake) → passes through as-is (caller provides signed value)
 */
export function resolveAdjustmentDelta(
	type: ManualAdjustmentType,
	quantity: number
): number {
	switch (type) {
		case 'restock':
		case 'return':
			return Math.abs(quantity);
		case 'damage':
			return -Math.abs(quantity);
		case 'correction':
			return quantity;
	}
}
