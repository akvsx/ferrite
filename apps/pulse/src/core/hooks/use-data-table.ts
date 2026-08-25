import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnVisibilityState,
	columnFilteringFeature,
	columnVisibilityFeature,
	createExpandedRowModel,
	createFilteredRowModel,
	createPaginatedRowModel,
	createSortedRowModel,
	type ExpandedState,
	type OnChangeFn,
	type RowData,
	rowExpandingFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	rowSortingFeature,
	type SortingState,
	sortFn_basic,
	tableFeatures,
	useTable,
} from '@tanstack/react-table';
import { useCallback, useEffect, useState } from 'react';

const dataTableFeatures = tableFeatures({
	rowExpandingFeature,
	rowSortingFeature,
	rowPaginationFeature,
	rowSelectionFeature,
	columnFilteringFeature,
	columnVisibilityFeature,
	expandedRowModel: createExpandedRowModel(),
	sortedRowModel: createSortedRowModel(),
	filteredRowModel: createFilteredRowModel(),
	paginatedRowModel: createPaginatedRowModel(),
	sortFns: { basic: sortFn_basic },
});

export type DataTableFeatures = typeof dataTableFeatures;

export interface UseDataTableProps<TData extends RowData> {
	columns: ColumnDef<DataTableFeatures, TData>[];
	data: TData[];
	expandable?: boolean;
	expanded?: ExpandedState;
	onExpandedChange?: OnChangeFn<ExpandedState>;
	columnFilters?: ColumnFiltersState;
	onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
	columnVisibility?: ColumnVisibilityState;
	onColumnVisibilityChange?: OnChangeFn<ColumnVisibilityState>;
}

export function useDataTable<TData extends RowData>({
	columns,
	data,
	expandable = true,
	expanded,
	onExpandedChange,
	columnFilters,
	onColumnFiltersChange,
	columnVisibility,
	onColumnVisibilityChange,
}: UseDataTableProps<TData>) {
	const [localColumnFilters, setLocalColumnFilters] =
		useState<ColumnFiltersState>([]);
	const [localExpanded, setLocalExpanded] = useState<ExpandedState>({});
	const [localColumnVisibility, setLocalColumnVisibility] =
		useState<ColumnVisibilityState>({});
	const [sorting, setSorting] = useState<SortingState>([]);

	const [focusedRowId, setFocusedRowId] = useState<string | null>(null);

	const actualColumnFilters =
		columnFilters !== undefined ? columnFilters : localColumnFilters;
	const actualOnColumnFiltersChange =
		onColumnFiltersChange || setLocalColumnFilters;

	const actualExpanded = expanded !== undefined ? expanded : localExpanded;
	const actualOnExpandedChange = onExpandedChange || setLocalExpanded;

	const actualColumnVisibility =
		columnVisibility !== undefined ? columnVisibility : localColumnVisibility;
	const actualOnColumnVisibilityChange =
		onColumnVisibilityChange || setLocalColumnVisibility;

	const table = useTable({
		features: dataTableFeatures,
		data,
		columns,
		getRowCanExpand: () => expandable,
		onColumnFiltersChange: actualOnColumnFiltersChange,
		onExpandedChange: actualOnExpandedChange,
		onColumnVisibilityChange: actualOnColumnVisibilityChange,
		onSortingChange: setSorting,

		state: {
			columnFilters: actualColumnFilters,
			expanded: actualExpanded,
			columnVisibility: actualColumnVisibility,
			sorting,
		},
	});

	const rows = table.getRowModel().rows;
	const isFocusedRowVisible =
		focusedRowId !== null && rows.some((row) => row.id === focusedRowId);
	const effectiveFocusedRowId = isFocusedRowVisible
		? focusedRowId
		: (rows[0]?.id ?? null);

	useEffect(() => {
		if (focusedRowId !== null && !isFocusedRowVisible) {
			setFocusedRowId(null);
		}
	}, [focusedRowId, isFocusedRowVisible]);

	const getRowProps = useCallback(
		(rowId: string, index: number, toggleExpanded: () => void) => {
			const isFocused =
				effectiveFocusedRowId === rowId ||
				(effectiveFocusedRowId === null && index === 0);

			return {
				tabIndex: isFocused ? 0 : -1,
				onFocus: () => setFocusedRowId(rowId),
				onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
					if (e.key === 'Enter') {
						e.preventDefault();
						toggleExpanded();
					} else if (e.key === 'ArrowDown') {
						e.preventDefault();
						const nextRow = e.currentTarget.nextElementSibling as HTMLElement;

						if (nextRow?.tabIndex !== undefined && nextRow.tabIndex >= -1) {
							nextRow.focus();
						}
					} else if (e.key === 'ArrowUp') {
						e.preventDefault();
						const prevRow = e.currentTarget
							.previousElementSibling as HTMLElement;

						if (prevRow?.tabIndex !== undefined && prevRow.tabIndex >= -1) {
							prevRow.focus();
						}
					}
				},
			};
		},
		[effectiveFocusedRowId]
	);

	return {
		table,
		getRowProps,
	};
}
