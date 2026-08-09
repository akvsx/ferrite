/**
 * Factory helpers for building valid test data.
 * Each factory returns a minimal valid insert object with sensible defaults.
 * Pass `overrides` to customise specific fields.
 */

import type { PermissionKey } from '@ferrite/schema/common/permissions.zodschema';
import { v4 as uuidv4 } from 'uuid';
import type {
	NewCategory,
	NewProductCategory,
} from '../schema/category.schema';
import type { NewCurrency, NewExchangeRate } from '../schema/currency.schema';
import type {
	NewInventoryAdjustment,
	NewInventoryItem,
	NewInventoryLevel,
	NewWarehouse,
} from '../schema/inventory.schema';
import type { NewUserPaymentMethod } from '../schema/payment.schema';
import type { NewUserNotificationPreference } from '../schema/preferences.schema';
import type {
	NewProduct,
	NewProductImage,
	NewProductVariant,
	NewSupplier,
	NewVariantImage,
	NewVariantLabel,
} from '../schema/product.schema';
import type { NewPromotion } from '../schema/promotion.schema';
import type {
	NewStore,
	NewStoreInvitation,
	NewStoreMember,
	NewStoreRole,
	NewStoreRolePermission,
} from '../schema/store.schema';
import type { NewStorefrontUserTable } from '../schema/storefront-user.schema';
import type {
	NewUser,
	NewUserAddress,
	NewUserPhone,
} from '../schema/user.schema';

// ── Users ────────────────────────────────
let emailCounter = 0;

/**
 * Builds a NewUser object with a generated unique email and optional field overrides.
 *
 * @param overrides - Partial fields to merge into the generated user object; any provided fields replace the defaults.
 * @returns The created NewUser. The `email` defaults to a generated value like `test-<counter>-<timestamp>@example.com` unless `overrides.email` is provided. This function increments a module-scoped counter used to make generated emails unique.
 */
export function createTestUser(overrides: Partial<NewUser> = {}): NewUser {
	emailCounter += 1;
	return {
		id: uuidv4(),
		email: `test-${emailCounter}-${Date.now()}@example.com`,
		...overrides,
	};
}

// ── Phones ───────────────────────────────
let phoneCounter = 0;
/**
 * Builds a minimal NewUserPhone object for tests with a generated phone number and sensible defaults.
 *
 * The `overrides` object is shallow-merged into the result to replace default fields. This function also
 * increments an internal phone counter to produce a unique phone number for each call.
 *
 * @param userId - The ID of the user to associate with the phone record
 * @param overrides - Partial fields to override the defaults on the generated NewUserPhone
 * @returns A NewUserPhone object containing `userId`, a generated `phone`, `countryCode`, and any overridden fields
 */
export function createTestPhone(
	userId: string,
	overrides: Partial<NewUserPhone> = {}
): NewUserPhone {
	phoneCounter = (phoneCounter + 1) % 10_000_000;
	return {
		userId,
		phone: `555${String(phoneCounter).padStart(7, '0')}`,
		countryCode: '+1',
		...overrides,
	};
}

// ── Addresses ────────────────────────────
export function createTestAddress(
	userId: string,
	overrides: Partial<NewUserAddress> = {}
): NewUserAddress {
	return {
		userId,
		firstName: 'Test',
		lastName: 'User',
		line1: '123 Test St',
		city: 'Testville',
		postalCode: '12345',
		country: 'US',
		...overrides,
	};
}

// ── Auth Providers ───────────────────────
export function createTestAuthProvider(
	userId: string,
	overrides: Record<string, unknown> = {}
) {
	return {
		userId,
		provider: 'clerk' as const,
		externalAuthId: `ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
		...overrides,
	};
}

// ── Payment Methods ──────────────────────
export function createTestPaymentMethod(
	userId: string,
	overrides: Partial<NewUserPaymentMethod> = {}
): NewUserPaymentMethod {
	return {
		userId,
		provider: 'stripe',
		providerPaymentMethodId: `pm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
		cardLast4: '4242',
		cardBrand: 'visa',
		...overrides,
	};
}

// ── Notification Preferences ─────────────
export function createTestNotificationPreference(
	userId: string,
	overrides: Partial<NewUserNotificationPreference> = {}
): NewUserNotificationPreference {
	return {
		userId,
		channel: 'email',
		type: 'promotions',
		isEnabled: true,
		...overrides,
	};
}

