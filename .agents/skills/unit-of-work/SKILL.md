---
name: unit-of-work
description: Guidance for implementing and using the Unit of Work pattern for database transactions.
---

# Unit of Work (UOW) Pattern

The Unit of Work pattern ensures that multiple repository or service operations execute atomically within a single database transaction. If any operation fails, the entire transaction rolls back.

## How It Works

1. **Application Layer (Use Cases):** Injects `IUnitOfWork` (via `UNIT_OF_WORK` token). Calls `uow.execute(async (tx) => { ... })`.
2. **Domain Layer (Ports):** Repository and service interfaces define an optional `tx?: ITransactionContext` parameter on methods that might participate in a transaction.
3. **Infrastructure Layer (Repositories):** Accepts `tx`. If `tx` is provided, unwraps the real database transaction using `DrizzleUnitOfWork.unwrap(tx)` and executes the query. If `tx` is absent, wraps the operation in a new transaction or executes it directly on the pool.

## When to Use

- When a use case modifies multiple aggregates or entities.
- When you need to read uncommitted data created earlier in the same workflow.
- When combining database writes with outbox pattern inserts (e.g., enqueuing an email job alongside a user creation).

## Where to Use

- **Use Cases:** Coordinate the transaction. Never use Drizzle-specific imports here. Only use `ITransactionContext`.
- **Ports:** Add `tx?: ITransactionContext` to interfaces.
- **Repositories:** Implement the logic to handle both `tx` present and `tx` absent.

## Example

### 1. The Use Case
```typescript
import { type IUnitOfWork, UNIT_OF_WORK } from '@common/interfaces/unit-of-work.interface';

@Injectable()
export class CreateOrderUseCase {
	constructor(
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork,
		@Inject(ORDER_REPO) private readonly orderRepo: IOrderRepository,
		@Inject(INVENTORY_REPO) private readonly inventoryRepo: IInventoryRepository
	) {}

	async execute(input: CreateOrderInput) {
		return this.uow.execute(async (tx) => {
			// Both operations share the same transaction (tx)
			const order = await this.orderRepo.create(input.orderData, tx);
			await this.inventoryRepo.decrement(input.items, tx);
			return order;
		});
	}
}
```

### 2. The Port
```typescript
import type { ITransactionContext } from '@common/interfaces/unit-of-work.interface';

export interface IOrderRepository {
	create(data: OrderData, tx?: ITransactionContext): Promise<Order>;
}
```

### 3. The Repository
```typescript
import { type ITransactionContext, type IUnitOfWork, UNIT_OF_WORK } from '@common/interfaces/unit-of-work.interface';
import { DrizzleUnitOfWork } from '@core/database/drizzle-unit-of-work';

@Injectable()
export class DrizzleOrderRepository implements IOrderRepository {
	constructor(
		@Inject(DB) private readonly db: TDatabase,
		@Inject(UNIT_OF_WORK) private readonly uow: IUnitOfWork
	) {}

	async create(data: OrderData, tx?: ITransactionContext): Promise<Order> {
		if (tx) {
			return this.runCreate(tx, data);
		}
		// Fallback to standalone transaction if no tx provided
		return this.uow.execute((ctx) => this.runCreate(ctx, data));
	}

	private async runCreate(ctx: ITransactionContext, data: OrderData): Promise<Order> {
		const executor = DrizzleUnitOfWork.unwrap(ctx);
		const [inserted] = await executor.insert(orders).values(data).returning();
		return inserted;
	}
}
```
