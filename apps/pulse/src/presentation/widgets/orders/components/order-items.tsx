import Image from 'next/image';
import { Button } from '@/presentation/primitives/button';
import { sheetRouter } from '@/presentation/sheet-router/sheet-router.store';

const order = {
	id: 'ORD-1018',
	date: new Date('2026-06-12'),
	user: {
		id: 'USR-018',
		name: 'Michael Adams',
		email: 'michael.adams@example.com',
		avatar: 'https://i.pravatar.cc/150?img=20',
	},
	products: [
		{
			id: '1',
			name: 'Ferrite Premium Velvet Matte Lipstick',
			price: 12.99,
			currency: {
				code: 'USD',
				symbol: '$',
			},

			image:
				'https://images.pexels.com/photos/7797527/pexels-photo-7797527.jpeg',
			varient: [
				{
					label: '300ml',
					price: 12.99,
				},
			],
			quantity: 3,
		},
		{
			id: '5',
			name: 'Midnight Muse Perfume',
			price: 29.99,
			image:
				'https://images.pexels.com/photos/8140898/pexels-photo-8140898.jpeg',
			currency: {
				code: 'USD',
				symbol: '$',
			},
			varient: [
				{
					label: '300ml',
				},
				{
					label: 'cream',
				},
			],
			quantity: 1,
		},

		{
			id: '6',
			name: 'Ferrite Care Plus Petal Rose Facial Serum',
			price: 29.99,
			currency: {
				code: 'USD',
				symbol: '$',
			},
			image:
				'https://images.pexels.com/photos/10825663/pexels-photo-10825663.jpeg',
			varient: [
				{
					label: '300ml',
				},
				{
					label: 'lime',
				},
			],
			quantity: 1,
		},
	],
	address: {
		street: '10 Lake View',
		city: 'Orlando',
		state: 'Florida',
		country: 'USA',
		landmark: 'Lake Eola',
		zip: '32801',
	},
	transaction: {
		transactionStatus: 'success',
		transactionMethod: 'card',
		transactionId: 'TXN-1018',
		transactionTime: new Date('2026-06-12:10:00'),
		transactionAmount: 12.99,
		transactionFee: 0.99,
		transactionCurrency: 'USD',
	},
	status: 'inTransit',
};
const OrderItems = () => {
	return (
		<div className="col gap-4">
			<p className="text-lg font-light">Items</p>

			<div className="col gap-6">
				{order.products.map((product) => (
					<Button
						unstyled
						key={product.id}
						className="flex gap-5 rounded-l-xl"
						onClick={() =>
							sheetRouter.push('product-details', {
								productId: product.id,
							})
						}
					>
						<Image
							src={product.image}
							alt={product.name}
							width={80}
							height={80}
							className="rounded-xl h-20 w-20 object-center object-cover aspect-square bg-muted-foreground"
						/>
						<div className="flex full justify-between group text-start">
							<div className="flex flex-col gap-2">
								<p className="text-[1.13rem] w-64 group-hover:underline underline-offset-2">
									{product.name}
								</p>
								<div className="flex gap-4">
									{product.varient.map((variant) => (
										<p
											key={variant.label}
											className="text-base items-center font-light text-muted-foreground"
										>
											{variant.label}
										</p>
									))}
								</div>
							</div>

							<div className="col gap-3">
								<p className="text-[1.13rem]">
									<span className="px-0.5">{product.currency.symbol}</span>
									{product.price}
								</p>
								<p className="text-muted-foreground text-[1.05rem]">
									Qty {product.quantity}
								</p>
							</div>
						</div>
					</Button>
				))}
			</div>
		</div>
	);
};

export default OrderItems;