// ── Stores ───────────────────────────────
let storeCounter = 0;

export function createTestStore(
	createdBy: string,
	overrides: Partial<NewStore> = {}
): NewStore {
	storeCounter += 1;
	return {
		name: `Test Store ${storeCounter} - ${Date.now()}`,
		slug: `test-store-${storeCounter}-${Date.now()}`,
		currencyCode: 'USD',
		createdBy,
		...overrides,
	} as NewStore;
}

// ── Store Members ────────────────────────
export function createTestStoreMember(
	storeId: string,
	userId: string,
	roleId: string,
	overrides: Partial<NewStoreMember> = {}
): NewStoreMember {
	return {
		storeId,
		userId,
		roleId,
		isOwner: false,
		...overrides,
	};
}

// ── Store Roles ──────────────────────────
let storeRoleCounter = 0;

export function createTestStoreRole(
	storeId: string,
	overrides: Partial<NewStoreRole> = {}
): NewStoreRole {
	storeRoleCounter += 1;
	return {
		storeId,
		name: `Store Role ${storeRoleCounter} - ${Date.now()}`,
		...overrides,
	};
}

// ── Store Role Permissions ───────────────
export function createTestStoreRolePermission(
	storeRoleId: string,
	permissionKey: PermissionKey,
	overrides: Partial<NewStoreRolePermission> = {}
): NewStoreRolePermission {
	return {
		storeRoleId,
		permissionKey,
		...overrides,
	};
}

// ── Store Invitations ────────────────────
export function createTestStoreInvitation(
	storeId: string,
	roleId: string,
	invitedBy: string,
	overrides: Partial<NewStoreInvitation> = {}
): NewStoreInvitation {
	return {
		storeId,
		roleId,
		invitedBy,
		email: `invite-${Date.now()}@example.com`,
		token: `token-${uuidv4()}`,
		expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days from now
		...overrides,
	};
}

// ── Currencies ───────────────────────────
/**
 * Builds a NewCurrency object. Defaults to USD with 2 decimal places.
 * Pass `overrides` to test other currencies (e.g. JPY with 0 precision).
 */
export function createTestCurrency(
	overrides: Partial<NewCurrency> = {}
): NewCurrency {
	return {
		code: 'USD',
		symbol: '$',
		decimalPrecision: 2,
		isActive: true,
		...overrides,
	};
}

// ── Exchange Rates ───────────────────────
/**
 * Builds a NewExchangeRate between two currency codes.
 *
 * @param fromCode - ISO 4217 source currency code (must already exist in `currencies`)
 * @param toCode   - ISO 4217 target currency code (must already exist in `currencies`)
 * @param rate     - Decimal string for the exchange rate (default: '0.920000000')
 */
export function createTestExchangeRate(
	fromCode: string,
	toCode: string,
	rate = '0.920000000'
): NewExchangeRate {
	return {
		fromCurrencyCode: fromCode,
		toCurrencyCode: toCode,
		rate,
	};
}

// ── Storefront Users ─────────────────────
export function createTestStorefrontUser(
	storeId: string,
	overrides: Partial<NewStorefrontUserTable> = {}
): NewStorefrontUserTable {
	emailCounter += 1;
	return {
		id: uuidv4(),
		storeId,
		email: `storefront-test-${emailCounter}-${Date.now()}@example.com`,
		...overrides,
	};
}

// ── Suppliers ────────────────────────────
let supplierCounter = 0;

export function createTestSupplier(
	storeId: string,
	overrides: Partial<NewSupplier> = {}
): NewSupplier {
	supplierCounter += 1;
	return {
		storeId,
		name: `Test Supplier ${supplierCounter} - ${Date.now()}`,
		...overrides,
	};
}

// ── Products ─────────────────────────────
let productCounter = 0;

export function createTestProduct(
	storeId: string,
	overrides: Partial<NewProduct> = {}
): NewProduct {
	productCounter += 1;
	return {
		storeId,
		name: `Test Product ${productCounter} - ${Date.now()}`,
		slug: `test-product-${productCounter}-${Date.now()}`,
		...overrides,
	};
}

// ── Product Images ───────────────────────
export function createTestProductImage(
	productId: string,
	overrides: Partial<NewProductImage> = {}
): NewProductImage {
	return {
		productId,
		url: `https://example.com/images/product-${Date.now()}.jpg`,
		...overrides,
	};
}

