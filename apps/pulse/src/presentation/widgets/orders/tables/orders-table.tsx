'use client';

import type { Row } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/core/hooks/use-data-table';
import { DataTable } from '@/presentation/primitives/data-table';
import type { Order } from '../lib/orders-mock';
import { orders } from '../lib/orders-mock';
import {
	updateOrdersTableExpanded,
	updateOrdersTableFilters,
	updateOrdersTableVisibility,
	useOrdersTableStore,
} from '../stores/orders-table.store';
import { ordersColumns } from './table-columns';
import { OrdersContextMenu } from './table-context-menu';

// Ensure order screens are registered in the sheet router.
import '../sheets/order-routes';

const getRowClassName = (
	row: Row<DataTableFeatures, Order>
): string | undefined =>
	row.original.transactionStatus === 'failed' ||
	row.original.status === 'cancelled'
		? 'opacity-60 focus:opacity-80 grayscale-25 hover:grayscale-0 focus:grayscale-0 transition-all duration-200'
		: undefined;

const OrdersTable = () => {
	const expandedState = useOrdersTableStore((state) => state.expandedState);
	const columnFilters = useOrdersTableStore((state) => state.columnFilters);
	const columnVisibility = useOrdersTableStore(
		(state) => state.columnVisibility
	);

	return (
		<DataTable
			columns={ordersColumns}
			data={orders}
			expanded={expandedState}
			onExpandedChange={updateOrdersTableExpanded}
			columnFilters={columnFilters}
			onColumnFiltersChange={updateOrdersTableFilters}
			columnVisibility={columnVisibility}
			onColumnVisibilityChange={updateOrdersTableVisibility}
			getRowClassName={getRowClassName}
			renderRowContextMenu={({ rowId, row }) => (
				<OrdersContextMenu rowId={rowId} data={row.original} />
			)}
		/>
	);
};

export default OrdersTable;
