import ProductDetails from '../components/product-details';
import ProductImageCarousel from '../components/product-image-carousel';
import ProductVariantsTable from '../components/product-variants-table';

interface ProductDetailsScreenProps {
	params: { productId: string };
}

const product = {
	id: 'prod_starlight_01',
	name: 'Ferrite starlight product name - mock product name',
	description:
		"Lorem Ipsum has been the industry's standard dummy text ever since 1966, when designers at Letraset and James Mosley, the librarian at St Bride Printing Library",
	tags: ['product', 'serum'],
	category: 'skin care',
	basePrice: 12.99,
	currencyCode: 'USD',
	rating: 4.8,

	images: [
		{
			id: 'img-239p8hasdf',
			default: true,
			alt: 'product image',
			src: 'https://images.pexels.com/photos/10825668/pexels-photo-10825668.jpeg',
		},
		{
			id: 'img-2a9p8hassaf',
			alt: 'product image',
			src: 'https://images.pexels.com/photos/10825670/pexels-photo-10825670.jpeg',
		},
		{
			id: 'img-239p8h2rdf',
			alt: 'product image',
			src: 'https://images.pexels.com/photos/10825673/pexels-photo-10825673.jpeg',
		},
		{
			id: 'img-2a9p8haasaf',
			alt: 'product image',
			src: 'https://images.pexels.com/photos/10825670/pexels-photo-10825670.jpeg',
		},
		{
			id: 'img-2a9p8hagsaf',
			alt: 'product image',
			src: 'https://images.pexels.com/photos/10825670/pexels-photo-10825670.jpeg',
		},
	],
	options: {
		flavor: {
			label: 'Flavor',
			values: ['lemon', 'cherry'],
		},
		size: {
			label: 'Size',
			values: ['standard', 'large'],
		},
	},

	// SKU Index: Deterministic lookup matrix for resolved variant combinations
	skus: {
		'fts-lem-std-a8de': {
			attributes: { flavor: 'lemon', size: 'standard' },
			price: 12.99,
			inventoryQuantity: 259,
			imageIds: ['img-qp89uad8a'],
		},
		'fts-che-lrg-b9ef': {
			attributes: { flavor: 'cherry', size: 'large' },
			price: 14.99,
			inventoryQuantity: 12,
			imageIds: ['img-239p8hasdf'],
		},
		'fts-che-lrg-b9ed': {
			attributes: { flavor: 'cherry', size: 'small' },
			price: 14.99,
			inventoryQuantity: 12,
			imageIds: ['img-239p8hasdf'],
		},
	},
};

const ProductDetailsScreen = ({ params }: ProductDetailsScreenProps) => {
	return (
		<div className="col gap-8 px-6">
			<div className="col gap-4">
				<p className="text-sm font-mono text-muted-foreground">
					{params.productId}
				</p>

				<ProductImageCarousel images={product.images} />
				<ProductDetails {...product} />
			</div>

			<div className="col gap-4 mt-2">
				<p className="text-xl font-light">Inventory</p>
				<ProductVariantsTable {...product} />
			</div>
		</div>
	);
};

export default ProductDetailsScreen;
