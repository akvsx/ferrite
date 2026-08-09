import { pgEnum } from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────
// ENUMS
// ─────────────────────────────────────────

export const authProviderEnum = pgEnum('auth_provider', ['clerk']);

export const platformRoleEnum = pgEnum('platform_role', [
	'admin',
	'staff',
	'user',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
	'email',
	'sms',
	'push',
	'whatsapp',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
	'order_updates',
	'promotions',
	'restock',
	'price_drop',
	'support',
	'security',
]);

export const cardBrandEnum = pgEnum('card_brand', ['visa', 'mastercard']);

export const paymentProviderEnum = pgEnum('payment_provider', [
	'stripe',
	'paypal',
]);

import { STORE_PERMISSIONS } from '@ferrite/schema/common/permissions.zodschema';

export const permissionKeyEnum = pgEnum('permission_key', STORE_PERMISSIONS);

export const addressTypeEnum = pgEnum('address_type', [
	'home',
	'work',
	'other',
]);

export const onboardingStateEnum = pgEnum('onboarding_state', [
	'ABOUT_ME',
	'STORE_CREATION',
	'COMPLETED',
]);

export const invitationStatusEnum = pgEnum('invitation_status', [
	'pending',
	'accepted',
	'declined',
	'expired',
]);

export const productStatusEnum = pgEnum('product_status', [
	'draft',
	'active',
	'archived',
]);

export const variantStatusEnum = pgEnum('variant_status', [
	'active',
	'inactive',
	'discontinued',
]);

export const inventoryAdjustmentTypeEnum = pgEnum('inventory_adjustment_type', [
	'restock',
	'sale',
	'return',
	'adjustment',
	'damage',
	'transfer',
]);

export const promotionTypeEnum = pgEnum('promotion_type', [
	'percentage_discount',
	'fixed_discount',
	'buy_x_get_y',
	'free_shipping',
	'bundle_deal',
]);
