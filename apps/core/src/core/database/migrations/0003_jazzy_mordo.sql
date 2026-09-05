ALTER TYPE "public"."permission_key" ADD VALUE 'warehouses.read' BEFORE 'orders.read';--> statement-breakpoint
ALTER TYPE "public"."permission_key" ADD VALUE 'warehouses.create' BEFORE 'orders.read';--> statement-breakpoint
ALTER TYPE "public"."permission_key" ADD VALUE 'warehouses.update' BEFORE 'orders.read';--> statement-breakpoint
ALTER TYPE "public"."permission_key" ADD VALUE 'warehouses.delete' BEFORE 'orders.read';