/**
 * Order-domain sheet screen registrations.
 *
 * Routes are defined centrally in sheet-route.types.ts.
 * This file registers the screen components for each route.
 */

import { lazy } from 'react';
import { registerScreen } from '@/presentation/sheet-router/screen-registry';

// Lazy-load screen components

const OrderDetailsScreen = lazy(() => import('./order-details-screen'));
const PaymentDetailsScreen = lazy(() => import('./payment-details-screen'));
const ShipmentDetailsScreen = lazy(() => import('./shipment-details-screen'));
const UserProfileScreen = lazy(() => import('./user-profile-screen'));
const ProductDetailsScreen = lazy(
	() => import('../../inventory/sheets/product-details-screen')
);

// Register screens

registerScreen('order-details', {
	component: OrderDetailsScreen,
	title: 'Order Details',
});

registerScreen('product-details', {
	component: ProductDetailsScreen,
	title: 'Product Details',
});

registerScreen('payment-details', {
	component: PaymentDetailsScreen,
	title: 'Payment Details',
});

registerScreen('shipment-details', {
	component: ShipmentDetailsScreen,
	title: 'Shipment Details',
});

registerScreen('user-profile', {
	component: UserProfileScreen,
	title: 'User Profile',
});
