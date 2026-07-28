import { LayoutGrid, Star } from 'lucide-react';
import { currencySymbol } from '@/core/utils/currency-symbol';
import { Button } from '@/presentation/primitives/button';

type ProductDetailsProps = {
	name: string;
	category: string;
	rating: number;
	currencyCode: string;
	basePrice: number;
	description: string;
	tags: string[];
};

const ProductDetails = ({
	name,
	category,
	rating,
	currencyCode,
	basePrice,
	description,
	tags,
}: ProductDetailsProps) => {
	return (
		<div className="px-2 col gap-6">
			<h2 className="text-2xl font-light line-clamp-2">{name}</h2>

			<div className="flex justify-between items-center">
				<div className="flex gap-4">
					<Button size="sm" className="py-6 px-6 gap-2" variant="secondary">
						<LayoutGrid />
						{category}
					</Button>

					<Button size="sm" className="py-6 px-6 gap-2 " variant="secondary">
						<Star className="" />
						{rating}
					</Button>
				</div>

				<div className="text-3xl font-light">
					{currencySymbol(basePrice, currencyCode) ?? basePrice}
				</div>
			</div>

			<div className="flex gap-2 items-center text-muted-foreground">
				{tags.map((tag) => (
					<div key={tag} className="flex gap-2 items-center">
						#{tag}
					</div>
				))}
			</div>

			<p className="text-muted-foreground text-lg">{description}</p>
		</div>
	);
};

export default ProductDetails;
