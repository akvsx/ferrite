ALTER TABLE "inventory_adjustments" ALTER COLUMN "adjustment_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."inventory_adjustment_type";--> statement-breakpoint
CREATE TYPE "public"."inventory_adjustment_type" AS ENUM('restock', 'sale', 'return', 'correction', 'damage', 'transfer');--> statement-breakpoint
ALTER TABLE "inventory_adjustments" ALTER COLUMN "adjustment_type" SET DATA TYPE "public"."inventory_adjustment_type" USING "adjustment_type"::"public"."inventory_adjustment_type";