// ── Product Variants ─────────────────────
let variantCounter = 0;

export function createTestProductVariant(
	productId: string,
	overrides: Partial<NewProductVariant> = {}
): NewProductVariant {
	variantCounter += 1;
	return {
		productId,
		sku: `TEST-SKU-${variantCounter}-${Date.now()}`,
		price: '19.9900',
		...overrides,
	};
}

// ── Variant Labels ───────────────────────
export function createTestVariantLabel(
	variantId: string,
	overrides: Partial<NewVariantLabel> = {}
): NewVariantLabel {
	return {
		variantId,
		labelName: 'Color',
		labelValue: 'Red',
		...overrides,
	};
}

// ── Variant Images ───────────────────────
export function createTestVariantImage(
	variantId: string,
	overrides: Partial<NewVariantImage> = {}
): NewVariantImage {
	return {
		variantId,
		url: `https://example.com/images/variant-${Date.now()}.jpg`,
		...overrides,
	};
}

// ── Categories ───────────────────────────
let categoryCounter = 0;

export function createTestCategory(
	storeId: string,
	overrides: Partial<NewCategory> = {}
): NewCategory {
	categoryCounter += 1;
	return {
		storeId,
		name: `Test Category ${categoryCounter} - ${Date.now()}`,
		slug: `test-category-${categoryCounter}-${Date.now()}`,
		...overrides,
	};
}

// ── Product Categories ───────────────────
export function createTestProductCategory(
	productId: string,
	categoryId: string,
	overrides: Partial<NewProductCategory> = {}
): NewProductCategory {
	return {
		productId,
		categoryId,
		...overrides,
	};
}

// ── Warehouses ───────────────────────────
let warehouseCounter = 0;

export function createTestWarehouse(
	storeId: string,
	overrides: Partial<NewWarehouse> = {}
): NewWarehouse {
	warehouseCounter += 1;
	return {
		storeId,
		name: `Test Warehouse ${warehouseCounter} - ${Date.now()}`,
		...overrides,
	};
}

// ── Inventory Items ──────────────────────
let inventoryItemCounter = 0;

export function createTestInventoryItem(
	variantId: string,
	warehouseId: string,
	overrides: Partial<NewInventoryItem> = {}
): NewInventoryItem {
	inventoryItemCounter += 1;
	return {
		variantId,
		warehouseId,
		batchNumber: `BATCH-${inventoryItemCounter}-${Date.now()}`,
		...overrides,
	};
}

// ── Inventory Levels ─────────────────────
export function createTestInventoryLevel(
	inventoryItemId: string,
	overrides: Partial<NewInventoryLevel> = {}
): NewInventoryLevel {
	return {
		inventoryItemId,
		quantityOnHand: 100,
		quantityReserved: 0,
		...overrides,
	};
}

// ── Inventory Adjustments ────────────────
export function createTestInventoryAdjustment(
	inventoryItemId: string,
	overrides: Partial<NewInventoryAdjustment> = {}
): NewInventoryAdjustment {
	return {
		inventoryItemId,
		adjustmentType: 'restock',
		quantityChange: 50,
		...overrides,
	};
}

// ── Promotions ───────────────────────────
let promotionCounter = 0;

/**
 * Builds a NewPromotion with type-appropriate sparse defaults.
 * Pass `promotionType` to set the discriminator and get sensible defaults
 * for the sparse columns of that type.
 */
export function createTestPromotion(
	storeId: string,
	promotionType: NewPromotion['promotionType'] = 'percentage_discount',
	overrides: Partial<NewPromotion> = {}
): NewPromotion {
	promotionCounter += 1;

	const base: NewPromotion = {
		storeId,
		promotionType,
		name: `Test Promotion ${promotionCounter} - ${Date.now()}`,
		validFrom: new Date(),
		...overrides,
	};

	// Set sensible sparse defaults per type (unless overridden)
	switch (promotionType) {
		case 'percentage_discount':
			return { discountPercentage: 10, ...base };
		case 'fixed_discount':
			return { discountAmount: '5.0000', ...base };
		case 'buy_x_get_y':
			return { buyQuantity: 2, getQuantity: 1, ...base };
		case 'free_shipping':
			return { minimumCartValue: '25.0000', ...base };
		case 'bundle_deal':
			return { bundlePrice: '49.9900', ...base };
		default:
			return base;
	}
}
