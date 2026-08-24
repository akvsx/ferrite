'use client';

import type { ColumnDef } from '@tanstack/react-table';
import type { DataTableFeatures } from '@/core/hooks/use-data-table';
import { SortableHeader } from '@/presentation/primitives/sortable-header';
import type { Order } from '../lib/orders-mock';
import { AddressCell } from './cells/address-cell';
import { AmountCell } from './cells/amount-cell';
import { DateCell } from './cells/date-cell';
import { OrderIdCell } from './cells/order-id-cell';
import ProductsCell from './cells/products-cell';
import { StatusCell } from './cells/status-cell';
import {
	TransactionMethodCell,
	TransactionStatusCell,
} from './cells/transaction-cell';
import { UserCell } from './cells/user-cell';

export const ordersColumns: ColumnDef<DataTableFeatures, Order>[] = [
	{
		accessorKey: 'id',
		header: ({ column }) => <SortableHeader column={column} title="Order ID" />,
		cell: ({ row }) => <OrderIdCell row={row} />,
	},
	{
		accessorKey: 'products',
		header: 'Products',
		cell: ({ row }) => <ProductsCell row={row} />,
	},
	{
		accessorKey: 'date',
		header: ({ column }) => <SortableHeader column={column} title="Date" />,
		cell: ({ row }) => <DateCell row={row} />,
	},
	{
		accessorKey: 'user',
		header: ({ column }) => <SortableHeader column={column} title="User" />,
		cell: ({ row }) => <UserCell row={row} />,
		sortFn: (rowA, rowB) => {
			const a = (rowA.getValue('user') as { name: string }).name ?? '';
			const b = (rowB.getValue('user') as { name: string }).name ?? '';
			return a.localeCompare(b);
		},
	},
	{
		accessorKey: 'address',
		header: ({ column }) => <SortableHeader column={column} title="Address" />,
		cell: ({ row }) => <AddressCell row={row} />,
		sortFn: (rowA, rowB) => {
			const a = (rowA.getValue('address') as { city: string }).city ?? '';
			const b = (rowB.getValue('address') as { city: string }).city ?? '';
			return a.localeCompare(b);
		},
	},
	{
		id: 'amount',
		accessorFn: (row) => row.products.reduce((sum, p) => sum + p.price, 0),
		header: ({ column }) => <SortableHeader column={column} title="Amount" />,
		cell: ({ row }) => <AmountCell row={row} />,
		sortFn: 'basic',
	},
	{
		accessorKey: 'transactionStatus',
		header: ({ column }) => (
			<SortableHeader column={column} title="Payment Status" />
		),
		cell: ({ row }) => <TransactionStatusCell row={row} />,
	},
	{
		accessorKey: 'transactionMethod',
		header: ({ column }) => (
			<SortableHeader column={column} title="Payment Method" />
		),
		cell: ({ row }) => <TransactionMethodCell row={row} />,
	},
	{
		accessorKey: 'status',
		header: 'Status',
		filterFn: (row, id, value: string[]) => {
			if (!value || value.length === 0) return true;
			return value.includes(row.getValue(id));
		},
		cell: ({ row }) => <StatusCell row={row} />,
	},
];
