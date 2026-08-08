import { relations } from 'drizzle-orm';
import { userAuthProviders } from './auth.schema';
import { categories, productCategories } from './category.schema';
import { currencies, exchangeRates } from './currency.schema';
import {
	inventoryAdjustments,
	inventoryItems,
	inventoryLevels,
	warehouses,
} from './inventory.schema';
import { userOnboarding } from './onboarding.schema';
import { userPaymentMethods } from './payment.schema';
import { userNotificationPreferences } from './preferences.schema';
import {
	productImages,
	products,
	productVariants,
	suppliers,
	variantImages,
	variantLabels,
} from './product.schema';
import { promotions } from './promotion.schema';
import {
	storeInvitations,
	storeMembers,
	storeRolePermissions,
	storeRoles,
	stores,
} from './store.schema';
import { storefrontUsers } from './storefront-user.schema';
import { userAddresses, userPhones, users } from './user.schema';

// ─────────────────────────────────────────
// USER RELATIONS
// ─────────────────────────────────────────

export const usersRelations = relations(users, ({ one, many }) => ({
	onboarding: one(userOnboarding),
	authProviders: many(userAuthProviders),
	phones: many(userPhones),
	addresses: many(userAddresses),
	notificationPreferences: many(userNotificationPreferences),
	paymentMethods: many(userPaymentMethods),
	createdStores: many(stores),
	storeMemberships: many(storeMembers),
	sentStoreInvitations: many(storeInvitations, { relationName: 'invitedBy' }),
	inventoryAdjustments: many(inventoryAdjustments),
}));

export const userOnboardingRelations = relations(userOnboarding, ({ one }) => ({
	user: one(users, {
		fields: [userOnboarding.userId],
		references: [users.id],
	}),
}));

export const userPhonesRelations = relations(userPhones, ({ one }) => ({
	user: one(users, {
		fields: [userPhones.userId],
		references: [users.id],
	}),
}));

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
	user: one(users, { fields: [userAddresses.userId], references: [users.id] }),
}));

export const userAuthProvidersRelations = relations(
	userAuthProviders,
	({ one }) => ({
		user: one(users, {
			fields: [userAuthProviders.userId],
			references: [users.id],
		}),
	})
);

export const userPaymentMethodsRelations = relations(
	userPaymentMethods,
	({ one }) => ({
		user: one(users, {
			fields: [userPaymentMethods.userId],
			references: [users.id],
		}),
	})
);

export const userNotificationPreferencesRelations = relations(
	userNotificationPreferences,
	({ one }) => ({
		user: one(users, {
			fields: [userNotificationPreferences.userId],
			references: [users.id],
		}),
	})
);

// ─────────────────────────────────────────
// STORE RELATIONS
// ─────────────────────────────────────────

export const storesRelations = relations(stores, ({ one, many }) => ({
	createdBy: one(users, {
		fields: [stores.createdBy],
		references: [users.id],
	}),
	members: many(storeMembers),
	roles: many(storeRoles),
	invitations: many(storeInvitations),
	storefrontUsers: many(storefrontUsers),
	products: many(products),
	suppliers: many(suppliers),
	categories: many(categories),
	warehouses: many(warehouses),
	promotions: many(promotions),
}));

export const storeRolesRelations = relations(storeRoles, ({ one, many }) => ({
	store: one(stores, {
		fields: [storeRoles.storeId],
		references: [stores.id],
	}),
	permissions: many(storeRolePermissions),
	members: many(storeMembers),
	invitations: many(storeInvitations),
}));

export const storeRolePermissionsRelations = relations(
	storeRolePermissions,
	({ one }) => ({
		storeRole: one(storeRoles, {
			fields: [storeRolePermissions.storeRoleId],
			references: [storeRoles.id],
		}),
	})
);

export const storeMembersRelations = relations(storeMembers, ({ one }) => ({
	store: one(stores, {
		fields: [storeMembers.storeId],
		references: [stores.id],
	}),
	user: one(users, {
		fields: [storeMembers.userId],
		references: [users.id],
	}),
	role: one(storeRoles, {
		fields: [storeMembers.roleId],
		references: [storeRoles.id],
	}),
}));

export const storeInvitationsRelations = relations(
	storeInvitations,
	({ one }) => ({
		store: one(stores, {
			fields: [storeInvitations.storeId],
			references: [stores.id],
		}),
		role: one(storeRoles, {
			fields: [storeInvitations.roleId],
			references: [storeRoles.id],
		}),
		invitedBy: one(users, {
			fields: [storeInvitations.invitedBy],
			references: [users.id],
		}),
	})
);

export const storefrontUsersRelations = relations(
	storefrontUsers,
	({ one }) => ({
		store: one(stores, {
			fields: [storefrontUsers.storeId],
			references: [stores.id],
		}),
	})
);

// ─────────────────────────────────────────
// CURRENCY RELATIONS
// ─────────────────────────────────────────

