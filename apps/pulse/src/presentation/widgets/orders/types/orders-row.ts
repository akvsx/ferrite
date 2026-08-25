import type { Row } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/core/hooks/use-data-table';
import type { Order } from '../lib/orders-mock';

export type OrdersRow = Row<DataTableFeatures, Order>;
export type OrdersRowProps = {
	row: OrdersRow;
};
