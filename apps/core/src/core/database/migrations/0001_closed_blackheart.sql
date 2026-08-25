DROP INDEX "idx_products_active";--> statement-breakpoint
CREATE INDEX "idx_products_active" ON "products" USING btree ("store_id","created_at") WHERE status = 'active' AND deleted_at IS NULL;--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "is_active";