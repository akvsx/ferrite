import type { Column, RowData } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { DataTableFeatures } from '@/core/hooks/use-data-table';
import { Button } from '@/presentation/primitives/button';

export function SortableHeader<T extends RowData>({
	column,
	title,
}: {
	column: Column<DataTableFeatures, T, unknown>;
	title: string;
}) {
	const isSorted = column.getIsSorted();

	const toggleSort = () => column.toggleSorting();

	const tooltipLabel =
		isSorted === 'asc'
			? `Clear sorting for ${title}`
			: isSorted === 'desc'
				? `Sort ${title} ascending`
				: `Sort ${title} descending`;

	return (
		<div
			className="center gap-1.5 hover:cursor-pointer h-full group"
			onClick={toggleSort}
			tabIndex={-1}
			aria-hidden
		>
			{/* Title is standard text, not part of the button */}
			<span>{title}</span>

			{/* The Button is now restricted to just the icon area */}
			<Button
				unstyled
				className={`center p-0.5 transition-opacity group-hover:opacity-100 focus:opacity-100 rounded-md  ${!isSorted && 'opacity-0'}`}
				aria-label={tooltipLabel}
				tooltip={tooltipLabel}
			>
				{isSorted === 'desc' ? (
					<ArrowDown className="h-4 w-4" aria-hidden="true" />
				) : isSorted === 'asc' ? (
					<ArrowUp className="h-4 w-4" aria-hidden="true" />
				) : (
					<ArrowUpDown
						// group-hover triggers when hovering the parent div, focus-visible triggers on keyboard focus
						aria-hidden="true"
						className="h-4 w-4"
					/>
				)}
			</Button>
		</div>
	);
}
