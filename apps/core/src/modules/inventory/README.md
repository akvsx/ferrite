# Inventory Module

The Inventory Module is responsible for managing the stock levels (inventory items) for product variants across different warehouses.

## Domain Boundaries

- **Core Responsibility**: Managing stock quantities, tracking stock adjustments, checking availability, and handling stock transfers between locations.
- **Decoupled from Products**: The inventory module is heavily decoupled from the `Products` module. Inventory records for product variants are synchronized asynchronously via background workers listening to product creation and update events. The `Products` module accesses inventory aggregations via an internal Port (`IInventoryService`) adapter.
- **External Dependencies**: This module inherently depends on the `Warehouse` module (for physical locations where stock resides) and references variants from the `Products` module.

## Architecture & Layers

This module strictly follows the Hexagonal Architecture (Ports and Adapters) pattern as defined in the Ferrite core application rules.

### Domain Layer (`src/modules/inventory/domain/`)
- **Ports**: Defines contracts for external systems, such as `IInventoryItemRepository`.
- **Errors**: Defines business logic errors like `InsufficientStockError`, `InvalidAdjustmentError`, and `InventoryItemNotFoundError`.
- **Helpers**: Pure functions like `adjustment-sign.helper.ts` which determine the mathematical delta for different ledger events.

## Workflows & Concepts

### 1. The Inventory Ledger
Stock levels are not just updated in place; they are logged immutably in the `inventory_adjustments` table. This acts as an audit trail for all changes in stock levels.

- **Manual Adjustments (`restock`, `return`, `damage`, `correction`)**: Can be performed via the Admin API. The Use Case layer automatically resolves the sign (e.g., `damage` always subtracts, `restock` always adds).
- **Internal Adjustments (`sale`, `transfer`)**: Restricted from the manual Admin API. These are driven internally by the system (e.g., when the `Orders` module completes an order or the `TransferStock` Use Case moves items between warehouses).

### 2. Low-Stock Alerts (Asynchronous)
When an adjustment pushes a variant's `quantityOnHand` at or below its `lowStockThreshold`, a background event (`inventory.low-stock`) is transactionally published to the queue via the `Unit of Work`. The `LowStockAlertProcessor` consumes this event in the background, decoupling email/notification systems from the core web request.

### 3. Concurrency and Consistency
Managing inventory stock is a highly concurrent operation. To ensure consistency without significant locking overhead, the `adjustStock` operation relies on **atomic SQL updates** combined with Unit of Work transactions.

```sql
UPDATE inventory_levels 
SET quantity_on_hand = quantity_on_hand + :change 
WHERE inventory_item_id = :id AND (quantity_on_hand + :change) >= 0;
```

This prevents negative inventory races at the database level. Simultaneously, the `inventory_adjustments` ledger is inserted in the exact same transaction.

For bulk syncing of variant inventories via queues, the module relies on `ON CONFLICT DO NOTHING` statements to guarantee idempotent inserts over unique constraints (`variantId`, `warehouseId`).

### 4. Reservation System (Pending)
The `IInventoryItemRepository` exposes stubs for `reserveStock`, `releaseReservation`, and `consumeReservation`. These form the foundation of a two-phase commit system (Hold & Deduct) that the upcoming `Orders` module will utilize to safely lock inventory during the checkout flow before finalizing the transaction.
