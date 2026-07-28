import { currencySymbol } from '@/core/utils/currency-symbol';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/presentation/primitives/table';

interface ProductVariantsTableProps {
	options: Record<string, { label: string; values: string[] }>;
	skus: Record<
		string,
		{
			attributes: Record<string, string>;
			inventoryQuantity: number;
			price?: number;
		}
	>;
	basePrice: number;
	currencyCode: string;
}

const ProductVariantsTable = ({
	options,
	skus,
	basePrice,
	currencyCode,
}: ProductVariantsTableProps) => {
	const optionKeys = Object.keys(options);

	return (
		<div className="col gap-12">
			<div className="rounded-2xl border overflow-x-auto w-full">
				<Table className="table-auto min-w-max w-full text-center">
					<TableHeader>
						<TableRow className="border-y first:border-t-0">
							{optionKeys.map((key) => (
								<TableHead
									key={`head-${key}`}
									className="h-16 border-r whitespace-nowrap px-4"
								>
									{options[key].label}
								</TableHead>
							))}

							{/*
                <TableHead className="h-16 border-r whitespace-nowrap px-4">
                  SKU
                </TableHead>
                */}
							<TableHead className="h-16 border-r whitespace-nowrap px-4">
								Inventory
							</TableHead>
							<TableHead className="h-16 whitespace-nowrap px-4">
								Price
							</TableHead>
						</TableRow>
					</TableHeader>

					<TableBody className="w-full">
						{Object.entries(skus).map(([skuId, skuData]) => (
							<TableRow
								key={skuId}
								className="border-y first:border-t-0 last:border-b-0"
							>
								{optionKeys.map((optKey) => (
									<TableCell
										key={`${skuId}-${optKey}`}
										className="h-16 border-r whitespace-nowrap px-4"
									>
										{skuData.attributes[optKey] || '—'}
									</TableCell>
								))}

								{/*
                <TableCell
                    className="h-16 border-r whitespace-nowrap px-4 font-mono text-sm relative group"
                    title={skuId}
                >
                    {skuId.slice(0, 6)}...
                    <CopyIcon className="absolute hidden top-4 right-4 h-8 w-8 p-2 bg-active rounded-lg group-hover:block" />
                </TableCell>
                */}
								<TableCell className="h-16 border-r whitespace-nowrap px-4">
									{skuData.inventoryQuantity}
								</TableCell>

								<TableCell className="h-16 whitespace-nowrap px-4">
									{currencySymbol(skuData.price ?? basePrice, currencyCode) ??
										skuData.price ??
										basePrice}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
};

export default ProductVariantsTable;
