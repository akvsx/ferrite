'use client';

import { ContextMenu as BaseUIContextMenu } from '@base-ui/react/context-menu';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@presentation/primitives/table';
import type { Row, RowData } from '@tanstack/react-table';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import {
	type DataTableFeatures,
	type UseDataTableProps,
	useDataTable,
} from '@/core/hooks/use-data-table';
import { useHydration } from '@/core/hooks/use-hydration';
import { cn } from '@/core/utils/cn';
import { Button } from './button';

/** Render prop for an optional row-level context menu.
 *  Returns the ContextMenuContent to display when a row is right-clicked. */
export type RowContextMenuRenderer<TData extends RowData> = (props: {
	rowId: string;
	row: Row<DataTableFeatures, TData>;
}) => ReactNode;

export interface DataTableProps<TData extends RowData>
	extends UseDataTableProps<TData> {
	getRowClassName?: (row: Row<DataTableFeatures, TData>) => string | undefined;
	/** Optional render prop — when provided, right-clicking any row
	 *  opens the returned context menu content. */
	renderRowContextMenu?: RowContextMenuRenderer<TData>;
}

export function DataTable<TData extends RowData>({
	getRowClassName,
	expandable = true,
	renderRowContextMenu,
	...props
}: DataTableProps<TData>) {
	const { table, getRowProps } = useDataTable({ expandable, ...props });

	const { isHydrated } = useHydration();
	const contextMenuActive = !!renderRowContextMenu && isHydrated;

	return (
		<div className="overflow-hidden border border-border rounded-container bg-card">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => {
								return (
									<TableHead key={header.id}>
										{header.isPlaceholder ? null : (
											<table.FlexRender header={header} />
										)}
									</TableHead>
								);
							})}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows?.length ? (
						table.getRowModel().rows.map((row, index) => {
							const rowId = row.original
								? String((row.original as Record<string, unknown>).id ?? row.id)
								: row.id;

							const rowClassName = cn(
								'group transition-all',
								expandable && 'cursor-pointer',
								row.getIsExpanded() && 'border-b border-border',
								getRowClassName?.(row)
							);

							const rowProps = {
								'data-state': row.getIsSelected() && 'selected',
								onClick: expandable ? () => row.toggleExpanded() : undefined,
								...getRowProps(row.id, index, () => row.toggleExpanded()),
								className: rowClassName,
							} as const;

							const cells = row.getVisibleCells().map((cell, cellIndex) => (
								<TableCell
									key={cell.id}
									className={cellIndex === 0 ? 'relative' : ''}
								>
									{expandable && cellIndex === 0 && (
										<div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity text-muted-foreground">
											<ChevronRight
												className={cn(
													'h-4 w-4 transition-transform',
													row.getIsExpanded() && 'rotate-90'
												)}
											/>
										</div>
									)}
									<table.FlexRender cell={cell} />
								</TableCell>
							));

							if (contextMenuActive) {
								return (
									<BaseUIContextMenu.Root key={row.id}>
										<BaseUIContextMenu.Trigger
											render={(triggerProps) => (
												<TableRow
													{...triggerProps}
													{...rowProps}
													className={cn(triggerProps.className, rowClassName)}
												/>
											)}
										>
											{cells}
										</BaseUIContextMenu.Trigger>
										{renderRowContextMenu({ rowId, row })}
									</BaseUIContextMenu.Root>
								);
							}

							return (
								<TableRow key={row.id} {...rowProps}>
									{cells}
								</TableRow>
							);
						})
					) : (
						<TableRow>
							<TableCell
								colSpan={props.columns.length}
								className="h-24 text-center"
							>
								No results.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>

			<div className="flex items-center justify-end space-x-2 py-4">
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					Previous
				</Button>
				<Button
					variant="outline"
					size="sm"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					Next
				</Button>
			</div>
		</div>
	);
}