export const currenciesRelations = relations(currencies, ({ many }) => ({
	ratesFrom: many(exchangeRates, { relationName: 'ratesFrom' }),
	ratesTo: many(exchangeRates, { relationName: 'ratesTo' }),
}));

export const exchangeRatesRelations = relations(exchangeRates, ({ one }) => ({
	fromCurrency: one(currencies, {
		fields: [exchangeRates.fromCurrencyCode],
		references: [currencies.code],
		relationName: 'ratesFrom',
	}),
	toCurrency: one(currencies, {
		fields: [exchangeRates.toCurrencyCode],
		references: [currencies.code],
		relationName: 'ratesTo',
	}),
}));

// ─────────────────────────────────────────
// SUPPLIER RELATIONS
// ─────────────────────────────────────────

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
	store: one(stores, {
		fields: [suppliers.storeId],
		references: [stores.id],
	}),
	products: many(products),
}));

// ─────────────────────────────────────────
// PRODUCT RELATIONS
// ─────────────────────────────────────────

export const productsRelations = relations(products, ({ one, many }) => ({
	store: one(stores, {
		fields: [products.storeId],
		references: [stores.id],
	}),
	supplier: one(suppliers, {
		fields: [products.supplierId],
		references: [suppliers.id],
	}),
	images: many(productImages),
	variants: many(productVariants),
	categories: many(productCategories),
}));

export const productImagesRelations = relations(productImages, ({ one }) => ({
	product: one(products, {
		fields: [productImages.productId],
		references: [products.id],
	}),
}));

export const productVariantsRelations = relations(
	productVariants,
	({ one, many }) => ({
		product: one(products, {
			fields: [productVariants.productId],
			references: [products.id],
		}),
		labels: many(variantLabels),
		images: many(variantImages),
		inventoryItems: many(inventoryItems),
		targetedPromotions: many(promotions),
	})
);

export const variantLabelsRelations = relations(variantLabels, ({ one }) => ({
	variant: one(productVariants, {
		fields: [variantLabels.variantId],
		references: [productVariants.id],
	}),
}));

export const variantImagesRelations = relations(variantImages, ({ one }) => ({
	variant: one(productVariants, {
		fields: [variantImages.variantId],
		references: [productVariants.id],
	}),
}));

// ─────────────────────────────────────────
// CATEGORY RELATIONS
// ─────────────────────────────────────────

export const categoriesRelations = relations(categories, ({ one, many }) => ({
	store: one(stores, {
		fields: [categories.storeId],
		references: [stores.id],
	}),
	parent: one(categories, {
		fields: [categories.parentId],
		references: [categories.id],
		relationName: 'categoryParent',
	}),
	children: many(categories, { relationName: 'categoryParent' }),
	products: many(productCategories),
	targetedPromotions: many(promotions),
}));

export const productCategoriesRelations = relations(
	productCategories,
	({ one }) => ({
		product: one(products, {
			fields: [productCategories.productId],
			references: [products.id],
		}),
		category: one(categories, {
			fields: [productCategories.categoryId],
			references: [categories.id],
		}),
	})
);

// ─────────────────────────────────────────
// WAREHOUSE RELATIONS
// ─────────────────────────────────────────

export const warehousesRelations = relations(warehouses, ({ one, many }) => ({
	store: one(stores, {
		fields: [warehouses.storeId],
		references: [stores.id],
	}),
	inventoryItems: many(inventoryItems),
}));

// ─────────────────────────────────────────
// INVENTORY RELATIONS
// ─────────────────────────────────────────

export const inventoryItemsRelations = relations(
	inventoryItems,
	({ one, many }) => ({
		variant: one(productVariants, {
			fields: [inventoryItems.variantId],
			references: [productVariants.id],
		}),
		warehouse: one(warehouses, {
			fields: [inventoryItems.warehouseId],
			references: [warehouses.id],
		}),
		level: one(inventoryLevels),
		adjustments: many(inventoryAdjustments),
	})
);

export const inventoryLevelsRelations = relations(
	inventoryLevels,
	({ one }) => ({
		inventoryItem: one(inventoryItems, {
			fields: [inventoryLevels.inventoryItemId],
			references: [inventoryItems.id],
		}),
	})
);

export const inventoryAdjustmentsRelations = relations(
	inventoryAdjustments,
	({ one }) => ({
		inventoryItem: one(inventoryItems, {
			fields: [inventoryAdjustments.inventoryItemId],
			references: [inventoryItems.id],
		}),
		adjustedBy: one(users, {
			fields: [inventoryAdjustments.adjustedBy],
			references: [users.id],
		}),
	})
);

// ─────────────────────────────────────────
// PROMOTION RELATIONS
// ─────────────────────────────────────────

export const promotionsRelations = relations(promotions, ({ one }) => ({
	store: one(stores, {
		fields: [promotions.storeId],
		references: [stores.id],
	}),
	targetSku: one(productVariants, {
		fields: [promotions.targetSkuId],
		references: [productVariants.id],
	}),
	targetCategory: one(categories, {
		fields: [promotions.targetCategoryId],
		references: [categories.id],
	}),
}));
