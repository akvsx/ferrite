DROP INDEX "idx_storefront_users_created_at";--> statement-breakpoint
CREATE INDEX "idx_categories_store_created_at" ON "categories" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_storefront_users_store_created_at" ON "storefront_users" USING btree ("store_id","created_at");